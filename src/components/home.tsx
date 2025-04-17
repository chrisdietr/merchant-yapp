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
import PurchaseHistory from './PurchaseHistory';
import AdminTransactionHistory from './AdminTransactionHistory';

const Home = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { createPayment, isInIframe, merchantAddress } = useYodl();
  const [isProcessingPayment, setIsProcessingPayment] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { toast } = useToast();
  
  // Use our media query-based detection instead
  const { isMobile, isTouch } = useDeviceDetection();

  // Determine if admin mode is active
  const isAdmin = address && merchantAddress && address.toLowerCase() === merchantAddress.toLowerCase();

  // NEW handler called by CheckoutModal
  const handleInitiateCheckout = async (product: Product, buyerName: string) => {
    console.log("[handleInitiateCheckout] Received:", { product, buyerName });
    if (!product || !buyerName) {
      console.error("[handleInitiateCheckout] Missing product or buyerName.");
      toast({ title: "Error", description: "Missing required checkout information.", variant: "destructive" });
      return;
    }
    
    setIsProcessingPayment(product.id);
    handleCloseCheckoutModal(); // Close modal after getting info
    console.log(`[handleInitiateCheckout] Set processing state for ${product.id}`);

    // --- Memo and Order ID Generation ---
    const orderId = Math.random().toString(16).substring(2, 10); // 8 hex chars for unique ID
    const productNameShort = product.name?.substring(0, 10).replace(/\s+/g, '_') || 'product'; // Max 10 chars
    const buyerNameClean = buyerName.substring(0, 8).replace(/[^a-zA-Z0-9_-]/g, ''); // Max 8 chars, simple clean
    const memo = `${productNameShort}_for_${buyerNameClean}_${orderId}`.substring(0, 31); // Construct and truncate memo
    console.log(`[handleInitiateCheckout] Generated orderId: ${orderId}`);
    console.log(`[handleInitiateCheckout] Generated memo: ${memo} (Length: ${memo.length})`);

    const confirmationUrl = generateConfirmationUrl(orderId);
    
    // Store order details using the generated orderId
    try {
      console.log("[handleInitiateCheckout] Attempting to save to localStorage...");
      localStorage.setItem(orderId, JSON.stringify({
        name: product.name,
        price: product.price,
        currency: product.currency,
        emoji: product.emoji,
        timestamp: new Date().toISOString(),
        buyerName: buyerNameClean, // Optionally store cleaned buyer name
      }));
      console.log(`[handleInitiateCheckout] Stored details successfully for order ${orderId}`);
    } catch (e) {
      console.error("[handleInitiateCheckout] Failed to save order details to localStorage", e);
      setIsProcessingPayment(null);
      toast({ title: "Error", description: "Could not save order details. Please try again.", variant: "destructive" });
      return; 
    }
    
    // --- Call createPayment --- 
    try {
      console.log("[handleInitiateCheckout] Attempting to call createPayment context function with:", {
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: orderId, // Use generated short ID for tracking
        memo: memo, // Use the constructed memo for on-chain data
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
          
          console.log("[handleInitiateCheckout] Notified parent window about order start");
        } catch (e) {
          console.error("[handleInitiateCheckout] Error notifying parent window:", e);
        }
      }

      // Set a timeout to check for iframes and handle them if they're created
      setTimeout(() => {
        try {
          // Find any new iframes created by Yodl
          const iframes = document.querySelectorAll('iframe');
          iframes.forEach(iframe => {
            if (iframe.src && iframe.src.includes('yodl.me')) {
              console.log("[handleInitiateCheckout] Found Yodl iframe, ensuring it's usable on mobile/tablet:", iframe.src);
              
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
          console.error("[handleInitiateCheckout] Error handling iframes:", e);
        }
      }, 1000); // 1 second delay to allow iframe creation

      const paymentResult = await createPayment({
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: orderId, // Pass the short ID for tracking
        memo: memo, // Pass the constructed memo
        metadata: {
          productId: product.id,
          productName: product.name,
          emoji: product.emoji,
          buyerName: buyerNameClean, // Include buyer name in metadata too
        },
        redirectUrl: confirmationUrl
      });
      
      console.log('[handleInitiateCheckout] createPayment call finished:', paymentResult);
      
      // If immediate result, store payment with orderId
      if (paymentResult?.txHash) {
        localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash: paymentResult.txHash, chainId: paymentResult.chainId }));
        // In iframe mode, notify parent about completion
        if (isInIframe) {
          try {
            window.parent.postMessage({
              type: 'payment_complete',
              txHash: paymentResult.txHash,
              chainId: paymentResult.chainId,
              orderId: orderId
            }, '*');
            console.log("[handleInitiateCheckout] Notified parent window about payment completion");
          } catch (e) {
            console.error("[handleInitiateCheckout] Error notifying parent window about completion:", e);
          }
        }
        window.location.href = confirmationUrl; // Navigate
      } else {
        setIsProcessingPayment(null); // Await redirect or further action
      }
    } catch (error) {
      console.error('[handleInitiateCheckout] Call to createPayment failed:', error);
      if (error && typeof error === 'object' && 'message' in error && error.message !== 'Payment was cancelled') {
         toast({ title: "Payment Error", description: String(error.message), variant: "destructive" });
       }
      localStorage.removeItem(orderId);
      localStorage.removeItem(`payment_${orderId}`);
      setIsProcessingPayment(null);
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
      <header className={`sticky top-0 z-10 w-full bg-background/95 dark:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b dark:border-purple-700/50 ${isInIframe ? 'py-2' : 'py-2 sm:py-3'}`}>
        <div className="container mx-auto px-3 sm:px-4 flex flex-wrap justify-between items-center sm:flex-nowrap">
          {!isInIframe && (
            <div className="w-full text-center order-1 sm:w-auto sm:text-left sm:order-none">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate inline-block">{shopConfig.shops[0].name}</h1> 
            </div>
          )}
          <div className={`${isInIframe ? 'w-full' : 'w-full sm:w-auto'} flex justify-end order-2 sm:order-none`}>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              {isConnected ? (
                <div 
                  className="flex items-center gap-1 sm:gap-2 p-1.5 sm:p-2 bg-gray-100 dark:bg-gray-800 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" 
                  onClick={handleDisconnectWallet}
                > 
                  <Wallet size={isMobile ? 14 : 16} />
                  <span className="text-xs sm:text-sm font-medium">{address?.substring(0, 6)}...{address?.substring(address.length - 4)}</span>
                </div>
              ) : (
                <Button onClick={handleConnectWallet} size={isMobile ? "sm" : "default"}>Connect Wallet</Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow pt-8 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Products</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {shopConfig.products.map((product) => (
              <ProductCard
                key={product.id}
              id={product.id || `prod_${Math.random()}`}
              name={product.name || 'Unknown Product'}
              description={product.description || ''}
              price={product.price || 0}
              currency={product.currency || 'USD'}
              emoji={product.emoji || '🛒'}
              inStock={product.inStock !== undefined ? product.inStock : true}
              onCheckout={() => handleOpenCheckoutModal(product)}
                isWalletConnected={isConnected}
                onConnectWallet={handleConnectWallet}
              />
            ))}
          </div>

        {/* Section for Connect Wallet Prompt - MOVED HERE */}
        {!isConnected && (
          <div className="mt-12 text-center p-8 bg-card border rounded-lg shadow-sm max-w-md mx-auto flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-3">Welcome to {shopConfig.shops[0].name}</h2>
            <p className="text-muted-foreground mb-6">Connect your wallet to view your purchase history or make a purchase.</p>
            <ConnectButton 
              label="Connect Wallet"
              showBalance={false} 
              chainStatus="none"
            />
          </div>
        )}

        {/* Section for Purchase History (conditional based on connection and admin status) */} 
        {isConnected && !isAdmin && (
          <div className="mt-12">
            <PurchaseHistory />
          </div>
        )}
        {isConnected && isAdmin && (
          <div className="mt-12">
            <AdminTransactionHistory />
          </div>
        )}
      </main>

      {selectedProduct && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={handleCloseCheckoutModal}
          product={selectedProduct}
          onInitiateCheckout={handleInitiateCheckout}
        />
      )}
    </div>
  );
};

export default Home;
