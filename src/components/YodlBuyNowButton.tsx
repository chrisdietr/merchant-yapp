import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { getAddress } from 'viem';
import yodlService from '@/lib/yodl';
import { useNavigate } from 'react-router-dom';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import shopsData from "@/config/shops.json";
import { Loader2 } from 'lucide-react';

// Props interface for the component
export interface YodlBuyNowButtonProps {
  amount: number;
  currency: FiatCurrency;
  productId?: string;
  productName?: string;
  ownerAddress?: string;
}

// Main YodlBuyNowButton component
export const YodlBuyNowButton = ({
  amount,
  currency,
  productId,
  productName,
  ownerAddress
}: YodlBuyNowButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [paymentRequested, setPaymentRequested] = useState(false);
  const { address: userAddress, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const navigate = useNavigate();

  // Handle buy button click
  const handleBuyClick = useCallback(async () => {
    // Continue with payment if wallet is connected
    if (userAddress && isConnected && walletClient) {
      await handlePaymentRequest();
    } 
    // Otherwise the connect button will handle wallet connection
  }, [userAddress, isConnected, walletClient, amount, currency, productId, productName, ownerAddress]);

  // Handle payment request
  const handlePaymentRequest = async () => {
    if (!userAddress || !isConnected) {
      console.error('No wallet connected');
      return;
    }

    try {
      setLoading(true);
      setPaymentRequested(true);
      
      // Prepare order ID - product orders are in format product_ID_TIMESTAMP
      const timestamp = Date.now();
      let orderId = `order_${timestamp}`;
      
      // If we have a product ID, use it in the order ID
      if (productId) {
        orderId = `product_${productId}_${timestamp}`;
      }
      
      console.log(`Creating order ${orderId} for ${amount} ${currency}`);

      // Store order info in localStorage before payment
      const initialOrderInfo = {
        orderId,
        status: 'pending' as const,
        amount,
        currency,
        productId,
        productName,
        ownerAddress,
        timestamp: new Date().toISOString(),
      };
      
      // Store the initial order info
      yodlService.storeOrderInfo(orderId, initialOrderInfo);
      
      // Now request payment with the SDK
      const requestResponse = await yodlService.requestPaymentWithSDK(
        amount,
        currency,
        orderId,
        {
          productName,
          ownerAddress,
          buyerAddress: userAddress
        }
      );
      
      console.log('Payment request response:', requestResponse);
      
      // If we're in iframe mode and have a response with txHash, navigate to confirmation
      if (yodlService.isInIframe() && requestResponse && requestResponse.txHash) {
        navigate(`/confirmation/${orderId}?txHash=${requestResponse.txHash}&chainId=${requestResponse.chainId}`);
      }
      // SDK will handle redirects in non-iframe mode
    } catch (error) {
      console.error('Error during payment process:', error);
      alert(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLoading(false);
    }
  };

  // Display loading state during payment process
  const renderButton = () => {
    // Check if the yodlService is available
    if (!yodlService) {
      return (
        <Button disabled className="w-full">
          Loading...
        </Button>
      );
    }
    
    if (loading) {
      return (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing Payment...
        </Button>
      );
    }
    
    if (!isConnected) {
      return (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <Button 
              onClick={() => {
                openConnectModal();
                // After wallet is connected, handleBuyClick will be triggered via useEffect
              }}
              className="w-full"
            >
              Connect Wallet to Buy ({amount} {currency})
            </Button>
          )}
        </ConnectButton.Custom>
      );
    }
    
    return (
      <Button
        onClick={handleBuyClick}
        className="w-full"
      >
        Buy Now for {amount} {currency}
      </Button>
    );
  };

  // When wallet connects, try to initiate payment
  useEffect(() => {
    if (isConnected && userAddress && walletClient && !loading && !paymentRequested) {
      handleBuyClick();
    }
  }, [isConnected, userAddress, walletClient, handleBuyClick, loading, paymentRequested]);

  return renderButton();
};

export default YodlBuyNowButton; 