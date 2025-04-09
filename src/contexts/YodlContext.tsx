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
  const yodl = new YappSDK({});
  const isInIframeValue = isInIframe();
  
  // Get the merchant address from admin config
  const merchantAddress = adminConfig.admins[0]?.address || "";
  const merchantEns = adminConfig.admins[0]?.ens || "";

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
      
      const redirectUrl = params.redirectUrl || window.location.href;
      
      console.log('Requesting payment with params:', params);
      console.log('Using recipient:', recipientIdentifier);
      console.log('Using memo (orderId):', params.orderId);
      
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
      isInIframe: isInIframeValue,
      merchantAddress,
      merchantEns
    }}>
      {children}
    </YodlContext.Provider>
  );
}; 