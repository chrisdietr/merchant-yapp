import YappSDK, { FiatCurrency, Payment, isInIframe } from '@yodlpay/yapp-sdk';
import { WALLET_ADDRESS } from '../config/yodl';

// Add SDK method extensions for TypeScript
interface ExtendedYappSDK extends YappSDK {
  getAccount?: () => Promise<string | null>;
  signMessage?: (message: string) => Promise<string>;
  getPendingPayments?: (address: string) => Promise<Payment[]>;
}

// Extend the Payment interface for our use case
interface ExtendedPayment extends Payment {
  memo?: string;
  metadata?: any;
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
    try {
      return isInIframe();
    } catch (error) {
      console.warn('Error checking iframe status:', error);
      // If we can't determine for sure, assume not in iframe for safety
      return false;
    }
  }
  
  // Get the currently connected account from Yodl context
  public async getConnectedAccount(): Promise<string | null> {
    try {
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
    } catch (e) {
      console.warn('Error in getConnectedAccount:', e);
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
      
      // We'll keep the redirectUrl for normal navigation post-payment
      // But we'll also set up for webhook handling
      const webhookId = `webhook_${Date.now()}`;
      localStorage.setItem(`payment_pending_${memo}`, webhookId);
      
      // Store additional metadata in localStorage for retrieval
      localStorage.setItem(`payment_metadata_${memo}`, JSON.stringify({
        webhookId,
        isIframe: this.isInIframe(),
        orderInfo: memo
      }));
      
      // Use origin for redirect to ensure we stay in the same context
      const redirectUrl = `${window.location.origin}/confirmation/${memo}`;
      
      // Request payment using the SDK with only supported parameters
      const response = await this.sdk.requestPayment(WALLET_ADDRESS, {
        amount,
        currency,
        memo,
        redirectUrl, // Keep redirect for normal flow
      });

      // Set up a timer to poll for payment status for iframe scenarios
      if (this.isInIframe()) {
        console.log('Setting up payment status polling for iframe mode');
        this._setupPaymentStatusPolling(memo, webhookId);
      }
      
      return response;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }
  
  // Helper method to safely serialize data for postMessage
  private _safePostMessage(targetWindow: Window, data: any, targetOrigin: string): void {
    try {
      // Deep clone and remove any URL objects or other non-serializable items
      const safeData = this._makeDataPostMessageSafe(data);
      targetWindow.postMessage(safeData, targetOrigin);
    } catch (error) {
      console.warn('Failed to post message safely:', error);
    }
  }

  // Makes data safe for postMessage by removing URL objects and other non-serializable data
  private _makeDataPostMessageSafe(data: any): any {
    if (!data) return data;
    
    if (typeof data !== 'object') return data;
    
    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this._makeDataPostMessageSafe(item));
    }
    
    // Handle objects
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const value = data[key];
        
        // Skip URL objects
        if (value instanceof URL) {
          result[key] = value.toString(); // Convert URL to string
        } else if (typeof value === 'object' && value !== null) {
          result[key] = this._makeDataPostMessageSafe(value);
        } else {
          result[key] = value;
        }
      }
    }
    
    return result;
  }

  // Poll for payment status as an alternative to redirects in iframe mode
  private _setupPaymentStatusPolling(orderId: string, webhookId: string, attempts = 0): void {
    // Maximum number of polling attempts (5 minutes at 5-second intervals)
    const MAX_ATTEMPTS = 60;
    const POLLING_INTERVAL = 5000; // 5 seconds
    
    if (attempts >= MAX_ATTEMPTS) {
      console.log(`Giving up polling for payment ${orderId} after ${MAX_ATTEMPTS} attempts`);
      return;
    }
    
    setTimeout(async () => {
      try {
        // Check if payment has been completed via webhook
        const webhookReceived = localStorage.getItem(`payment_completed_${webhookId}`);
        
        if (webhookReceived) {
          console.log(`Payment for ${orderId} confirmed via webhook`);
          // Clean up localStorage
          localStorage.removeItem(`payment_pending_${orderId}`);
          localStorage.removeItem(`payment_completed_${webhookId}`);
          
          // Refresh the page or update UI as needed
          // But avoid redirect in iframe context
          try {
            if (this.isInIframe()) {
              // Post message to parent to update UI
              this._safePostMessage(window.parent, {
                type: 'PAYMENT_COMPLETED',
                orderId,
                success: true
              }, '*');
            }
          } catch (postError) {
            console.warn('Error posting message to parent:', postError);
          }
          return;
        }
        
        // If no webhook confirmation, check directly with API
        // This is a fallback mechanism
        try {
          // Look for pending payments
          const pendingPayments = await this.checkPendingPayments();
          const matchingPayment = pendingPayments.find(p => {
            // Cast to extended payment type
            const extendedPayment = p as ExtendedPayment;
            return extendedPayment.memo === orderId || 
              (typeof extendedPayment.metadata === 'object' && 
               extendedPayment.metadata?.orderInfo === orderId);
          });
          
          if (matchingPayment) {
            console.log(`Found matching payment for ${orderId}:`, matchingPayment);
            // Handle successful payment
            try {
              if (this.isInIframe()) {
                this._safePostMessage(window.parent, {
                  type: 'PAYMENT_COMPLETED',
                  orderId,
                  success: true,
                  payment: matchingPayment
                }, '*');
              }
            } catch (postError) {
              console.warn('Error posting message to parent:', postError);
            }
            return;
          }
        } catch (checkError) {
          console.warn('Error checking pending payments:', checkError);
        }
        
        // Continue polling
        this._setupPaymentStatusPolling(orderId, webhookId, attempts + 1);
      } catch (error) {
        console.error('Error in payment polling:', error);
        // Continue polling despite errors
        this._setupPaymentStatusPolling(orderId, webhookId, attempts + 1);
      }
    }, POLLING_INTERVAL);
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