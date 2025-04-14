import { useEffect } from 'react';

interface PaymentMessage {
  txHash: string;
  chainId?: number;
  orderId?: string;
  memo?: string;
  type?: string;
  [key: string]: any; // Allow additional properties
}

interface UseYodlMessageListenerOptions {
  isInIframe?: boolean;
}

/**
 * Custom hook to listen for payment messages from Yodl SDK
 * 
 * @param options Configuration options
 * @returns void
 */
export function useYodlMessageListener(options: UseYodlMessageListenerOptions = {}) {
  const { isInIframe = false } = options;
  
  useEffect(() => {
    console.log("Setting up Yodl message listener");
    
    /**
     * Process and standardize a payment message
     */
    const processPaymentMessage = (data: PaymentMessage) => {
      // Skip if already standardized to prevent loops
      if (data.type === 'payment_complete') {
        console.log("Already received a standardized payment_complete message, ignoring to prevent loops");
        return;
      }
      
      // Extract key data
      const txHash = data.txHash;
      const chainId = data.chainId;
      const orderId = data.orderId || data.memo;
      
      if (!txHash || !orderId) {
        console.log("Message missing required transaction data", data);
        return;
      }
      
      console.log(`Processing payment result for order ${orderId}:`, { txHash, chainId });
      
      // Store in localStorage for persistence
      try {
        localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
      } catch (err) {
        console.error("Failed to save payment data to localStorage:", err);
      }
      
      // Create standardized message
      const standardizedMessage = {
        type: 'payment_complete',
        txHash,
        chainId,
        orderId
      };
      
      // Broadcast standardized message
      broadcastMessage(standardizedMessage);
    };
    
    /**
     * Broadcast a standardized message both locally and to parent if needed
     */
    const broadcastMessage = (message: Record<string, any>) => {
      try {
        // Broadcast locally 
        window.postMessage(message, '*');
        console.log("Broadcasted message locally:", message);
        
        // Broadcast to parent if in iframe
        if (isInIframe && window.parent) {
          window.parent.postMessage(message, '*');
          console.log("Broadcasted message to parent window:", message);
        }
      } catch (err) {
        console.error("Error broadcasting message:", err);
      }
    };
    
    /**
     * Handle incoming messages
     */
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      
      // Verify this is likely a Yodl payment message
      const isPaymentMessage = 
        data && 
        typeof data === 'object' && 
        !data.target && // Filter out browser extension messages
        data.txHash && 
        (data.orderId || data.memo);
      
      if (isPaymentMessage) {
        processPaymentMessage(data);
      }
    };
    
    // Add event listener
    window.addEventListener('message', handleMessage);
    
    // Clean up
    return () => {
      window.removeEventListener('message', handleMessage);
      console.log("Removed Yodl message listener");
    };
  }, [isInIframe]);
}

/**
 * Custom hook to check for payment data in URL on page load or visibility change
 * 
 * @param options.parseUrlFunction Function to parse payment data from URL
 * @param options.isInIframe Whether the app is running in an iframe
 */
export function useYodlUrlPaymentCheck(
  options: {
    parseUrlFunction: () => any;
    isInIframe: boolean;
  }
) {
  const { parseUrlFunction, isInIframe } = options;
  
  useEffect(() => {
    // Function to check URL for payment data
    const checkUrlForPayment = () => {
      try {
        const paymentResult = parseUrlFunction();
        
        if (paymentResult?.txHash) {
          console.log('Payment detected in URL:', paymentResult);
          
          const orderId = paymentResult.memo || paymentResult.orderId;
          
          if (!orderId) {
            console.warn('Payment found in URL but missing orderId/memo');
            return;
          }
          
          const txHash = paymentResult.txHash;
          const chainId = paymentResult.chainId;
          
          // Store payment result
          localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
          
          // Broadcast standardized message
          const message = {
            type: 'payment_complete', 
            txHash,
            chainId,
            orderId
          };
          
          // Broadcast locally
          window.postMessage(message, '*');
          
          // Broadcast to parent if in iframe
          if (isInIframe && window.parent) {
            window.parent.postMessage(message, '*');
          }
        }
      } catch (error) {
        console.error('Error parsing payment from URL:', error);
      }
    };
    
    // Initial check
    checkUrlForPayment();
    
    // Listen for visibility changes to check when returning from payment flow
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Visibility changed to visible, checking URL for payment");
        checkUrlForPayment();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [parseUrlFunction, isInIframe]);
}

export default useYodlMessageListener; 