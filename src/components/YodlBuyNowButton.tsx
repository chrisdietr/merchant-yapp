import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { WalletSelectorButton } from './WalletSelector';
import { useWalletClient, usePublicClient, useAccount } from 'wagmi';
import { getAddress } from 'viem';
import yodlService from '@/lib/yodl';
import { useNavigate } from 'react-router-dom';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import shopsData from "@/config/shops.json";
import Skeleton from 'react-loading-skeleton';
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

  // Check Yodl SDK initialization status
  const isYodlReady = yodlService.isInitialized();

  // Handle buy button click
  const handleBuyClick = useCallback(async () => {
    // Continue with payment if wallet is connected
    if (userAddress && isConnected && walletClient) {
      await handlePaymentRequest();
    } 
    // Don't do anything here - WalletSelectorButton will handle the wallet connection process
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
        status: 'pending',
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
      const requestResponse = await yodlService.requestPaymentWithSDK({
        orderId,
        amount,
        currency,
      });
      
      console.log('Payment request response:', requestResponse);
      
      // If payment is successful, redirect to confirmation page
      if (requestResponse && requestResponse.success) {
        // Redirect to confirmation page
        navigate(`/confirmation/${orderId}`);
      } else {
        console.error('Payment request failed');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error during payment process:', error);
      setLoading(false);
    }
  };

  // Display loading state during payment process
  const renderButton = () => {
    if (!isYodlReady) {
      return <Skeleton height={40} />;
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
        <WalletSelectorButton fullWidth onConnect={handleBuyClick}>
          Buy Now for {amount} {currency}
        </WalletSelectorButton>
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

  return renderButton();
};

export default YodlBuyNowButton; 