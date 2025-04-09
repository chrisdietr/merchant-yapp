import React, { createContext, useContext, useEffect, useState } from 'react';
import YappSDK, { FiatCurrency, isInIframe } from '@yodlpay/yapp-sdk';
import adminConfig from '../config/admin.json';
import { generateConfirmationUrl } from '../utils/url';

interface YodlContextType {
  yodl: YappSDK;
  createPayment: (params: {
    amount: number;
    currency: string;
    description: string;
    orderId: string;
    metadata?: Record<string, any>;
    redirectUrl?: string;
  }) => Promise<any>;
  isInIframe: boolean;
  merchantAddress: string;
  merchantEns: string;
  parsePaymentFromUrl: () => any;
}

const YodlContext = createContext<YodlContextType | null>(null);

export const useYodl = () => {
  const context = useContext(YodlContext);
  if (!context) {
    throw new Error('useYodl must be used within a YodlProvider');
  }
  return context;
};

interface YodlProviderProps {
  children: React.ReactNode;
}

export const YodlProvider: React.FC<YodlProviderProps> = ({ children }) => {
  // Initialize SDK once
  const [yodl] = useState(() => new YappSDK({}));
  const isInIframeValue = isInIframe();
  
  // Detect if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Get the merchant address from admin config
  const merchantAddress = adminConfig.admins[0]?.address || "";
  const merchantEns = adminConfig.admins[0]?.ens || "";

  // Add postMessage listener FOR messages coming FROM Yodl iframe/SDK
  useEffect(() => {
    console.log("Setting up YodlContext message listener for events FROM Yodl SDK");
    
    const handleMessage = (event: MessageEvent) => {
      // Ensure message is likely from Yodl SDK/iframe
      // It might send messages without a specific 'type'
      if (event.data && typeof event.data === 'object' && 
          !event.data.target && // Ignore browser extension messages
          event.data.txHash &&   // Must have a txHash
          (event.data.orderId || event.data.memo)) { // Must have an order identifier
        
        // Check if it's already the specific type we broadcast later
        if (event.data.type === 'payment_complete') {
           console.log("YodlContext: Received already formatted payment_complete message. Ignoring to prevent loops.");
           return;
        }
        
        console.log("YodlContext: Received potential payment completion from Yodl SDK/iframe:", event.data);
          
        // Extract transaction data
        const txHash = event.data.txHash;
        const chainId = event.data.chainId;
        const orderId = event.data.orderId || event.data.memo;
        
        if (txHash && orderId) {
          console.log(`YodlContext: Storing payment result for order ${orderId} from received message:`, { txHash, chainId });
          
          // Store payment result in localStorage
          localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
          
          // --- Broadcast a *standardized* message --- 
          try {
            const standardizedMessage = {
              type: 'payment_complete', 
              txHash,
              chainId,
              orderId
            };
            
            // Broadcast to parent (if in iframe)
            if (isInIframeValue && window.parent) {
              console.log("YodlContext: Broadcasting standardized payment_complete to parent window");
              window.parent.postMessage(standardizedMessage, '*');
            }
            
            // Broadcast locally (for PaymentBridge or other listeners)
            console.log("YodlContext: Broadcasting standardized payment_complete to local window");
            window.postMessage(standardizedMessage, '*');
          } catch (e) {
            console.error("YodlContext: Error broadcasting standardized payment completion:", e);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isInIframeValue]);

  // Check for payment details in URL on initial load
  useEffect(() => {
    const checkUrlForPayment = () => {
      try {
        const paymentResult = yodl.parsePaymentFromUrl();
        console.log("Checking URL for payment data:", paymentResult);
        
        if (paymentResult && paymentResult.txHash) {
          console.log('Payment detected in URL:', paymentResult);
          
          const orderId = (paymentResult as any).memo || (paymentResult as any).orderId;
          
          if (orderId) {
            const txHash = paymentResult.txHash;
            const chainId = paymentResult.chainId;
            
            // Store payment result
            localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
            console.log(`YodlContext: Stored payment result for order ${orderId} from URL:`, { txHash, chainId });
            
            // --- Broadcast the standardized message --- 
            try {
              const standardizedMessage = {
                type: 'payment_complete', 
                txHash,
                chainId,
                orderId
              };
              
              // Broadcast locally
              console.log("YodlContext: Broadcasting standardized payment_complete from URL check");
              window.postMessage(standardizedMessage, '*');
              
              // Broadcast to parent if needed
              if (isInIframeValue && window.parent) {
                 console.log("YodlContext: Broadcasting standardized payment_complete from URL check to parent");
                 window.parent.postMessage(standardizedMessage, '*');
              }
            } catch (e) {
              console.error("YodlContext: Error broadcasting URL payment completion:", e);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing payment from URL:', error);
      }
    };

    // Check for payments when the component mounts
    console.log("Initial URL payment check on mount");
    checkUrlForPayment();

    // Also check when visibility changes (user returns from payment flow)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Visibility changed to visible, checking URL for payment");
        checkUrlForPayment();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [yodl, isInIframeValue]);

  const parsePaymentFromUrl = () => {
    return yodl.parsePaymentFromUrl();
  };

  const createPayment = async (params: {
    amount: number;
    currency: string;
    description: string;
    orderId: string;
    metadata?: Record<string, any>;
    redirectUrl?: string;
  }) => {
    try {
      const recipientIdentifier = merchantEns || merchantAddress;
      if (!recipientIdentifier) {
        throw new Error("No merchant address or ENS configured in admin.json");
      }
      
      // Determine redirectUrl (simplified)
      let redirectUrl = params.redirectUrl || generateConfirmationUrl(params.orderId);
      if (isMobile && !redirectUrl.startsWith('http')) {
        redirectUrl = new URL(redirectUrl, window.location.origin).toString();
      }
      
      console.log('Requesting payment with params:', { 
        amount: params.amount, 
        currency: params.currency, 
        memo: params.orderId,
        redirectUrl,
        isInIframe: isInIframeValue,
        isMobile
      });
      console.log('Using recipient:', recipientIdentifier);
      
      // Pre-store order data
      try {
        const orderData = {
          name: params.description,
          price: params.amount,
          currency: params.currency,
          emoji: params.metadata?.emoji || '💰',
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(`order_${params.orderId}`, JSON.stringify(orderData));
        console.log(`Saved order data for ${params.orderId} before payment request`);
      } catch (e) {
        console.warn('Could not save order data to localStorage', e);
      }
            
      // Request payment
      const paymentResult = await yodl.requestPayment(recipientIdentifier, {
        amount: params.amount,
        currency: params.currency as FiatCurrency,
        memo: params.orderId,
        redirectUrl: redirectUrl,
      });

      console.log("Payment request completed with result:", paymentResult);

      // If we got an immediate result with txHash, handle it
      if (paymentResult?.txHash) {
        console.log("Got direct payment result with txHash:", paymentResult.txHash);
        
        const txHash = paymentResult.txHash;
        const chainId = paymentResult.chainId;
        const orderId = params.orderId; // Use the orderId passed to the function

        localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
        console.log(`YodlContext: Stored direct payment result for order ${orderId}:`, { txHash, chainId });

        // --- Broadcast the standardized message --- 
        try {
          const standardizedMessage = {
            type: 'payment_complete', 
            txHash,
            chainId,
            orderId
          };
          
          // Broadcast locally
          console.log("YodlContext: Broadcasting standardized payment_complete from direct result");
          window.postMessage(standardizedMessage, '*');

          // Broadcast to parent if needed
          if (isInIframeValue && window.parent) {
            console.log("YodlContext: Broadcasting standardized payment_complete from direct result to parent");
            window.parent.postMessage(standardizedMessage, '*');
          }
        } catch (e) {
          console.error("Error broadcasting direct payment completion:", e);
        }
      }

      return paymentResult;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  };

  return (
    <YodlContext.Provider value={{ 
      yodl, 
      createPayment,
      parsePaymentFromUrl,
      isInIframe: isInIframeValue,
      merchantAddress,
      merchantEns
    }}>
      {children}
    </YodlContext.Provider>
  );
}; 