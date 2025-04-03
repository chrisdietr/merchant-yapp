import YappSDK, { FiatCurrency, Payment, isInIframe } from '@yodlpay/yapp-sdk';
import { WALLET_ADDRESS } from '../config/yodl';

// Singleton instance of the YappSDK
class YodlService {
  private static instance: YodlService;
  private sdk: YappSDK;

  private constructor() {
    // Initialize the SDK with default configuration
    this.sdk = new YappSDK();
  }

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

  // Generate a unique memo for the payment
  private generateMemo(orderId?: string): string {
    return orderId ? `order_${orderId}_${Date.now()}` : `payment_${Date.now()}`;
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
      
      // Request payment using the SDK
      const response = await this.sdk.requestPayment(WALLET_ADDRESS, {
        amount,
        currency,
        memo,
        redirectUrl: `${window.location.origin}/confirmation/${memo}`,
      });

      return response;
    } catch (error) {
      console.error('Payment failed:', error);
      throw error;
    }
  }

  // Store order info in localStorage - changed from private to public
  public storeOrderInfo(orderId: string, orderInfo: any): void {
    try {
      // Get existing orders or initialize empty object
      const existingOrders = localStorage.getItem('yodl_orders');
      const orders = existingOrders ? JSON.parse(existingOrders) : {};
      
      // Add this order
      orders[orderId] = {
        ...(orders[orderId] || {}),  // Keep existing data if any
        ...orderInfo                 // Update with new data
      };
      
      // Save back to localStorage
      localStorage.setItem('yodl_orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Error storing order info:', error);
    }
  }

  // Get order info from localStorage
  public getOrderInfo(orderId: string): any {
    try {
      const orders = localStorage.getItem('yodl_orders');
      if (!orders) return null;
      
      const parsedOrders = JSON.parse(orders);
      return parsedOrders[orderId] || null;
    } catch (error) {
      console.error('Error retrieving order info:', error);
      return null;
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

  // Parse payment from URL (for redirect flow)
  public parsePaymentFromUrl(): Payment | null {
    const result = this.sdk.parsePaymentFromUrl();
    
    // The SDK method returns a partial payment object that might be null
    // Only return a valid Payment object if it has the required properties
    if (result && result.txHash && result.chainId) {
      return result as Payment;
    }
    
    return null;
  }

  // Clean payment parameters from URL
  public cleanPaymentUrl(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('txHash');
    url.searchParams.delete('chainId');
    window.history.replaceState({}, document.title, url.toString());
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
      
      // Try each endpoint until one works
      for (const apiUrl of apiEndpoints) {
        try {
          console.log(`Trying API URL: ${apiUrl}`);
          
          const response = await fetch(apiUrl);
          
          // If not successful, try the next endpoint
          if (!response.ok) {
            console.warn(`API endpoint ${apiUrl} returned status: ${response.status}`);
            lastError = new Error(`API returned status: ${response.status}`);
            continue;
          }
          
          // Parse response data
          const data = await response.json();
          console.log('API response data:', data);
          
          // Different endpoints return different data structures
          // Handle both transaction-wrapped and direct payment data
          if (data && data.transaction) {
            return data.transaction;
          } else if (data && (data.amount || data.status || data.timestamp)) {
            return data;
          }
          
          // If we get here but data seems incomplete, try next endpoint
          console.warn('Data from API appears incomplete, trying next endpoint');
        } catch (endpointError) {
          console.warn(`Error with endpoint ${apiUrl}:`, endpointError);
          lastError = endpointError;
        }
      }
      
      // If we've tried all endpoints and none worked, throw the last error
      if (lastError) {
        throw lastError;
      }
      
      throw new Error('All API endpoints failed');
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }
}

export default YodlService.getInstance(); 