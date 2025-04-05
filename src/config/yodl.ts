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

// Get the admin wallet address or ENS from the config (could be an ETH address or ENS name)
export const WALLET_ADDRESS = adminConfig.admins[0];

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
  // Ensure the wallet address is properly formatted
  // If ENS name, use as is. If ETH address, remove 0x prefix if present
  const walletAddressOrENS = WALLET_ADDRESS;
  const formattedWalletAddress = walletAddressOrENS.startsWith('0x')
    ? walletAddressOrENS.substring(2)
    : walletAddressOrENS;
  
  // Create base URL with required parameters (without protocol)
  const baseUrl = `yodl.me/${formattedWalletAddress}?amount=${amount}&currency=${currency}`;
  
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