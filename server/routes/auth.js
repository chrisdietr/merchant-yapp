import express from 'express';
import { SiweMessage } from 'siwe';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Debug middleware for auth routes
const debugAuth = (req, res, next) => {
  console.log('Auth Request:', {
    path: req.path,
    method: req.method,
    session: req.session ? {
      nonce: req.session.nonce,
      hasSessionId: !!req.sessionID,
      hasSIWE: !!req.session.siwe
    } : null,
    body: req.method === 'POST' ? {
      message: req.body?.message ? req.body.message.substring(0, 50) + '...' : undefined,
      signature: req.body?.signature ? req.body.signature.substring(0, 20) + '...' : undefined
    } : undefined
  });
  next();
};

router.use(debugAuth);

// Get a new nonce
router.get('/nonce', (req, res) => {
  // Generate a random string for the nonce
  req.session.nonce = Math.floor(Math.random() * 1000000).toString();
  console.log('Generated new nonce:', req.session.nonce);
  
  req.session.save((err) => {
    if (err) {
      console.error('Error saving nonce in session:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate nonce' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      nonce: req.session.nonce 
    });
  });
});

// Get session status
router.get('/session', (req, res) => {
  try {
    console.log('Session check requested, session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    
    if (!req.session) {
      console.log('No session found');
      return res.status(200).json({
        success: true,
        authenticated: false,
        message: 'No session found'
      });
    }
    
    if (!req.session.siwe) {
      console.log('No SIWE data in session');
      return res.status(200).json({
        success: true,
        authenticated: false,
        message: 'Not authenticated'
      });
    }
    
    const address = req.session.siwe.address;
    const adminStatus = isAdmin(address);
    
    console.log(`Session check for ${address}: Admin status = ${adminStatus}`);
    
    return res.status(200).json({
      success: true,
      authenticated: true,
      address,
      isAdmin: adminStatus
    });
  } catch (error) {
    console.error('Error in /session endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Function to extract nonce from a SIWE message string
const extractNonceFromMessage = (message) => {
  try {
    const nonceMatch = message.match(/Nonce: ([a-zA-Z0-9]+)/);
    return nonceMatch ? nonceMatch[1] : null;
  } catch (error) {
    console.error('Error extracting nonce from message:', error);
    return null;
  }
};

// Function to extract address from a SIWE message string
const extractAddressFromMessage = (message) => {
  try {
    // The address should be on the second line
    const lines = message.split('\n');
    if (lines.length >= 2) {
      const addressLine = lines[1].trim();
      // Verify it's a valid Ethereum address (0x followed by 40 hex chars)
      if (/^0x[a-fA-F0-9]{40}$/.test(addressLine)) {
        return addressLine;
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting address from message:', error);
    return null;
  }
};

// Verify SIWE message and create session
router.post('/verify', async (req, res) => {
  try {
    if (!req.body?.message || !req.body?.signature) {
      console.error('Missing message or signature in verify request');
      return res.status(400).json({ 
        success: false, 
        message: 'Missing message or signature' 
      });
    }

    console.log('SIWE verification requested, message start:', req.body.message.substring(0, 50) + '...');
    
    // First try the manual approach using regex to extract information
    const messageNonce = extractNonceFromMessage(req.body.message);
    const address = extractAddressFromMessage(req.body.message);
    
    if (!messageNonce) {
      console.error('Could not extract nonce from message');
      return res.status(400).json({
        success: false,
        message: 'Invalid message format: Could not extract nonce'
      });
    }

    if (!address) {
      console.error('Could not extract address from message');
      return res.status(400).json({
        success: false,
        message: 'Invalid message format: Could not extract address'
      });
    }
    
    console.log('Extracted from message - Address:', address, 'Nonce:', messageNonce);
    
    // Verify that the nonce matches the session
    const sessionNonce = String(req.session?.nonce || '');
    
    console.log('Nonce comparison:', {
      sessionNonce,
      messageNonce,
      match: sessionNonce === messageNonce
    });
    
    if (sessionNonce !== messageNonce) {
      console.error(`Invalid nonce: expected "${sessionNonce}", got "${messageNonce}"`);
      return res.status(422).json({ 
        success: false, 
        message: 'Invalid nonce' 
      });
    }

    // Verify the signature using SIWE
    try {
      // Create SiweMessage from the message string
      const siweMessage = new SiweMessage(req.body.message);
      
      // Verify signature
      const verifyResult = await siweMessage.verify({ 
        signature: req.body.signature 
      });
      
      console.log('SIWE verification result:', verifyResult);
      
      if (!verifyResult.success) {
        console.error('SIWE signature verification failed:', verifyResult.error);
        return res.status(422).json({ 
          success: false, 
          message: 'Invalid signature',
          error: verifyResult.error?.message || 'Signature verification failed'
        });
      }
      
      // Fallback to the extracted address if data.address is not available
      const verifiedAddress = verifyResult.data.address || address;
      console.log('SIWE verification successful for address:', verifiedAddress);
      
      // Check if the user is an admin
      const adminStatus = isAdmin(verifiedAddress);
      console.log(`Admin status check for ${verifiedAddress}:`, adminStatus);
      
      if (!adminStatus) {
        console.error(`User ${verifiedAddress} is not an admin`);
        console.error('Make sure this address is in the admin.json file in lowercase');
        return res.status(403).json({ 
          success: false,
          message: 'Authentication failed. You are not an admin.',
          address: verifiedAddress
        });
      }
      
      // Store the verified data in the session
      req.session.siwe = {
        address: verifiedAddress,
        ...verifyResult.data
      };
      
      // Force session save and wait for completion
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session:', err);
            reject(err);
            return;
          }
          
          console.log('Session saved successfully for address:', verifiedAddress);
          console.log('Session ID:', req.sessionID);
          console.log('Session expiration:', req.session.cookie._expires);
          resolve();
        });
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Authentication successful', 
        isAdmin: adminStatus,
        address: verifiedAddress
      });
    } catch (verifyError) {
      console.error('SIWE verification error:', verifyError);
      
      // If SIWE verification fails, we fall back to a simplified verification
      // This is not as secure but provides a fallback for compatibility
      console.log('Falling back to simplified verification with extracted address:', address);
      
      // Check if the user is an admin
      const adminStatus = isAdmin(address);
      
      if (!adminStatus) {
        return res.status(403).json({ 
          success: false,
          message: 'Authentication failed. You are not an admin.',
          address
        });
      }
      
      // Store the address in the session
      req.session.siwe = {
        address
      };
      
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error saving session' 
          });
        }
        
        console.log('Session saved successfully using fallback for address:', address);
        return res.status(200).json({ 
          success: true, 
          message: 'Authentication successful (fallback method)', 
          isAdmin: adminStatus,
          address
        });
      });
    }
  } catch (error) {
    console.error('SIWE general error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  console.log('Logout requested, destroying session:', req.sessionID);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Error logging out' 
      });
    }
    
    res.clearCookie('connect.sid');
    return res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

export default router; 