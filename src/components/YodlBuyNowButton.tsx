import React, { useEffect } from 'react';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import YodlService from '../lib/yodl';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const isInIframe = YodlService.isInIframe();

  // Generate a unique order ID if not provided
  const uniqueOrderId = orderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Set up payment listener for iframe mode
  useEffect(() => {
    if (isInIframe) {
      // This is now handled globally in the YodlService
      console.log('Component in iframe mode, payment completion is handled by YodlService listener');
    }
  }, [isInIframe]);

  // Handle payment via SDK
  const handlePayment = async () => {
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
      
      console.log('Initiating payment with product name:', productName, 'in iframe mode:', isInIframe);
      
      // Use SDK to request payment with memo
      const response = await YodlService.requestPaymentWithSDK(
        amount,
        currency,
        uniqueOrderId,
        { productName, ownerAddress } // Pass metadata directly
      );

      // In non-iframe mode, the SDK will handle redirects
      // In iframe mode, we might receive a response directly
      if (isInIframe && response && response.txHash) {
        console.log('Payment completed in iframe with txHash:', response.txHash);
        
        // Optionally navigate to confirmation page
        navigate(`/confirmation/${uniqueOrderId}?txHash=${response.txHash}&chainId=${response.chainId}`);
      }
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