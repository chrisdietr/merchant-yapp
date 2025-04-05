import React, { useState } from 'react';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import yodlService from '../lib/yodl';
import { FiatCurrency } from '@yodlpay/yapp-sdk';

interface YodlBuyNowButtonProps {
  productId: string;
  productName: string;
  price: number;
  isInCart?: boolean;
  ownerAddress?: string;
}

const YodlBuyNowButton: React.FC<YodlBuyNowButtonProps> = ({
  productId,
  productName,
  price,
  isInCart = false,
  ownerAddress = '',
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Check if we're in iframe mode
  const isInIframe = yodlService.isInIframe();

  const handlePayment = async (event: React.MouseEvent<HTMLButtonElement>) => {
    // If we're in an iframe, prevent default behavior to avoid navigation issues
    if (isInIframe) {
      event.preventDefault();
    }
    
    try {
      setIsLoading(true);
      console.log(`Initiating payment with product name: ${productName}`);
      
      // Log iframe status for debugging
      console.log(`Operating in iframe mode: ${isInIframe}`);
      
      // Create a unique order ID
      const orderId = `product_${productId}_${Date.now()}`;
      
      // Request payment through Yodl service with product metadata
      await yodlService.requestPaymentWithSDK(price, 'USD' as FiatCurrency, orderId, {
        productName,
        ownerAddress
      });
      
      // Yodl SDK will handle the payment flow or redirect
      // We only reach here if the payment was initiated successfully
      
      // If we're in iframe, toast notification in current context rather than redirecting
      if (isInIframe) {
        toast({
          title: "Payment Requested",
          description: "Payment processing has started. Please check your wallet.",
        });
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      className="w-full"
      onClick={handlePayment}
      disabled={isLoading}
    >
      {isLoading ? 'Processing...' : isInCart ? 'Checkout' : 'Buy Now'}
    </Button>
  );
};

export default YodlBuyNowButton; 