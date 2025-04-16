import { SiweMessage } from 'siwe';

// Generate a random nonce for SIWE authentication
export const generateNonce = (): string => {
  // Return a larger, more random nonce
  return Math.floor(Math.random() * 1000000000).toString();
};

// Create a SIWE message for the given address
export const createSiweMessage = (
  address: string,
  statement: string,
  nonce: string
): string => {
  const domain = window.location.host;
  const origin = window.location.origin;
  
  // Create a proper SIWE message with all required fields
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: 1,
    nonce,
    // Add these extra fields to ensure proper message format
    issuedAt: new Date().toISOString(),
    resources: [origin]
  });
  
  return message.prepareMessage();
};

// Store the admin authentication state
const ADMIN_AUTH_KEY = 'merchant_yapp_admin_auth';
const ADMIN_AUTH_EXPIRY_KEY = 'merchant_yapp_admin_auth_expiry';

// Save admin authentication state
export const saveAdminAuth = (address: string, expiryHours = 24): void => {
  try {
    // Set expiry time (default 24 hours)
    const expiry = Date.now() + (expiryHours * 60 * 60 * 1000);
    localStorage.setItem(ADMIN_AUTH_KEY, address.toLowerCase());
    localStorage.setItem(ADMIN_AUTH_EXPIRY_KEY, expiry.toString());
  } catch (err) {
    console.error('Error saving admin auth:', err);
  }
};

// Check if admin is authenticated
export const isAdminAuthenticated = (address?: string): boolean => {
  try {
    if (!address) return false;
    
    const storedAddress = localStorage.getItem(ADMIN_AUTH_KEY);
    const expiryStr = localStorage.getItem(ADMIN_AUTH_EXPIRY_KEY);
    
    if (!storedAddress || !expiryStr) return false;
    
    // Check if authentication has expired
    const expiry = parseInt(expiryStr, 10);
    if (isNaN(expiry) || expiry < Date.now()) {
      // Clear expired auth
      localStorage.removeItem(ADMIN_AUTH_KEY);
      localStorage.removeItem(ADMIN_AUTH_EXPIRY_KEY);
      return false;
    }
    
    // Check if the stored address matches the current address
    return storedAddress.toLowerCase() === address.toLowerCase();
  } catch (err) {
    console.error('Error checking admin auth:', err);
    return false;
  }
};

// Clear admin authentication
export const clearAdminAuth = (): void => {
  try {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem(ADMIN_AUTH_EXPIRY_KEY);
  } catch (err) {
    console.error('Error clearing admin auth:', err);
  }
}; 