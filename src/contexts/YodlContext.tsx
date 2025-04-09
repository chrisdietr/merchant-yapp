import React, { createContext, useContext, useEffect, useState } from 'react';
import YappSDK, { FiatCurrency, isInIframe } from '@yodlpay/yapp-sdk';
import adminConfig from '../config/admin.json';

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
      
      // Always include redirectUrl (required in non-iframe mode)
      // SDK will handle iframe mode automatically
      const redirectUrl = params.redirectUrl || window.location.href;
      
      console.log('Requesting payment with params:', { 
        amount: params.amount, 
        currency: params.currency, 
        memo: params.orderId,
        redirectUrl 
      });
      console.log('Using recipient:', recipientIdentifier);
      
      // Pre-store order data in case the redirect happens before we can save it
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
      
      return await yodl.requestPayment(recipientIdentifier, {
        amount: params.amount,
        currency: params.currency as FiatCurrency,
        memo: params.orderId,
        redirectUrl: redirectUrl,
      });
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