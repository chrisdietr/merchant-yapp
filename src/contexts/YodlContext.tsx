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
  
  // Get the merchant address from admin config
  const merchantAddress = adminConfig.admins[0]?.address || "";
  const merchantEns = adminConfig.admins[0]?.ens || "";

  // Add postMessage listener for payment completion
  useEffect(() => {
    console.log("Setting up YodlContext payment message listener");
    
    const handleMessage = (event: MessageEvent) => {
      // Log all messages for debugging
      console.log("YodlContext received message:", event.origin, event.data);
      
      // Accept messages from any origin for better compatibility
      if (event.data && typeof event.data === 'object') {
        // Handle payment complete event from Yodl
        if (event.data.type === 'payment_complete' || 
            (event.data.txHash && (event.data.orderId || event.data.memo))) {
          console.log("Payment data detected in message:", event.data);
          
          // Extract transaction data
          const txHash = event.data.txHash;
          const chainId = event.data.chainId;
          const orderId = event.data.orderId || event.data.memo;
          
          if (txHash && orderId) {
            console.log(`Storing payment result for order ${orderId}:`, { txHash, chainId });
            
            // Store payment result in localStorage
            localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
            
            // Broadcast to all potential listeners
            try {
              // Send to parent window if we're in an iframe
              if (isInIframeValue && window.parent) {
                console.log("Broadcasting payment completion to parent window");
                window.parent.postMessage({
                  type: 'payment_complete',
                  txHash,
                  chainId,
                  orderId
                }, '*');
              }
              
              // Also broadcast to this window for any local listeners
              console.log("Broadcasting payment completion to local window");
              window.postMessage({
                type: 'payment_complete',
                txHash,
                chainId,
                orderId
              }, '*');
            } catch (e) {
              console.error("Error broadcasting payment completion:", e);
            }
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
          
          // Extract orderId from memo if available (using a type-safe approach)
          const orderId = (paymentResult as any).memo || (paymentResult as any).orderId;
          
          if (orderId) {
            // Store payment result
            localStorage.setItem(`payment_${orderId}`, JSON.stringify({
              txHash: paymentResult.txHash,
              chainId: paymentResult.chainId
            }));
            
            // Broadcast payment completion
            try {
              window.postMessage({
                type: 'payment_complete',
                txHash: paymentResult.txHash,
                chainId: paymentResult.chainId,
                orderId: orderId
              }, '*');
              
              if (isInIframeValue && window.parent) {
                window.parent.postMessage({
                  type: 'payment_complete',
                  txHash: paymentResult.txHash,
                  chainId: paymentResult.chainId,
                  orderId: orderId
                }, '*');
              }
            } catch (e) {
              console.error("Error broadcasting URL payment completion:", e);
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
      
      // For iframe scenarios, use the current URL as the redirect URL
      // This keeps everything in the same context
      let redirectUrl = params.redirectUrl;
      if (!redirectUrl) {
        redirectUrl = window.location.href.split('?')[0]; // Use base URL without params
        
        // If we're not on the confirmation page, explicitly set it
        if (!redirectUrl.includes('/confirmation')) {
          redirectUrl = generateConfirmationUrl(params.orderId);
        }
        
        // Add orderId if not already present
        if (!redirectUrl.includes('orderId=')) {
          const separator = redirectUrl.includes('?') ? '&' : '?';
          redirectUrl = `${redirectUrl}${separator}orderId=${params.orderId}`;
        }
      }
      
      console.log('Requesting payment with params:', { 
        amount: params.amount, 
        currency: params.currency, 
        memo: params.orderId,
        redirectUrl,
        isInIframe: isInIframeValue
      });
      console.log('Using recipient:', recipientIdentifier);
      
      // Pre-store order data
      try {
        const orderId = params.orderId;
        const orderData = {
          name: params.description,
          price: params.amount,
          currency: params.currency,
          emoji: params.metadata?.emoji || '💰',
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
        console.log(`Saved order data for ${orderId} before payment request`);
      } catch (e) {
        console.warn('Could not save order data to localStorage', e);
      }
      
      // Request payment - this will open Yodl UI
      const paymentResult = await yodl.requestPayment(recipientIdentifier, {
        amount: params.amount,
        currency: params.currency as FiatCurrency,
        memo: params.orderId,
        redirectUrl: redirectUrl,
      });

      console.log("Payment request completed with result:", paymentResult);

      // If we got a direct result with txHash, handle it
      if (paymentResult?.txHash) {
        console.log("Got direct payment result with txHash:", paymentResult.txHash);
        
        localStorage.setItem(`payment_${params.orderId}`, JSON.stringify({
          txHash: paymentResult.txHash,
          chainId: paymentResult.chainId
        }));
        
        // Broadcast to all windows
        try {
          window.postMessage({
            type: 'payment_complete',
            txHash: paymentResult.txHash,
            chainId: paymentResult.chainId,
            orderId: params.orderId
          }, '*');
          
          if (isInIframeValue && window.parent) {
            window.parent.postMessage({
              type: 'payment_complete',
              txHash: paymentResult.txHash,
              chainId: paymentResult.chainId,
              orderId: params.orderId
            }, '*');
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