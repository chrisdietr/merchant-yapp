import React, { useContext, useState, useEffect } from "react";
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton, useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useYodl } from '../contexts/YodlContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import ProductCard from "./ProductCard";
import { shopConfig, Product, adminConfig } from "../config/config";
import ThemeToggle from './ThemeToggle';
import { generateConfirmationUrl } from "@/utils/url";
import CheckoutModal from "./CheckoutModal";
import { useToast } from "./ui/use-toast";
import useDeviceDetection from "../hooks/useMediaQuery";

const Home = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { createPayment, isInIframe } = useYodl();
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  // Use our media query-based detection instead
  const { isMobile, isTouch } = useDeviceDetection();

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
    const confirmationUrl = generateConfirmationUrl(orderId);
    
    try {
      console.log("[handleBuyNow] Attempting to save to localStorage...");
      localStorage.setItem(orderId, JSON.stringify({
        name: product.name,
        price: product.price,
        currency: product.currency,
        emoji: product.emoji,
        timestamp: new Date().toISOString()
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

      // In iframe mode, send a message to parent window about the order
      if (isInIframe) {
        try {
          window.parent.postMessage({
            type: 'order_started',
            orderId: orderId,
            product: {
              name: product.name,
              price: product.price,
              currency: product.currency
            }
          }, '*');
          
          console.log("[handleBuyNow] Notified parent window about order start");
        } catch (e) {
          console.error("[handleBuyNow] Error notifying parent window:", e);
        }
      }

      // Set a timeout to check for iframes and handle them if they're created
      setTimeout(() => {
        try {
          // Find any new iframes created by Yodl
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            if (iframe.src && iframe.src.includes('yodl.me')) {
              console.log("[handleBuyNow] Found Yodl iframe, ensuring it's usable on mobile/tablet:", iframe.src);
              
              // Add necessary styles for mobile/tablet
              iframe.style.pointerEvents = 'auto';
              iframe.style.touchAction = 'auto';
              iframe.style.zIndex = '10';
              
              // For mobile devices, make sure iframe is absolutely visible
              if (isMobile || isTouch) {
                iframe.style.position = 'fixed';
                iframe.style.top = '0';
                iframe.style.left = '0';
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.backgroundColor = '#ffffff';
              }
              
              // Ensure parent container has proper scrolling
              const parent = iframe.parentElement;
              if (parent) {
                parent.setAttribute('style', '-webkit-overflow-scrolling: touch; overflow: auto;');
                parent.classList.add('iframe-container');
              }
            }
          });
        } catch (e) {
          console.error("[handleBuyNow] Error handling iframes:", e);
        }
      }, 1000); // 1 second delay to allow iframe creation

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
        
        // In iframe mode, notify parent about completion
        if (isInIframe) {
          try {
            window.parent.postMessage({
              type: 'payment_complete',
              txHash: paymentResult.txHash,
              chainId: paymentResult.chainId,
              orderId: orderId
            }, '*');
            console.log("[handleBuyNow] Notified parent window about payment completion");
          } catch (e) {
            console.error("[handleBuyNow] Error notifying parent window about completion:", e);
          }
        }

        // Navigate to confirmation page
        console.log('[handleBuyNow] Navigating to confirmation URL:', confirmationUrl);
        window.location.href = confirmationUrl;
      } else {
        console.log('[handleBuyNow] No immediate payment result, awaiting redirect or confirmation...');
        // For redirect flow, the page will be redirected by the SDK
        setIsProcessingPayment(null);
      }
    } catch (error) {
      console.error('[handleBuyNow] Call to createPayment failed:', error);
      // Handle errors (e.g., user cancellation, timeout)
      if (error && typeof error === 'object' && 'message' in error && error.message !== 'Payment was cancelled') {
        alert(`Payment failed: ${error.message}`); // User feedback
      }
      // Clear stored data if payment failed early
      localStorage.removeItem(orderId); // Remove order details
      localStorage.removeItem(`payment_${orderId}`); // Ensure payment details are cleared too
      setIsProcessingPayment(null); // Reset loading state on error
    }
  };

  const handleConnectWallet = () => {
    if (openConnectModal) {
      openConnectModal();
    }
  };

  const handleDisconnectWallet = () => {
    if (openAccountModal) {
      openAccountModal();
    }
  };

  const handleOpenCheckoutModal = (product: Product) => {
    if (product && product.id) {
      setSelectedProduct(product);
      setIsCheckoutModalOpen(true);
    } else {
      console.error("Attempted to open checkout modal with invalid product:", product);
      toast({ title: "Error", description: "Cannot select this product.", variant: "destructive" });
    }
  };

  const handleCloseCheckoutModal = () => {
    setIsCheckoutModalOpen(false);
    setSelectedProduct(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col min-h-screen">
      <header className={`sticky top-0 z-10 w-full bg-background/95 dark:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b dark:border-purple-700/50 ${isInIframe ? 'py-2' : 'py-3'}`}>
        <div className="container mx-auto px-4 flex flex-wrap justify-between items-center sm:flex-nowrap">
          {!isInIframe && (
            <div className="w-full text-center order-1 sm:w-auto sm:text-left sm:order-none">
              <h1 className="text-xl sm:text-2xl font-bold truncate inline-block">{shopConfig.shops[0].name}</h1> 
            </div>
          )}
          <div className={`${isInIframe ? 'w-full' : 'w-full sm:w-auto'} flex justify-end order-2 sm:order-none`}>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              {isConnected ? (
                <div 
                  className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                  onClick={() => disconnect()}
                > 
                  <Wallet size={16} />
                  <span className="text-sm font-medium">{address?.substring(0, 6)}...{address?.substring(address.length - 4)}</span>
                </div>
              ) : (
                <Button onClick={handleConnectWallet}>Connect Wallet</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section>
          <h2 className="text-3xl font-bold mb-6 text-center sm:text-left">Products</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {shopConfig.products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                description={product.description}
                price={product.price}
                currency={product.currency}
                emoji={product.emoji}
                inStock={product.inStock}
                onCheckout={handleOpenCheckoutModal}
                isWalletConnected={isConnected}
                onConnectWallet={handleConnectWallet}
              />
            ))}
          </div>
        </section>
      </main>

      {selectedProduct && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={handleCloseCheckoutModal}
          product={selectedProduct}
        />
      )}
    </div>
  );
};

export default Home;
