import React, { useState } from 'react';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import YodlService from '../lib/yodl';
import { generateYodlLink } from '../config/yodl';
import { useAccount } from 'wagmi';

interface YodlPaymentButtonProps {
  amount: number;
  currency: FiatCurrency;
  orderId?: string;
  buttonText?: string;
  productName?: string;
  ownerAddress?: string;
  onSuccess?: (txHash: string, chainId: number) => void;
  onError?: (error: Error) => void;
}

const YodlPaymentButton: React.FC<YodlPaymentButtonProps> = ({
  amount,
  currency,
  orderId,
  buttonText = 'Pay with Yodl',
  productName = 'Product',
  ownerAddress,
  onSuccess,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected } = useAccount();

  // Handle payment request
  const handlePayment = async () => {
    setIsLoading(true);
    try {
      // Store additional order info before payment
      if (orderId) {
        YodlService.storeOrderInfo(orderId, {
          amount, 
          currency, 
          productName,
          ownerAddress,
          timestamp: new Date().toISOString()
        });
      }
      
      const response = await YodlService.requestPayment(amount, currency, orderId);
      
      if (response?.txHash && response?.chainId) {
        // Call success callback if provided
        if (onSuccess) {
          onSuccess(response.txHash, response.chainId);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      // Call error callback if provided
      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Yodl link with additional order metadata
  const directYodlLink = generateYodlLink(
    amount, 
    currency, 
    orderId, 
    false, // Never disconnect the wallet to use currently connected one
    { productName, ownerAddress } // Pass metadata for the transaction
  );

  // Log connection status for debugging
  console.log(`Wallet connection status for Yodl: isConnected=${isConnected}`);

  return (
    <div className="yodl-payment-button">
      {/* SDK Payment Button */}
      <button
        onClick={handlePayment}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mb-2 w-full"
      >
        {isLoading ? 'Processing...' : buttonText}
      </button>
      
      {/* Direct Link Alternative - with protocol */}
      <div className="mt-2 text-sm text-center">
        <a
          href={`https://${directYodlLink}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Or pay directly via Yodl
        </a>
      </div>
    </div>
  );
};

export default YodlPaymentButton; 