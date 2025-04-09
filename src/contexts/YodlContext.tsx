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
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from Yodl
      if (event.origin.includes('yodl.me')) {
        if (event.data.type === 'payment_complete') {
          const { txHash, chainId, orderId } = event.data;
          if (txHash && orderId) {
            // Store payment result
            localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
            // If we're in an iframe, notify parent window
            if (isInIframeValue) {
              window.parent.postMessage({
                type: 'payment_complete',
                txHash,
                chainId,
                orderId
              }, '*');
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
        
        if (paymentResult && paymentResult.txHash) {
          console.log('Payment detected in URL:', paymentResult);
          
          // You might want to store this or handle the success case
          // This would typically redirect to a confirmation page
          // but if we're already on it, we don't need to redirect
        }
      } catch (error) {
        console.error('Error parsing payment from URL:', error);
      }
    };

    // Check for payments when the component mounts
    checkUrlForPayment();

    // Also check when visibility changes (user returns from payment flow)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUrlForPayment();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [yodl]);

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
      
      // Handle redirect URL differently for iframe vs non-iframe
      let redirectUrl = params.redirectUrl;
      if (!redirectUrl) {
        if (isInIframeValue) {
          // In iframe mode, we want to stay in the iframe
          redirectUrl = window.location.href;
        } else {
          // In non-iframe mode, use the confirmation URL
          redirectUrl = generateConfirmationUrl(params.orderId);
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
      
      const paymentResult = await yodl.requestPayment(recipientIdentifier, {
        amount: params.amount,
        currency: params.currency as FiatCurrency,
        memo: params.orderId,
        redirectUrl: redirectUrl,
      });

      // If we're in an iframe and got a payment result, store it
      if (isInIframeValue && paymentResult?.txHash) {
        localStorage.setItem(`payment_${params.orderId}`, JSON.stringify({
          txHash: paymentResult.txHash,
          chainId: paymentResult.chainId
        }));
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