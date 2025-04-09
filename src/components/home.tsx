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
  const { createPayment } = useYodl();
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);

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
    const confirmationUrl = `${window.location.origin}/confirmation?orderId=${orderId}`;
    
    try {
      console.log("[handleBuyNow] Attempting to save to localStorage...");
      localStorage.setItem(orderId, JSON.stringify({
        name: product.name,
        price: product.price,
        currency: product.currency,
        emoji: product.emoji
      }));
      console.log(`[handleBuyNow] Stored details successfully for order ${orderId}`);
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
      await createPayment({
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: orderId,
        metadata: {
          productId: product.id,
          productName: product.name,
        },
        redirectUrl: confirmationUrl
      });
      // If successful, redirect should occur. If it doesn't for some reason, 
      // the loading state might remain stuck. We could add a timeout reset.
      console.log('[handleBuyNow] createPayment call finished, awaiting redirect or confirmation...');
      // Example timeout reset if needed:
      // setTimeout(() => setIsProcessingPayment(null), 15000); 
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
      <header className="sticky top-0 z-10 w-full bg-background/95 dark:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b dark:border-purple-700/50">
        <div className="container mx-auto px-4 py-3 flex flex-wrap justify-between items-center sm:flex-nowrap">
          {/* Title Wrapper: Full width, centered text on mobile */}
          <div className="w-full text-center order-1 sm:w-auto sm:text-left sm:order-none">
            <h1 className="text-xl sm:text-2xl font-bold truncate inline-block">{shop.name}</h1> 
          </div>
          {/* Button Group Wrapper: Full width, right-aligned on mobile */}
          <div className="w-full flex justify-end order-2 sm:w-auto sm:order-none">
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
