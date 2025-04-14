import React, { createContext, useContext, useEffect, useState } from 'react';
import YappSDK, { FiatCurrency, isInIframe } from '@yodlpay/yapp-sdk';
import { adminConfig } from '../config/config';
import { generateConfirmationUrl } from '../utils/url';
import useDeviceDetection from '../hooks/useMediaQuery';
import { useYodlMessageListener, useYodlUrlPaymentCheck } from '../hooks/useYodlMessageListener';

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
  
  // Use our media query-based detection
  const { isMobile, isTouch } = useDeviceDetection();
  
  // Get merchant address from validated config
  // The config.ts ensures at least one admin exists and has ens or address
  const merchantAdmin = adminConfig.admins[0];
  const merchantAddress = merchantAdmin.address || "";
  const merchantEns = merchantAdmin.ens || "";

  // Ensure we have an identifier
  useEffect(() => {
    if (!merchantAddress && !merchantEns) {
      console.error("CRITICAL: No merchant address or ENS found in validated config. Payment requests will fail.");
      // Optionally throw an error or display a message to the user
    }
  }, [merchantAddress, merchantEns]);

  // Use our custom hooks for Yodl message handling
  useYodlMessageListener({ isInIframe: isInIframeValue });
  useYodlUrlPaymentCheck({ 
    parseUrlFunction: () => yodl.parsePaymentFromUrl(),
    isInIframe: isInIframeValue 
  });

  // Simple wrapper to expose the SDK's URL parsing function
  const parsePaymentFromUrl = () => {
    return yodl.parsePaymentFromUrl();
  };

  // Request a payment using the Yodl SDK
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
        // This check is now redundant due to the useEffect above, but kept for safety
        throw new Error("No merchant address or ENS configured.");
      }
      
      // Determine redirectUrl
      let redirectUrl = params.redirectUrl || generateConfirmationUrl(params.orderId);
      if ((isMobile || isTouch) && !redirectUrl.startsWith('http')) {
        redirectUrl = new URL(redirectUrl, window.location.origin).toString();
      }
      
      console.log('Requesting payment with params:', { 
        amount: params.amount, 
        currency: params.currency, 
        memo: params.orderId,
        redirectUrl,
        isInIframe: isInIframeValue,
        isMobile,
        isTouch
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
        const orderId = params.orderId;

        // Store in localStorage
        localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
        
        // Broadcast standardized message
        const message = {
          type: 'payment_complete', 
          txHash,
          chainId,
          orderId
        };
        
        // Use try-catch in case of errors during postMessage
        try {
          // Broadcast locally
          window.postMessage(message, '*');
          
          // Broadcast to parent if in iframe
          if (isInIframeValue && window.parent) {
            window.parent.postMessage(message, '*');
          }
        } catch (e) {
          console.error("Error broadcasting payment message:", e);
        }
      }

      return paymentResult;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  };

  const contextValue = {
    yodl,
    createPayment,
    parsePaymentFromUrl,
    isInIframe: isInIframeValue,
    merchantAddress,
    merchantEns,
  };

  return (
    <YodlContext.Provider value={contextValue}>
      {children}
    </YodlContext.Provider>
  );
}; 