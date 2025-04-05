import { FiatCurrency } from '@yodlpay/yapp-sdk';

// Admin wallet address from config
import adminConfig from './admin.json';

// Supported currencies
// Only using currencies that are available in the FiatCurrency enum
export const SUPPORTED_CURRENCIES = [
  FiatCurrency.USD,
  FiatCurrency.CHF,
  FiatCurrency.EUR,
  FiatCurrency.BRL,
  FiatCurrency.THB
];

// Get the admin wallet ENS (preferred) or address from the config
export const getAdminWalletInfo = () => {
  const adminInfo = adminConfig.admins[0];
  
  // If the new format with ens and address is used
  if (typeof adminInfo === 'object' && adminInfo.ens) {
    return {
      primaryIdentifier: adminInfo.ens,
      fallbackAddress: adminInfo.address || null
    };
  }
  
  // Legacy format (string only)
  return {
    primaryIdentifier: adminInfo as unknown as string,
    fallbackAddress: null
  };
};

// Get the primary identifier (ENS if available, otherwise address)
export const WALLET_ADDRESS = getAdminWalletInfo().primaryIdentifier;

// Get the fallback address if needed
export const FALLBACK_ADDRESS = getAdminWalletInfo().fallbackAddress;

// Order metadata interface for better type checking
export interface OrderMetadata {
  productName?: string;
  productId?: string;
  ownerAddress?: string;
  timestamp?: string;
  amount?: number;
  currency?: FiatCurrency | string;
  status?: string;
  nonce?: string;
  senderAddress?: string;
  emoji?: string;
}

// Function to generate a Yodl payment link with redirect to confirmation page
export const generateYodlLink = (
  amount: number, 
  currency: FiatCurrency, 
  orderId?: string, 
  disconnectWallet: boolean = false,
  metadata?: OrderMetadata
): string => {
  // Always use ENS name if available, otherwise use address
  const walletIdentifier = WALLET_ADDRESS;
  
  // If it's an ETH address, remove 0x prefix as required by Yodl
  const formattedIdentifier = walletIdentifier.startsWith('0x')
    ? walletIdentifier.substring(2)
    : walletIdentifier;
  
  // Create base URL with required parameters (without protocol)
  const baseUrl = `yodl.me/${formattedIdentifier}?amount=${amount}&currency=${currency}`;
  
  // Get the current origin with protocol
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Generate or use provided order ID
  const orderParam = orderId ? orderId : `order_${Date.now()}`;
  
  // Store metadata in localStorage if available
  if (metadata && orderParam) {
    try {
      const yodlService = import('../lib/yodl').then(module => {
        const service = module.default;
        // Store metadata with order info
        service.storeOrderInfo(orderParam, {
          amount,
          currency,
          ...metadata,
          timestamp: new Date().toISOString()
        });
      }).catch(error => {
        console.error('Failed to store order metadata:', error);
      });
    } catch (error) {
      console.error('Error importing yodl service:', error);
    }
  }
  
  // Add redirectURL parameter to return to confirmation page with this order ID
  const redirectUrl = encodeURIComponent(`${origin}/confirmation/${orderParam}`);
  
  // Add disconnectWallet parameter if needed
  const disconnectParam = disconnectWallet ? '&disconnectWallet=true' : '';
  
  // Return the complete URL (without protocol)
  return `${baseUrl}&redirectUrl=${redirectUrl}${disconnectParam}`;
}; 