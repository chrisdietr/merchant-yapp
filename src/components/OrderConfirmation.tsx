import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useYodl } from "../contexts/YodlContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Home, Loader2, ExternalLink, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import shopConfig from "../config/shops.json";
import ThemeToggle from "./ThemeToggle";
import { generateConfirmationUrl } from "@/utils/url";

interface PaymentResult {
  txHash?: string | null; 
  chainId?: number | undefined;
}

interface OrderDetails {
  name: string;
  price: number;
  currency: string;
  emoji: string;
  timestamp: string; // Add timestamp
}

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const { yodl, merchantAddress, merchantEns, isInIframe, parsePaymentFromUrl } = useYodl(); 
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showQrCode, setShowQrCode] = useState(false);
  const orderId = searchParams.get("orderId");
  const shop = shopConfig.shops[0];
  const shopTelegramHandle = shop?.telegramHandle;

  // Helper function to clean payment parameters from URL
  const cleanPaymentUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('txHash');
    url.searchParams.delete('chainId');
    window.history.replaceState({}, document.title, url.toString());
  };

  // More permissive postMessage listener that logs only relevant payment messages
  useEffect(() => {
    console.log("Setting up message listener for payment completion");
    
    const handleMessage = (event: MessageEvent) => {
      // Only process messages that might be payment-related
      // Ignore wallet provider messages (MetaMask, Rabby, etc.)
      if (event.data && typeof event.data === 'object' && 
          !event.data.target && // Wallet messages typically have a target property
          (event.data.type === 'payment_complete' || event.data.txHash)) {
        
        console.log("Received payment-related message:", event.origin, event.data);
        
        // Accept messages from any origin for maximum compatibility
        if (event.data.type === 'payment_complete' || 
            (event.data.txHash && (event.data.orderId || event.data.memo))) {
          console.log("Payment completion message detected:", event.data);
          
          // Extract data regardless of format
          const txHash = event.data.txHash;
          const chainId = event.data.chainId;
          const messageOrderId = event.data.orderId || event.data.memo;
          
          // If we have transaction data and it matches our order (or we don't have an orderId to match)
          if (txHash && (!orderId || messageOrderId === orderId || !messageOrderId)) {
            console.log("Setting payment result from message:", { txHash, chainId });
            setPaymentResult({ txHash, chainId });
            
            // Store in localStorage for persistence
            if (orderId) {
              localStorage.setItem(`payment_${orderId}`, JSON.stringify({ txHash, chainId }));
            }
            
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [orderId]);

  // Iframe specific handler - detect when an iframe element becomes available and add listeners
  useEffect(() => {
    if (isInIframe || !orderId) return; // Only run in parent window and if we have an orderId
    
    // This function will look for and attach a load event to any Yodl iframe that appears in the DOM
    const checkForYodlIframe = () => {
      const iframes = document.querySelectorAll('iframe');
      
      iframes.forEach(iframe => {
        if (iframe.src && iframe.src.includes('yodl.me')) {
          console.log("Found Yodl iframe, attaching load listener:", iframe.src);
          
          // Only attach load event if not already attached
          if (!iframe.dataset.listenerAttached) {
            iframe.dataset.listenerAttached = 'true';
            
            iframe.addEventListener('load', () => {
              console.log("Yodl iframe loaded, sending message listener to content window");
              
              // Try to attach a message listener to detect when "Done" is clicked
              try {
                // Send a message to the iframe to signal that we want to listen for payment completion
                iframe.contentWindow?.postMessage({
                  type: 'parent_listening',
                  orderId: orderId
                }, '*');
              } catch (e) {
                console.error("Error communicating with Yodl iframe:", e);
              }
            });
          }
        }
      });
    };
    
    // Set up a mutation observer to detect when iframes are added to the DOM
    const observer = new MutationObserver((mutations) => {
      checkForYodlIframe();
    });
    
    // Start observing
    observer.observe(document.body, { 
      childList: true,
      subtree: true 
    });
    
    // Initial check for existing iframes
    checkForYodlIframe();
    
    return () => {
      observer.disconnect();
    };
  }, [isInIframe, orderId]);

  // Periodically check for payment completion in localStorage
  useEffect(() => {
    if (!orderId || paymentResult) return; // Skip if no orderId or already have result
    
    console.log("Setting up periodic check for payment result");
    
    const checkInterval = setInterval(() => {
      try {
        const storedPaymentResult = localStorage.getItem(`payment_${orderId}`);
        if (storedPaymentResult) {
          const parsedResult = JSON.parse(storedPaymentResult);
          if (parsedResult.txHash) {
            console.log("Found payment result in localStorage during periodic check:", parsedResult);
            setPaymentResult(parsedResult);
            setIsLoading(false);
            clearInterval(checkInterval);
          }
        }
      } catch (e) {
        console.error("Error checking for payment result:", e);
      }
    }, 1000); // Check every second
    
    return () => clearInterval(checkInterval);
  }, [orderId, paymentResult]);

  // Main data loading effect 
  useEffect(() => {
    console.log("Confirmation Page - Raw URL Search Params:", window.location.search);
    
    // Try to parse payment information from URL (for redirect flow)
    const result = parsePaymentFromUrl();
    console.log("Confirmation Page - Parsed URL Result:", JSON.stringify(result));

    let loadedOrderDetails: Partial<OrderDetails> | null = null;
    let loadedPaymentResult: PaymentResult | null = null;
    
    if (orderId) {
      try {
        // Look for order details in localStorage using the orderId both with and without prefix
        const storedDetails = localStorage.getItem(`order_${orderId}`) || localStorage.getItem(orderId);
        const storedPaymentResult = localStorage.getItem(`payment_${orderId}`);
        
        if (storedDetails) {
          loadedOrderDetails = JSON.parse(storedDetails);
          console.log("Confirmation Page - Loaded Stored Order Details:", loadedOrderDetails);
        }
        
        if (storedPaymentResult) {
          loadedPaymentResult = JSON.parse(storedPaymentResult);
          console.log("Confirmation Page - Loaded Stored Payment Result:", loadedPaymentResult);
        }
      } catch (e) {
        console.error("Failed to load data from localStorage", e);
      }
    }

    // Check specifically for txHash presence in URL first, then fallback to stored result
    if (result && result.txHash) {
      console.log(`Confirmation Page - Found txHash: ${result.txHash}, chainId: ${result.chainId}`);
      setPaymentResult(result);
      
      // Store payment result in localStorage
      if (orderId) {
        localStorage.setItem(`payment_${orderId}`, JSON.stringify(result));
      }
      
      cleanPaymentUrl(); // Clean URL only after confirming txHash
      setOrderDetails({
        ...(loadedOrderDetails || {}),
        timestamp: format(new Date(), 'PPP p'),
      } as OrderDetails);
      
      // Make sure to store order details with the updated timestamp
      if (orderId && loadedOrderDetails) {
        localStorage.setItem(`order_${orderId}`, JSON.stringify({
          ...(loadedOrderDetails || {}),
          timestamp: format(new Date(), 'PPP p'),
        }));
      }
    } else if (loadedPaymentResult && loadedPaymentResult.txHash) {
      // Fallback to stored payment result if URL doesn't have transaction data
      console.log("Confirmation Page - Using stored payment result:", loadedPaymentResult);
      setPaymentResult(loadedPaymentResult);
      
      if (loadedOrderDetails) {
        setOrderDetails(loadedOrderDetails as OrderDetails);
      }
    } else {
      console.log("Confirmation Page - No valid txHash found in URL parameters or storage.");
      // Load stored order details even if payment confirmation fails or isn't present
      if (loadedOrderDetails) {
         setOrderDetails({
           ...(loadedOrderDetails || {}),
           timestamp: loadedOrderDetails.timestamp || format(new Date(), 'PPP p'),
         } as OrderDetails);
      }
    }
    setIsLoading(false);
  }, [parsePaymentFromUrl, orderId]);

  // Document title effect
  useEffect(() => {
    if (orderDetails) {
      document.title = `Order Confirmation - ${orderDetails.name}`;
    } else {
      document.title = "Order Confirmation";
    }
    
    return () => {
      document.title = "Merchant Yapp";
    };
  }, [orderDetails]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isSuccess = paymentResult && paymentResult.txHash;
  const receiptData = JSON.stringify({ orderId, paymentResult, orderDetails });
  const confirmationUrl = generateConfirmationUrl(orderId || "");
  const receiptQrValue = confirmationUrl;
  const yodlTxUrl = isSuccess ? `https://yodl.me/tx/${paymentResult.txHash}` : '';

  // Construct pre-filled Telegram message
  let telegramMessage = "";
  if (isSuccess && orderDetails && shop) {
    const messageParts = [
      `Hey, I just bought ${orderDetails.name} from ${shop.name}.`,
      `Where can I pick it up?`,
      `Here is the receipt: ${yodlTxUrl}`
    ];
    telegramMessage = encodeURIComponent(messageParts.join("\n\n")); // Encode for URL
  }
  const telegramLink = shopTelegramHandle ? `https://t.me/${shopTelegramHandle}?text=${telegramMessage}` : '#';

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-purple-900 dark:via-indigo-900 dark:to-purple-800">
      <header className={`sticky top-0 z-10 w-full bg-background/95 dark:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b dark:border-purple-700/50 ${isInIframe ? 'py-2' : 'py-4'}`}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          {!isInIframe && (
            <h1 className="text-2xl font-bold">Order Confirmation</h1>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
        <Card className="w-full lg:w-2/3">
          <CardHeader>
            {isSuccess ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-center">
                  Payment Successful!
                </CardTitle>
                <CardDescription className="text-center">
                  Your order has been confirmed and is being processed.
                </CardDescription>
                {isSuccess && (
                  <div className="mt-4 flex justify-center">
                    <div className="p-2 bg-white rounded-lg">
                      <QRCodeCanvas 
                        value={receiptQrValue}
                        size={180} 
                        level={"H"}
                        includeMargin={false}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <CardTitle className="text-2xl text-center">Order Status</CardTitle>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-center mb-2">Order Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="text-right break-all overflow-hidden overflow-ellipsis">{orderId || "N/A"}</span>
                  
                  {orderDetails && (
                    <>
                      <span className="text-muted-foreground">Product:</span>
                      <span className="text-right">{orderDetails.emoji} {orderDetails.name}</span>
                      
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="text-right">{orderDetails.price} {orderDetails.currency}</span>
                      
                      <span className="text-muted-foreground">Timestamp:</span>
                      <span className="text-right">{orderDetails.timestamp}</span>
                    </>
                  )}
                </div>
              </div>
              
              {isSuccess ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="font-semibold">Transaction Details</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-right text-green-600 font-medium">Confirmed</span>
                      
                      <span className="text-muted-foreground">Transaction Hash:</span>
                      <Link 
                        to={`https://yodl.me/tx/${paymentResult.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-right font-mono text-primary hover:underline flex items-center justify-end gap-1 break-all overflow-hidden"
                      >
                        {paymentResult.txHash}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </Link>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-center text-green-800">
                      Thank you for your purchase!
                    </p>
                  </div>
                </>
              ) : (
                 <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-center text-yellow-800">
                      Waiting for payment confirmation or payment details not found.
                    </p>
                  </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
            {isSuccess && shopTelegramHandle && (
              <Button 
                variant="default"
                onClick={() => window.open(telegramLink, "_blank")}
              >
                <Send className="mr-2 h-4 w-4" />
                Contact Seller
              </Button>
            )}
            
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Save as PDF
            </Button>
          </CardFooter>
        </Card>

        {/* Side Column (Transaction Preview only) */}
        {isSuccess && (
          <div className="w-full lg:w-1/3 flex flex-col gap-8">
            {/* Transaction Preview Card (iframe) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-center">Transaction Preview</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground text-center px-2">Preview of the Yodl transaction page:</p>
                <div className="w-full aspect-[1.91/3.12] lg:aspect-[1.91/2.88] border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative iframe-container"> 
                  {/* Increased height by 20% from previous values */}
                  <div className="relative w-full h-full">
                    {/* Overlay with "Transaction Details" text */}
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 bg-black py-2">
                      <div className="text-white font-medium">
                        Transaction Details
                      </div>
                    </div>
                    <iframe
                      src={yodlTxUrl}
                      title="Yodl Transaction Preview"
                      className="w-full h-full border-0 relative z-0"
                      sandbox="allow-same-origin allow-scripts"
                      style={{ pointerEvents: 'auto', touchAction: 'auto' }}
                    >
                      Loading preview...
                    </iframe>
                  </div>
                </div>
                 <Button asChild variant="link" size="sm">
                   <a href={yodlTxUrl} target="_blank" rel="noopener noreferrer">
                     View on yodl.me <ExternalLink className="ml-1 h-3 w-3" />
                   </a>
                 </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default OrderConfirmation; 