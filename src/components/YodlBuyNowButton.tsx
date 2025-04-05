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
  
  // Handle payment via SDK
  const handlePayment = async (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent default behavior to avoid any unwanted navigation
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
      
      console.log('Initiating payment with product name:', productName);
      console.log('Operating in iframe mode:', isInIframe);
      
      // Use SDK to request payment with memo
      await YodlService.requestPaymentWithSDK(
        amount,
        currency,
        uniqueOrderId,
        { productName, ownerAddress } // Pass metadata directly
      );
      // Note: We don't need to handle the response here as the SDK 
      // will redirect to the specified redirectUrl after payment
    } catch (error) {
      console.error('Payment failed:', error);
      // Show error to user
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

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