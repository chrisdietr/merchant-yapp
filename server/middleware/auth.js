import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to read admin config file
const getAdminConfig = () => {
  try {
    const configPath = path.join(__dirname, '../../src/config/admin.json');
    console.log('Reading admin config from:', configPath);
    
    // Check if file exists
    if (!fs.existsSync(configPath)) {
      console.error('Admin config file does not exist at path:', configPath);
      return { admins: [] };
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    console.log('Raw admin config data:', configData);
    
    try {
      const config = JSON.parse(configData);
      console.log('Parsed admin config:', config);
      
      if (!config.admins || !Array.isArray(config.admins)) {
        console.error('Invalid admin config format. Expected an array of addresses in "admins" property');
        return { admins: [] };
      }
      
      console.log('Admin addresses in config:', config.admins);
      return config;
    } catch (parseError) {
      console.error('Error parsing admin config JSON:', parseError);
      return { admins: [] };
    }
  } catch (error) {
    console.error('Error reading admin config:', error);
    return { admins: [] };
  }
};

// Check if an address is an admin
const isAdmin = (address) => {
  if (!address) {
    console.error('isAdmin called with null or undefined address');
    return false;
  }
  
  const config = getAdminConfig();
  
  // Convert address to lowercase for case-insensitive comparison
  const lowercaseAddress = address.toLowerCase();
  // Convert all admin addresses to lowercase for comparison
  const lowercaseAdmins = config.admins.map(addr => addr.toLowerCase());
  
  console.log('Checking if address is admin:', lowercaseAddress);
  console.log('Admin addresses (lowercase):', lowercaseAdmins);
  
  const isAdminUser = lowercaseAdmins.includes(lowercaseAddress);
  
  console.log(`Admin check result for ${address}: ${isAdminUser ? 'ADMIN' : 'NOT ADMIN'}`);
  return isAdminUser;
};

// Middleware to check if the user is authenticated
const authMiddleware = (req, res, next) => {
  // Check if user is authenticated via the session
  if (!req.session.siwe) {
    console.log('Authentication failed: No SIWE data in session');
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Add the authenticated address to the request for later use
  req.user = {
    address: req.session.siwe.address,
    isAdmin: isAdmin(req.session.siwe.address)
  };

  console.log(`User authenticated: ${req.user.address}, admin: ${req.user.isAdmin}`);
  next();
};

// Middleware to check if the user is an admin
const adminMiddleware = (req, res, next) => {
  // First check if user is authenticated
  if (!req.session.siwe) {
    console.log('Admin check failed: No SIWE data in session');
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Then check if user is an admin
  if (!isAdmin(req.session.siwe.address)) {
    console.log(`Admin access denied for: ${req.session.siwe.address}`);
    return res.status(403).json({ message: 'Not authorized' });
  }

  // Add the admin status to the request
  req.user = {
    address: req.session.siwe.address,
    isAdmin: true
  };

  console.log(`Admin access granted for: ${req.user.address}`);
  next();
};

// Middleware to check if the user owns a resource
const ownershipMiddleware = (req, res, next) => {
  // This will be specific to each route and implemented there
  next();
};

export {
  authMiddleware,
  adminMiddleware,
  ownershipMiddleware,
  isAdmin
}; 