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
    }
  }, [isInIframe]);

  // Create a message to sign for verification
  const prepareOrderMessage = async (orderId: string) => {
    if (!address) {
      console.error('Cannot prepare order message: no wallet address available');
      return null;
    }

    console.log('Preparing order message to sign for:', orderId, 'with address:', address);
    
    // Create and store initial order info to prepare for signing
    const messageToSign = YodlService.createOrderSignMessage(orderId, amount, currency);
    
    // Store initial order info with the message
    const orderInfo = {
      orderId,
      amount,
      currency,
      timestamp: new Date().toISOString(),
      productName,
      ownerAddress,
      buyerAddress: address,
      messageToSign,
    };
    
    // Store order info
    YodlService.storeOrderInfo(orderId, orderInfo);
    
    return { messageToSign, orderInfo };
  };

  // Handle message signing for order verification
  const handleSignMessage = async (orderId: string) => {
    try {
      if (!address) {
        console.error('No wallet address available for message signing');
        return null;
      }
      
      // Get or create the message to sign
      const prepared = await prepareOrderMessage(orderId);
      if (!prepared || !prepared.messageToSign) {
        console.error('Failed to prepare message for signing');
        return null;
      }
      
      const { messageToSign } = prepared;
      console.log('Requesting wallet to sign message:', messageToSign);
      
      // Use wagmi to sign the message
      const signature = await signMessageAsync({
        message: messageToSign,
        account: address
      });
      
      console.log('Message signed successfully:', signature);
      
      // Update the order with the signature
      YodlService.updateOrderWithSignature(orderId, signature, messageToSign);
      
      return { signature, messageToSign };
    } catch (error) {
      console.error('Error signing message:', error);
      return null;
    }
  };

  // Handle payment via SDK
  const handlePayment = async () => {
    setLoading(true);
    try {
      console.log('Starting purchase process with address:', address);
      
      // First, prepare the order and get a signature
      let signatureResult = null;
      if (address) {
        // Sign the message BEFORE processing payment
        signatureResult = await handleSignMessage(uniqueOrderId);
        if (!signatureResult) {
          console.warn('Failed to sign verification message - continuing without verification');
        } else {
          console.log('Successfully signed verification message');
        }
      } else {
        console.warn('No wallet address available for message signing');
      }
      
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