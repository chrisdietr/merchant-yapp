import React from 'react';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import YodlService from '../lib/yodl';
import { Button } from "@/components/ui/button";

interface YodlBuyNowButtonProps {
  amount: number;
  currency: FiatCurrency;
  buttonText?: string;
  buttonClassName?: string;
  orderId?: string;
  productName?: string;
  ownerAddress?: string;
}

const YodlBuyNowButton: React.FC<YodlBuyNowButtonProps> = ({
  amount,
  currency,
  buttonText = 'Buy Now',
  buttonClassName,
  orderId,
  productName,
  ownerAddress,
}) => {
  const [loading, setLoading] = React.useState(false);
  const isInIframe = YodlService.isInIframe();

  // Generate a unique order ID if not provided
  const uniqueOrderId = orderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Handle direct SDK payment (for iframe context)
  const handleDirectPayment = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setLoading(true);
    try {
      // Store product metadata
      YodlService.storeOrderInfo(uniqueOrderId, {
        amount,
        currency,
        productName,
        ownerAddress,
        timestamp: new Date().toISOString()
      });
      
      console.log('Initiating direct iframe payment for:', productName);
      
      // Use the SDK's requestPayment method without redirectUrl for iframe contexts
      await YodlService.requestPayment(
        amount, 
        currency,
        uniqueOrderId
      );
    } catch (error) {
      console.error('Direct payment failed:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle standard payment via SDK (for non-iframe context)
  const handleStandardPayment = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      // Store product metadata before initiating payment
      YodlService.storeOrderInfo(uniqueOrderId, {
        amount,
        currency,
        productName,
        ownerAddress,
        timestamp: new Date().toISOString()
      });
      
      console.log('Initiating standard payment for:', productName);
      
      // Use SDK to request payment with memo
      await YodlService.requestPaymentWithSDK(
        amount,
        currency,
        uniqueOrderId,
        { productName, ownerAddress }
      );
    } catch (error) {
      console.error('Payment failed:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Choose the appropriate handler based on whether we're in an iframe
  const handlePayment = isInIframe ? handleDirectPayment : handleStandardPayment;
  
  // Use the UI Button component from the app's library
  return (
    <Button 
      onClick={handlePayment}
      className={buttonClassName}
      disabled={loading}
    >
      {loading ? 'Processing...' : buttonText}
    </Button>
  );
};

export default YodlBuyNowButton; 