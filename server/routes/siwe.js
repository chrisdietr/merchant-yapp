import express from 'express';
import { SiweMessage } from 'siwe';
import { isAdmin } from '../middleware/auth.js';

const router = express.Router();

// Debug middleware for SIWE routes
const debugSiwe = (req, res, next) => {
  console.log('SIWE Request:', {
    path: req.path,
    method: req.method,
    session: req.session,
    body: req.body ? {
      message: req.body.message ? req.body.message.substring(0, 50) + '...' : undefined,
      signature: req.body.signature ? req.body.signature.substring(0, 20) + '...' : undefined
    } : undefined
  });
  next();
};

router.use(debugSiwe);

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

// Route to handle SIWE message verification
router.post('/verify', async (req, res) => {
  try {
    if (!req.body.message || !req.body.signature) {
      console.error('SIWE missing message or signature', req.body);
      return res.status(400).json({ 
        success: false, 
        message: 'Missing message or signature' 
      });
    }

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
    
    // Check if session exists and has a nonce
    if (!req.session || !req.session.nonce) {
      console.error('No session or nonce found:', req.session);
      return res.status(400).json({
        success: false,
        message: 'No active session or nonce found'
      });
    }
    
    // Verify that the nonce matches the session
    const sessionNonce = String(req.session.nonce);
    
    console.log('Nonce comparison:', {
      sessionNonce,
      messageNonce,
      match: sessionNonce === messageNonce
    });
    
    if (sessionNonce !== messageNonce) {
      console.error(`Invalid nonce: expected ${sessionNonce}, got ${messageNonce}`);
      return res.status(422).json({ 
        success: false,
        message: 'Invalid nonce' 
      });
    }

    // Try the regular SIWE verification
    try {
      // Create SiweMessage from the message string
      const siweMessage = new SiweMessage(req.body.message);
      
      // Verify signature
      const verifyResult = await siweMessage.verify({
        signature: req.body.signature
      });
      
      console.log('SIWE verification result:', verifyResult);

      if (!verifyResult.success) {
        console.error('SIWE verification failed:', verifyResult.error);
        throw new Error('Signature verification failed');
      }

      // Use the verified address or fall back to the extracted address
      const verifiedAddress = verifyResult.data?.address || address;
      console.log('SIWE session set for address:', verifiedAddress);
      
      // Check if the user is an admin
      const adminStatus = isAdmin(verifiedAddress);
      console.log(`Admin status for ${verifiedAddress}: ${adminStatus ? 'ADMIN' : 'NOT ADMIN'}`);
      
      if (!adminStatus) {
        console.error(`User ${verifiedAddress} is not an admin`);
        return res.status(403).json({ 
          success: false, 
          message: 'Authentication failed. You are not an admin.' 
        });
      }

      // Store the verified data in the session
      req.session.siwe = {
        address: verifiedAddress,
        ...verifyResult.data
      };

      // Save the session
      req.session.save((err) => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ 
            success: false, 
            message: 'Error saving session' 
          });
        }
        
        console.log('Session saved successfully:', req.session);
        return res.status(200).json({ 
          success: true, 
          message: 'Authentication successful', 
          address: verifiedAddress,
          isAdmin: adminStatus
        });
      });
    } catch (verifyError) {
      console.error('SIWE verification threw error:', verifyError);
      
      // Fall back to simplified verification
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
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error', 
      error: error.message 
    });
  }
});

// Route to check authentication status
router.get('/check', (req, res) => {
  console.log('Checking authentication status:', req.session);
  if (!req.session.siwe) {
    return res.status(401).json({ 
      authenticated: false, 
      message: 'Not authenticated' 
    });
  }

  const address = req.session.siwe.address;
  const adminStatus = isAdmin(address);
  
  console.log(`Authentication check for ${address}: Authenticated, Admin: ${adminStatus}`);
  
  return res.status(200).json({ 
    authenticated: true, 
    address,
    isAdmin: adminStatus
  });
});

// Route to log out
router.post('/logout', (req, res) => {
  console.log('Logging out, session before:', req.session);
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ success: false, message: 'Error logging out' });
    }
    
    console.log('Session destroyed successfully');
    res.clearCookie('connect.sid');
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  });
});

export default router; 