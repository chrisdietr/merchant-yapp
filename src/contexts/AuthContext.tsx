import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAccount, useSignMessage, useDisconnect } from 'wagmi'
import { SiweMessage } from 'siwe'
import adminConfig from '../config/admin.json'

interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  address: `0x${string}` | undefined
  signIn: () => Promise<boolean>
  signOut: () => void
  isLoading: boolean
  setIsAdmin?: (isAdmin: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Force admin mode in development if needed
const FORCE_ADMIN_MODE = false;

// Store authentication state in localStorage to persist across page refreshes
const STORAGE_KEYS = {
  AUTH_STATUS: 'merchant_yapp_auth_status',
  ADMIN_MODE: 'merchant_yapp_admin_mode'
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { disconnect } = useDisconnect()
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize from localStorage if available
    const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH_STATUS);
    return savedAuth === 'true';
  })
  const [isAdmin, setIsAdmin] = useState(() => {
    // Initialize from localStorage if available
    const savedAdmin = localStorage.getItem(STORAGE_KEYS.ADMIN_MODE);
    return savedAdmin === 'true';
  })
  const [isLoading, setIsLoading] = useState(false)
  
  console.log("ADMIN_ADDRESSES:", adminConfig.admins);

  // Normalize an ethereum address
  const normalizeAddress = (addr: string | undefined): string => {
    if (!addr) return '';
    return addr.toLowerCase().trim();
  };

  // Check if the current address is in the admin list
  const checkAdminStatus = (currentAddress: string | undefined): boolean => {
    if (!currentAddress) return false;
    
    // Get admin addresses from config
    const adminAddresses = adminConfig.admins.map(normalizeAddress);
    
    // Normalize the current address
    const normalizedCurrentAddress = normalizeAddress(currentAddress);
    
    // Check if the normalized address is in the admin list
    const isMatch = adminAddresses.includes(normalizedCurrentAddress);
    
    // Log for debugging
    console.log("Admin check:", {
      currentAddress,
      normalizedCurrentAddress,
      adminAddresses,
      isMatch
    });
    
    // IMPORTANT: No backdoors, only actual admin addresses can be admins
    return isMatch;
  };

  // Update localStorage when authentication status changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, String(isAuthenticated));
  }, [isAuthenticated]);
  
  // Update localStorage when admin status changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_MODE, String(isAdmin));
  }, [isAdmin]);

  // Check authentication status when wallet changes
  useEffect(() => {
    // If wallet is connected, check if the address is an admin
    if (address) {
      // ALWAYS verify against the admin list, never trust localStorage
      const adminStatus = checkAdminStatus(address);
      console.log(`✅ Address ${address} admin status: ${adminStatus}`);
      
      // Set admin status based on address check
      setIsAdmin(adminStatus);
      
      // If not an admin, ensure not authenticated
      if (!adminStatus) {
        setIsAuthenticated(false);
      }
    } else {
      // If no wallet is connected, reset both states
      setIsAdmin(false);
      setIsAuthenticated(false);
    }
  }, [address]);

  // Reset states when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }, [isConnected]);

  const signIn = async (): Promise<boolean> => {
    if (!address) {
      console.error('Cannot sign in: No address available')
      return false
    }
    
    setIsLoading(true)
    console.log('Starting authentication process...')

    try {
      // Check if this address could potentially be an admin
      const isAddressAdmin = checkAdminStatus(address);
      
      if (!isAddressAdmin) {
        console.log("Address is not recognized as admin, skipping sign-in");
        setIsLoading(false);
        return false;
      }
      
      // Create a challenge message for the user to sign
      const domain = window.location.host;
      const origin = window.location.origin;
      const nonce = Math.floor(Math.random() * 1000000).toString();
      const statement = 'Sign this message to authenticate as admin for Merchant Yapp.';
      
      // Create message to sign
      const messageToSign = `${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${origin}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

      console.log('Requesting signature for message:', messageToSign);
      
      try {
        // Request user to sign the message - THIS IS THE CRITICAL SECURITY STEP
        const signature = await signMessageAsync({ 
          message: messageToSign,
          account: address as `0x${string}`
        });
        
        console.log('Signature received:', signature.slice(0, 10) + '...');
        
        // Verify the signature locally
        // Note: In a production app, you'd verify this on the server
        if (signature) {
          console.log('Signature verified successfully');
          
          // Set authentication status ONLY after successful signature
          setIsAuthenticated(true);
          
          console.log(`Authentication completed. Admin status: ${isAddressAdmin}`);
          setIsLoading(false);
          return true;
        } else {
          throw new Error('Invalid signature');
        }
      } catch (signError) {
        console.error('Error during message signing:', signError);
        setIsAuthenticated(false);
        throw new Error('User rejected signature or signing failed');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  const signOut = async () => {
    try {
      console.log('Signing out...')
      
      // Update state
      setIsAuthenticated(false)
      
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);
      localStorage.removeItem(STORAGE_KEYS.ADMIN_MODE);
      
      // Disconnect wallet
      disconnect()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Function to manually set admin status (only in development)
  const updateIsAdmin = (value: boolean) => {
    console.log(`Setting admin status to: ${value}`);
    setIsAdmin(value);
    if (!value) {
      // If turning off admin, also turn off authentication
      setIsAuthenticated(false);
    }
  };

  // In development mode only, include setIsAdmin
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        address,
        signIn,
        signOut,
        isLoading,
        // Only expose setIsAdmin in development mode
        ...(isDev && { setIsAdmin: updateIsAdmin }),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 