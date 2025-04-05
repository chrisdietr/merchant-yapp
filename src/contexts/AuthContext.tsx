import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAccount, useSignMessage, useDisconnect, useChainId } from 'wagmi'
import { SiweMessage } from 'siwe'
import adminConfig from '../config/admin.json'
import yodlService from '@/lib/yodl'
import { FALLBACK_ADDRESS } from '@/config/yodl'
import { requireAdmin } from "@/lib/auth"

// Define a type for the admin object structure
type AdminConfig = {
  admins: (string | { ens: string; address: string })[];
};

interface AuthContextType {
  isAuthenticated: boolean
  isAdmin: boolean
  address: `0x${string}` | undefined
  signIn: () => Promise<boolean>
  signOut: () => void
  isLoading: boolean
  setIsAdmin?: (isAdmin: boolean) => void
  isYodlFrame: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Force admin mode in development if needed
const FORCE_ADMIN_MODE = false;

// Store authentication state in localStorage to persist across page refreshes
const STORAGE_KEYS = {
  AUTH_STATUS: 'merchant_yapp_auth_status',
  ADMIN_MODE: 'merchant_yapp_admin_mode'
};

// SECURITY CRITICAL: Require SIWE verification
const skipSIWE = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId() || 1
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
  
  // State for automatically connecting via Yodl when in iframe
  const [yodlAddress, setYodlAddress] = useState<string | null>(null)
  const [isYodlIframe, setIsYodlIframe] = useState(false)
  
  // Check if we're in an iframe on mount
  useEffect(() => {
    const isInIframe = yodlService.isInIframe()
    setIsYodlIframe(isInIframe)
    
    // If in iframe, try to get the connected address
    if (isInIframe) {
      yodlService.getConnectedAccount().then(account => {
        if (account) {
          console.log('Auto-detected Yodl account:', account)
          setYodlAddress(account)
          
          // Check if the account is an admin
          const adminStatus = checkAdminStatus(account)
          setIsAdmin(adminStatus)
        }
      }).catch(error => {
        console.error('Failed to get Yodl account:', error)
      })
    }
  }, [])
  
  console.log("ADMIN_ADDRESSES:", adminConfig.admins);

  // Normalize an ethereum address
  const normalizeAddress = (addr: string | undefined): string => {
    if (!addr) return '';
    return addr.toLowerCase().trim();
  };

  // Get all admin addresses (both ENS and wallet addresses)
  const getAllAdminAddresses = (): string[] => {
    return (adminConfig as AdminConfig).admins.flatMap(admin => {
      if (typeof admin === 'string') {
        // Handle legacy format (string only)
        return [normalizeAddress(admin)];
      } else if (typeof admin === 'object') {
        // Handle new format (object with ens and address)
        const addresses: string[] = [];
        if (admin.ens) addresses.push(normalizeAddress(admin.ens));
        if (admin.address) addresses.push(normalizeAddress(admin.address));
        return addresses;
      }
      return [];
    });
  };

  // Check if the current address is in the admin list
  const checkAdminStatus = (currentAddress: string | undefined): boolean => {
    if (!currentAddress) return false;
    
    // Get all admin addresses (ENS and wallet addresses)
    const adminAddresses = getAllAdminAddresses();
    
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
    } else if (yodlAddress) {
      // If we have a Yodl address but no wallet address, check if it's an admin
      const adminStatus = checkAdminStatus(yodlAddress);
      console.log(`✅ Yodl address ${yodlAddress} admin status: ${adminStatus}`);
      
      // Set admin status based on address check
      setIsAdmin(adminStatus);
    } else {
      // If no wallet is connected, reset both states
      setIsAdmin(false);
      setIsAuthenticated(false);
    }
  }, [address, yodlAddress]);

  // Reset states when wallet disconnects
  useEffect(() => {
    if (!isConnected && !yodlAddress) {
      setIsAuthenticated(false);
      setIsAdmin(false);
    }
  }, [isConnected, yodlAddress]);

  const isYodlFrame = window !== window.parent

  const signIn = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      if (!address) {
        console.log("No wallet connected");
        return false;
      }

      console.log("Attempting sign in for:", address, "isAdmin:", requireAdmin(address));
      
      // Only used during development for testing 
      if (skipSIWE && process.env.NODE_ENV === 'development' && isAdmin) {
        console.log("WARNING: SIWE verification skipped in development");
        setIsAuthenticated(true);
        return true;
      }
      
      if (isYodlFrame) {
        try {
          // In Yodl iframe, we need to use Yodl SDK to sign messages
          const message = new SiweMessage({
            domain: window.location.host,
            address: address as `0x${string}`,
            statement: "Sign in to Merchant Yapp",
            uri: window.location.origin,
            version: "1",
            chainId: 1,
          });
          
          const messageToSign = message.prepareMessage();
          
          // Use Yodl service to sign message
          const signature = await yodlService.signMessage(messageToSign);
          
          if (signature) {
            setIsAuthenticated(true);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error during Yodl sign in:", error);
          return false;
        }
      } else {
        // Regular wallet flow
        try {
          // Create a SIWE message with proper parameters
          const message = new SiweMessage({
            domain: window.location.host,
            address: address,
            statement: "Sign in to Merchant Yapp",
            uri: window.location.origin,
            version: "1",
            chainId,
          });
          
          const messageToSign = message.prepareMessage();
          console.log("Preparing message to sign:", messageToSign);
          
          // Sign the message with proper account parameter
          const signature = await signMessageAsync({ 
            message: messageToSign,
            account: address
          });
          
          console.log("Message signed successfully");
          
          if (signature) {
            setIsAuthenticated(true);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error during wallet sign in:", error);
          return false;
        }
      }
    } catch (error) {
      console.error("Error during sign in:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign-out function
  const signOut = () => {
    setIsAuthenticated(false);
    if (!isAdmin) {
      disconnect();
    }
  };

  // Combine regular wallet address and Yodl address for context
  const effectiveAddress = address || (yodlAddress as `0x${string}` | undefined);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        address: effectiveAddress,
        signIn,
        signOut,
        isLoading,
        isYodlFrame,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 