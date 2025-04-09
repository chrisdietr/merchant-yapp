import React, { useState } from "react";
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit';
import { useYodl } from '../contexts/YodlContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import ProductCard from "./ProductCard";
import shopConfig from "../config/shops.json";
import ThemeToggle from './ThemeToggle';
import { generateConfirmationUrl } from "@/utils/url";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
  inStock: boolean | string;
}

interface ShopConfig {
  shops: {
    name: string;
    telegramHandle?: string;
  }[];
  products: Product[];
}

const Home = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { createPayment, isInIframe } = useYodl();
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  
  // Detect if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const handleBuyNow = async (product: Product) => {
    console.log("[handleBuyNow] Clicked for:", product?.name);
    if (!product) {
      console.error("[handleBuyNow] Product data is missing.");
      return;
    }
    
    setIsProcessingPayment(product.id);
    console.log(`[handleBuyNow] Set processing state for ${product.id}`);

    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    console.log(`[handleBuyNow] Generated orderId: ${orderId}`);
    
    // For mobile devices, create a direct absolute URL with the origin
    const confirmationUrl = isMobile 
      ? `${window.location.origin}/confirmation?orderId=${orderId}`
      : generateConfirmationUrl(orderId);
    
    console.log(`[handleBuyNow] Confirmation URL: ${confirmationUrl}`);
    
    try {
      console.log("[handleBuyNow] Attempting to save to localStorage...");
      // For mobile, store more data directly in localStorage to avoid relying on postMessage
      const orderData = {
        name: product.name,
        price: product.price,
        currency: product.currency,
        emoji: product.emoji,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
      console.log(`[handleBuyNow] Stored details successfully for order ${orderId}`);
      
      // For mobile devices, create a backup of the order data with a timestamp to track it
      if (isMobile) {
        try {
          const mobileOrders = JSON.parse(localStorage.getItem('mobile_orders') || '{}');
          mobileOrders[orderId] = {
            ...orderData,
            createdAt: Date.now()
          };
          localStorage.setItem('mobile_orders', JSON.stringify(mobileOrders));
          console.log(`[handleBuyNow] Added order to mobile_orders tracking`);
        } catch (e) {
          console.error("[handleBuyNow] Failed to create mobile order backup:", e);
        }
      }
    } catch (e) {
      console.error("[handleBuyNow] Failed to save order details to localStorage", e);
      setIsProcessingPayment(null); // Reset loading state on error
      alert("Error preparing order. Please try again."); // User feedback
      return; 
    }
    
    try {
      console.log("[handleBuyNow] Attempting to call createPayment context function with:", {
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: orderId,
        redirectUrl: confirmationUrl
      });

      // For mobile devices, use a different approach
      if (isMobile) {
        console.log("[handleBuyNow] Mobile device detected, using mobile-specific flow");
        
        // Add the current window URL to sessionStorage for use after returning
        sessionStorage.setItem('previous_url', window.location.href);
        
        // Directly open the Yodl payment page in the current window for mobile
        // This is a critical change - we're removing the iframe approach on mobile
        try {
          const yodlDirectUrl = `https://yodl.me/checkout?recipient=${encodeURIComponent(
            product.currency === 'USD' ? 'merchantyapp.eth' : 'merchantyapp.eth'
          )}&amount=${product.price}&currency=${product.currency}&memo=${orderId}&redirectUrl=${encodeURIComponent(confirmationUrl)}`;
          
          console.log(`[handleBuyNow] Mobile direct payment URL: ${yodlDirectUrl}`);
          
          // Create a hidden form to post to Yodl (handles more reliably than direct navigation)
          const form = document.createElement('form');
          form.method = 'GET';
          form.action = 'https://yodl.me/checkout';
          form.style.display = 'none';
          
          const addField = (name: string, value: string) => {
            const field = document.createElement('input');
            field.type = 'hidden';
            field.name = name;
            field.value = value;
            form.appendChild(field);
          };
          
          addField('recipient', product.currency === 'USD' ? 'merchantyapp.eth' : 'merchantyapp.eth');
          addField('amount', product.price.toString());
          addField('currency', product.currency);
          addField('memo', orderId);
          addField('redirectUrl', confirmationUrl);
          
          document.body.appendChild(form);
          form.submit();
          
          // Set a backup timeout to redirect if the form submit doesn't work
          setTimeout(() => {
            window.location.href = yodlDirectUrl;
          }, 500);
          
          return; // Skip the rest of the flow for mobile
        } catch (e) {
          console.error("[handleBuyNow] Error with direct mobile navigation:", e);
          // Fall back to regular flow if this approach fails
        }
      }

      // Continue with regular flow (will only reach here if mobile direct approach failed or on desktop)
      const paymentResult = await createPayment({
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: orderId,
        metadata: {
          productId: product.id,
          productName: product.name,
          emoji: product.emoji
        },
        // Always use absolute URL for redirects
        redirectUrl: confirmationUrl
      });
      
      console.log('[handleBuyNow] createPayment call finished:', paymentResult);
      
      // If we get here and have a payment result with txHash, manually navigate to confirmation
      if (paymentResult?.txHash) {
        console.log('[handleBuyNow] Got immediate payment result with txHash:', paymentResult.txHash);
        
        // Store payment result in localStorage
        localStorage.setItem(`payment_${orderId}`, JSON.stringify({
          txHash: paymentResult.txHash,
          chainId: paymentResult.chainId
        }));
        
        // Navigate to confirmation page
        window.location.href = confirmationUrl;
      } else {
        console.log('[handleBuyNow] No immediate payment result, awaiting redirect or confirmation...');
        
        // For mobile, set up a periodic check for payment completion
        if (isMobile) {
          console.log("[handleBuyNow] Setting up mobile payment check interval");
          const intervalId = setInterval(() => {
            try {
              const storedPayment = localStorage.getItem(`payment_${orderId}`);
              if (storedPayment) {
                console.log("[handleBuyNow] Found payment in interval check, redirecting to confirmation");
                clearInterval(intervalId);
                window.location.href = confirmationUrl;
              }
            } catch (e) {
              console.error("[handleBuyNow] Error in mobile payment check interval:", e);
            }
          }, 2000); // Check every 2 seconds
          
          // Store the interval ID in session storage for cleanup
          sessionStorage.setItem('mobileCheckIntervalId', String(intervalId));
          
          // Also set a timeout to clear the interval after a reasonable time
          setTimeout(() => {
            clearInterval(intervalId);
            sessionStorage.removeItem('mobileCheckIntervalId');
          }, 120000); // Clear after 2 minutes
        }
      }
    } catch (error) {
      console.error('[handleBuyNow] Call to createPayment failed:', error);
      // Handle errors (e.g., user cancellation, timeout)
      if (error.message !== 'Payment was cancelled') {
        alert(`Payment failed: ${error.message}`); // User feedback
      }
      // Clear stored data if payment failed early
      localStorage.removeItem(orderId);
      setIsProcessingPayment(null); // Reset loading state on error
    }
  };

  const handleConnectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const { shops, products } = shopConfig as ShopConfig;
  const shop = shops[0];

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-purple-900 dark:via-indigo-900 dark:to-purple-800">
      <header className={`sticky top-0 z-10 w-full bg-background/95 dark:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b dark:border-purple-700/50 ${isInIframe ? 'py-2' : 'py-3'}`}>
        <div className="container mx-auto px-4 flex flex-wrap justify-between items-center sm:flex-nowrap">
          {/* Title Wrapper: Hide in iframe mode */}
          {!isInIframe && (
            <div className="w-full text-center order-1 sm:w-auto sm:text-left sm:order-none">
              <h1 className="text-xl sm:text-2xl font-bold truncate inline-block">{shop.name}</h1> 
            </div>
          )}
          {/* Button Group Wrapper: Full width in iframe mode */}
          <div className={`${isInIframe ? 'w-full' : 'w-full sm:w-auto'} flex justify-end order-2 sm:order-none`}>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <ConnectButton 
                chainStatus="none" 
                accountStatus="avatar"
              /> 
            </div>
          </div>
        </div>
      </header>

      {/* Further constrain max width */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-6 text-center sm:text-left">Products</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                description={product.description}
                price={product.price}
                currency={product.currency}
                emoji={product.emoji}
                inStock={product.inStock}
                onCheckout={handleBuyNow}
                isWalletConnected={isConnected}
                onConnectWallet={handleConnectWallet}
              />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Home;
