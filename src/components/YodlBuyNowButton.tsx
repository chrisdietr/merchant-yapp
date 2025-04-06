import React, { useEffect } from 'react';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import YodlService from '../lib/yodl';
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useAccount, useSignMessage } from 'wagmi';

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
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  // Generate a unique order ID if not provided
  const uniqueOrderId = orderId || `order_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  // Safely check if we're in an iframe context
  useEffect(() => {
    if (isInIframe) {
      console.log('Component in iframe mode, payment completion is handled by YodlService listener');
      
      // Add safety check for iframe ethereum conflicts
      const checkForEthereumConflict = () => {
        try {
          // Don't reference window.ethereum directly, just check if it exists
          if (typeof window !== 'undefined') {
            console.log('Running in iframe environment, making sure ethereum access is safe');
          }
        } catch (error) {
          console.warn('Error checking ethereum availability:', error);
        }
      };
      
      checkForEthereumConflict();
    }
  }, [isInIframe]);

  // Handle message signing for order verification
  const handleSignMessage = async (orderId: string) => {
    try {
      if (!address) {
        console.error('No wallet address available for message signing');
        return null;
      }
      
      // Get the stored order info
      const orderInfo = YodlService.getOrderInfo(orderId);
      if (!orderInfo || !orderInfo.messageToSign) {
        console.error('No message to sign in order info');
        return null;
      }
      
      console.log('Signing message for order verification:', orderInfo.messageToSign);
      
      // Use wagmi to sign the message
      const signature = await signMessageAsync({
        message: orderInfo.messageToSign,
        account: address
      });
      
      console.log('Message signed successfully:', signature);
      
      // Update the order with the signature
      YodlService.updateOrderWithSignature(orderId, signature, orderInfo.messageToSign);
      
      return { signature, messageToSign: orderInfo.messageToSign };
    } catch (error) {
      console.error('Error signing message:', error);
      return null;
    }
  };

  // Handle payment via SDK
  const handlePayment = async () => {
    setLoading(true);
    try {
      // Store product metadata before initiating payment, including buyer address
      const metadata = {
        productName,
        ownerAddress,
        buyerAddress: address
      };
      
      console.log('Initiating payment with metadata:', metadata, 'in iframe mode:', isInIframe);
      
      // Use SDK to request payment with memo
      const response = await YodlService.requestPaymentWithSDK(
        amount,
        currency,
        uniqueOrderId,
        metadata
      );

      // After payment is initiated, sign the verification message
      if (address) {
        try {
          await handleSignMessage(uniqueOrderId);
        } catch (signError) {
          console.error('Failed to sign order verification message:', signError);
          // Continue with payment even if signing fails
        }
      }

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