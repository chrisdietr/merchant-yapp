import YappSDK, { FiatCurrency, Payment, isInIframe } from '@yodlpay/yapp-sdk';
import { WALLET_ADDRESS } from '../config/yodl';

// Add SDK method extensions for TypeScript
interface ExtendedYappSDK extends YappSDK {
  getAccount?: () => Promise<string | null>;
  signMessage?: (message: string) => Promise<string>;
  getPendingPayments?: (address: string) => Promise<Payment[]>;
}

// Singleton instance of the YappSDK
class YodlService {
  private static instance: YodlService;
  private sdk: ExtendedYappSDK;
  private connectedAccount: string | null = null;

  private constructor() {
    // Initialize the SDK with default configuration
    this.sdk = new YappSDK() as ExtendedYappSDK;
    
    // Try to get the connected account if in iframe
    if (this.isInIframe()) {
      this.getConnectedAccount().then(account => {
        if (account) {
          console.log("Auto-detected connected account in Yodl iframe:", account);
          this.connectedAccount = account;
        }
      }).catch(error => {
        console.error("Failed to get connected account from Yodl:", error);
      });
    }
  }

  // Get singleton instance
  public static getInstance(): YodlService {
    if (!YodlService.instance) {
      YodlService.instance = new YodlService();
    }
    return YodlService.instance;
  }

  // Check if running in iframe
  public isInIframe(): boolean {
    return isInIframe();
  }
  
  // Get the currently connected account from Yodl context
  public async getConnectedAccount(): Promise<string | null> {
    if (!this.isInIframe()) {
      return null;
    }
    
    try {
      // Try to get the connected account from Yodl SDK
      if (this.sdk.getAccount) {
        const account = await this.sdk.getAccount();
        return account;
      }
      return null;
    } catch (error) {
      console.error("Error getting connected account from Yodl:", error);
      return null;
    }
  }
  
  // Get the cached connected account (or fetch fresh if not cached)
  public async getConnectedAccountCached(): Promise<string | null> {
    if (this.connectedAccount) {
      return this.connectedAccount;
    }
    
    const account = await this.getConnectedAccount();
    if (account) {
      this.connectedAccount = account;
    }
    return account;
  }
  
  // Sign a message using the Yodl SDK
  public async signMessage(message: string): Promise<string> {
    if (!this.isInIframe()) {
      throw new Error("Not in an iframe, cannot use Yodl SDK signing");
    }
    
    try {
      // Sign the message using Yodl SDK
      if (this.sdk.signMessage) {
        const signature = await this.sdk.signMessage(message);
        return signature;
      }
      throw new Error("signMessage method not available in this SDK version");
    } catch (error) {
      console.error("Error signing message with Yodl SDK:", error);
      throw error;
    }
  }

  // Generate a unique memo for order identification
  public generateMemo(orderId?: string): string {
    if (orderId) {
      return orderId;
    }
    
    // Generate a unique ID
    return `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  // Store information about an order in localStorage
  public storeOrderInfo(orderId: string, info: any): void {
    try {
      const storageKey = `order_info_${orderId}`;
      localStorage.setItem(storageKey, JSON.stringify(info));
      console.log(`Stored order info for ${orderId}:`, info);
    } catch (error) {
      console.error('Failed to store order info:', error);
    }
  }

  // Get stored order information from localStorage
  public getOrderInfo(orderId: string): any {
    try {
      const storageKey = `order_info_${orderId}`;
      const data = localStorage.getItem(storageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to get order info:', error);
    }
    return null;
  }

  // Request a payment using SDK directly
  public async requestPaymentWithSDK(
    amount: number,
    currency: FiatCurrency,
    orderId?: string,
    metadata?: { productName?: string; ownerAddress?: string }
  ): Promise<Payment> {
    try {
      // Create a unique memo if not provided
      const memo = orderId || this.generateMemo();
      
      console.log(`Requesting payment with SDK for order: ${memo}`, { amount, currency, metadata });
      
      // Store order info in localStorage for retrieval after payment
      this.storeOrderInfo(memo, { 
        amount, 
        currency, 
        timestamp: new Date().toISOString(),
        orderId: memo, // Store the order ID explicitly
        productName: metadata?.productName, // Store product name if provided
        ownerAddress: metadata?.ownerAddress // Store owner address if provided
      });
      
      // Special handling for iframe mode
      const isIframe = this.isInIframe();
      const options = {
        amount,
        currency,
        memo,
        redirectUrl: window.location.href,
      };
      
      // If in iframe, avoid target="_blank" behavior by using parent window location
      if (isIframe) {
        console.log('Operating in iframe mode, using special handling for redirects');
        // Open in current iframe context by leveraging the SDK's iframe behavior
        const response = await this.sdk.requestPayment(WALLET_ADDRESS, options);
        return response;
      } else {
        // Standard flow for non-iframe contexts
        const response = await this.sdk.requestPayment(WALLET_ADDRESS, options);
        return response;
      }
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  // Parse payment details from URL (used after redirect)
  public parsePaymentFromUrl(): Payment | null {
    try {
      // Check for URL parameters
      const params = new URLSearchParams(window.location.search);
      
      // Get payment details from URL
      const txHash = params.get('txHash');
      const chainIdStr = params.get('chainId');
      
      if (txHash && chainIdStr) {
        const chainId = parseInt(chainIdStr, 10);
        
        // Return payment object
        return {
          txHash: txHash as `0x${string}`,
          chainId,
        };
      }
    } catch (error) {
      console.error('Failed to parse payment from URL:', error);
    }
    
    return null;
  }

  // Clean payment parameters from URL
  public cleanPaymentUrl(): void {
    try {
      // Remove payment parameters from URL without page reload
      const url = new URL(window.location.href);
      url.searchParams.delete('txHash');
      url.searchParams.delete('chainId');
      
      window.history.replaceState({}, document.title, url.toString());
    } catch (error) {
      console.error('Failed to clean payment URL:', error);
    }
  }

  // Request a payment
  public async requestPayment(
    amount: number,
    currency: FiatCurrency,
    orderId?: string,
    customMemo?: string
  ): Promise<Payment> {
    try {
      // Create a unique memo if not provided
      const memo = customMemo || this.generateMemo(orderId);
      
      // Request payment using the admin wallet address from config
      const response = await this.sdk.requestPayment(WALLET_ADDRESS, {
        amount,
        currency,
        memo,
        redirectUrl: window.location.href, // Required for non-iframe mode
      });

      return response;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  // Check for pending payments
  public async checkPendingPayments(
    paymentAddress: string = WALLET_ADDRESS
  ): Promise<Payment[]> {
    try {
      // Get pending payments for the address
      if (this.sdk.getPendingPayments) {
        const pendingPayments = await this.sdk.getPendingPayments(paymentAddress);
        return pendingPayments;
      }
      return [];
    } catch (error) {
      console.error('Failed to get pending payments:', error);
      return [];
    }
  }

  // Close the Yapp (for iframe mode)
  public close(parentOrigin?: string): void {
    try {
      this.sdk.close(parentOrigin);
    } catch (error) {
      console.error('Failed to close:', error);
      throw error;
    }
  }

  // Fetch payment details - Updated with correct API format
  public async fetchPaymentDetails(txHash: string): Promise<any> {
    try {
      // Check if txHash is valid
      if (!txHash || typeof txHash !== 'string') {
        throw new Error('Invalid transaction hash');
      }
      
      console.log(`Fetching payment details for txHash: ${txHash}`);
      
      // Ensure txHash is properly formatted with 0x prefix for SDK
      const formattedTxHash = txHash.startsWith('0x') ? txHash : `0x${txHash}`;
      
      // First try using the YappSDK getPayment method
      if (this.sdk.getPayment) {
        try {
          const payment = await this.sdk.getPayment(formattedTxHash as `0x${string}`);
          console.log('Payment details retrieved via SDK:', payment);
          if (payment && Object.keys(payment).length > 0) {
            return payment;
          }
          // If payment is empty, continue to API fallback
        } catch (sdkError) {
          console.warn('SDK getPayment failed, falling back to API:', sdkError);
        }
      }
      
      // Try multiple API endpoints - the format changed recently
      const apiEndpoints = [
        `https://yodl.me/api/v1/payments/${formattedTxHash}`,
        `https://api.yodl.me/v1/transactions/${formattedTxHash}`,
        `https://api.yodl.me/v1/payments/${formattedTxHash}`
      ];
      
      let lastError = null;
      
      for (const endpoint of apiEndpoints) {
        try {
          const response = await fetch(endpoint);
          if (response.ok) {
            const data = await response.json();
            console.log('Payment details retrieved from API:', data);
            return data;
          }
        } catch (error) {
          console.warn(`API endpoint ${endpoint} failed:`, error);
          lastError = error;
        }
      }
      
      // If we got here, all endpoints failed
      throw lastError || new Error('All API endpoints failed to retrieve payment details');
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
      throw error;
    }
  }
}

// Export singleton instance
const yodlService = YodlService.getInstance();
export default yodlService; 