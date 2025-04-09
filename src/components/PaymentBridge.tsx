import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateConfirmationUrl } from '@/utils/url';

/**
 * This component acts as a global listener for payment completion signals.
 * It stores the result in localStorage and navigates to the confirmation page.
 */
const PaymentBridge: React.FC = () => {
  const navigate = useNavigate();
  // Use ref to ensure the navigate function used in the listener is up-to-date
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Filter for potential payment completion messages (more specific)
      if (event.data && typeof event.data === 'object' && 
          event.data.type === 'payment_complete' && 
          event.data.txHash && 
          (event.data.orderId || event.data.memo)) {
        
        const { txHash, chainId, orderId: messageOrderId, memo } = event.data;
        const orderId = messageOrderId || memo; // Prefer orderId, fallback to memo

        console.log(`PaymentBridge: Received payment_complete message for order ${orderId}:`, event.data);

        // --- Primary Action: Store result and Navigate --- 
        try {
          // 1. Store payment data in localStorage immediately
          localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
          console.log(`PaymentBridge: Stored payment for ${orderId} in localStorage.`);

          // 2. Check if already on the correct confirmation page
          const currentPath = window.location.pathname;
          const currentSearchParams = new URLSearchParams(window.location.search);
          const currentOrderId = currentSearchParams.get('orderId');

          if (currentPath.includes('/confirmation') && currentOrderId === orderId) {
            console.log('PaymentBridge: Already on the correct confirmation page. Refreshing data might be needed if state not updated.');
            // Optional: Force a re-render or state update if needed, though OrderConfirmation polling should handle it.
          } else {
            // 3. Navigate to the confirmation page
            const confirmationPath = `/confirmation?orderId=${orderId}`;
            console.log(`PaymentBridge: Navigating to confirmation page: ${confirmationPath}`);
            // Use replace to avoid adding the intermediate page to history
            navigateRef.current(confirmationPath, { replace: true }); 
          }
        } catch (e) {
          console.error("PaymentBridge: Error processing payment message:", e);
        }
      } else if (event.data && typeof event.data === 'object' && !event.data.target && event.data.txHash) {
         // Log other potential messages with txHash for debugging, but don't act on them unless type is 'payment_complete'
         console.log('PaymentBridge: Received message with txHash but type is not payment_complete:', event.data);
      }
    };

    console.log("PaymentBridge: Adding message listener.");
    window.addEventListener('message', handleMessage);

    // Cleanup
    return () => {
      console.log("PaymentBridge: Removing message listener.");
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Run only once on mount

  // This component does not render anything itself
  return null;
};

export default PaymentBridge; 