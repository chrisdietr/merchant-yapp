import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateConfirmationUrl } from '@/utils/url';

/**
 * This component acts as a bridge between the Yodl iframe and parent application.
 * It listens for payment completion messages from the iframe and redirects to the confirmation page.
 */
const PaymentBridge: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only process messages that might be payment-related
      // Ignore wallet provider messages (MetaMask, Rabby, etc.)
      if (event.data && typeof event.data === 'object' && 
          !event.data.target && // Wallet messages typically have a target property
          (event.data.type === 'payment_complete' || event.data.txHash)) {
        
        console.log('PaymentBridge received payment-related message:', event.origin, event.data);

        // Handle payment completion messages
        if (event.data.type === 'payment_complete' && event.data.txHash && event.data.orderId) {
          console.log('PaymentBridge: Payment completion detected', event.data);
          
          // Store payment data in localStorage for the confirmation page
          const { txHash, chainId, orderId } = event.data;
          localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
          
          // Navigate to confirmation page
          const confirmationUrl = generateConfirmationUrl(orderId);
          navigate(confirmationUrl);
        }
      }
    };

    // Add listener
    window.addEventListener('message', handleMessage);
    
    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  // This is a utility component - it doesn't render anything
  return null;
};

export default PaymentBridge; 