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
import { CheckCircle, Download, Home, Loader2, ExternalLink, Send, XCircle } from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const orderId = searchParams.get("orderId");
  const shop = shopConfig.shops[0];
  const shopTelegramHandle = shop?.telegramHandle;
  
  // Detect if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Helper function to clean payment parameters from URL
  const cleanPaymentUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('txHash');
    url.searchParams.delete('chainId');
    window.history.replaceState({}, document.title, url.toString());
  };

  // Primary Effect: Detect Payment Completion and Load Data
  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing.");
      setIsLoading(false);
      return;
    }

    console.log(`Order Confirmation: Starting check for orderId: ${orderId}`);
    setIsLoading(true); // Start in loading state
    setError(null);
    setPaymentResult(null);
    setOrderDetails(null);

    const checkPaymentStatus = () => {
      let foundPaymentResult: PaymentResult | null = null;

      // 1. Check URL parameters (for direct redirect)
      try {
        const urlResult = parsePaymentFromUrl();
        if (urlResult && urlResult.txHash && (urlResult.memo === orderId || !urlResult.memo)) {
          console.log("Found payment result in URL params:", urlResult);
          foundPaymentResult = { txHash: urlResult.txHash, chainId: urlResult.chainId };
          cleanPaymentUrl(); // Clean URL after processing
        }
      } catch (e) {
        console.warn("Error parsing URL for payment:", e);
      }

      // 2. Check localStorage (most reliable method)
      if (!foundPaymentResult) {
        try {
          const storedPaymentResult = localStorage.getItem(`payment_${orderId}`);
          if (storedPaymentResult) {
            const parsedResult = JSON.parse(storedPaymentResult);
            if (parsedResult.txHash) {
              console.log("Found payment result in localStorage:", parsedResult);
              foundPaymentResult = parsedResult;
            }
          }
        } catch (e) {
          console.warn("Error parsing localStorage for payment:", e);
        }
      }
      
      return foundPaymentResult;
    };

    const loadOrderDetails = () => {
      try {
        const storedDetails = localStorage.getItem(orderId) || localStorage.getItem(`order_${orderId}`);
        if (storedDetails) {
          const parsedDetails = JSON.parse(storedDetails);
          // Ensure timestamp exists, format if necessary
          if (!parsedDetails.timestamp) {
             parsedDetails.timestamp = format(new Date(), 'PPP p');
          } else {
             // Check if timestamp is ISO string, format if needed
             try {
               parsedDetails.timestamp = format(new Date(parsedDetails.timestamp), 'PPP p');
             } catch {}
          }
          setOrderDetails(parsedDetails as OrderDetails);
          console.log("Loaded order details:", parsedDetails);
        } else {
          console.warn("Could not find order details in localStorage for", orderId);
          // Optionally set an error or default details
        }
      } catch (e) {
        console.error("Error loading order details:", e);
        setError("Failed to load order details.");
      }
    };

    // Polling mechanism
    let attempts = 0;
    const maxAttempts = 60; // Poll for 60 seconds (60 * 1000ms)
    const intervalMs = 1000;

    const intervalId = setInterval(() => {
      console.log(`Payment check attempt ${attempts + 1}/${maxAttempts}`);
      const result = checkPaymentStatus();

      if (result) {
        console.log("Payment confirmed!");
        clearInterval(intervalId);
        setPaymentResult(result);
        loadOrderDetails();
        setIsLoading(false);
        // Ensure payment is stored for future reference
        localStorage.setItem(`payment_${orderId}`, JSON.stringify(result)); 
      } else {
        attempts++;
        if (attempts >= maxAttempts) {
          console.log("Max payment check attempts reached.");
          clearInterval(intervalId);
          // Even if payment isn't confirmed, try loading order details
          loadOrderDetails(); 
          setIsLoading(false);
          // Optionally set an error if payment is expected but not found
          // setError("Payment confirmation timed out.");
        }
      }
    }, intervalMs);

    // Immediate check
    const initialResult = checkPaymentStatus();
    if (initialResult) {
      console.log("Payment confirmed immediately!");
      clearInterval(intervalId);
      setPaymentResult(initialResult);
      loadOrderDetails();
      setIsLoading(false);
      localStorage.setItem(`payment_${orderId}`, JSON.stringify(initialResult));
    } else {
      // Load order details immediately even if payment pending
      loadOrderDetails();
      // Don't stop loading until payment confirmed or timeout
    }

    return () => clearInterval(intervalId);

  }, [orderId, parsePaymentFromUrl]); // Only run when orderId changes

  // Document title effect
  useEffect(() => {
    if (orderDetails) {
      document.title = `Order Confirmation - ${orderDetails.name}`;
    } else if (orderId) {
      document.title = `Order Status - ${orderId}`;
    } else {
      document.title = "Order Status";
    }
    
    return () => {
      document.title = "Merchant Yapp";
    };
  }, [orderDetails, orderId]);

  // Render Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4">Checking payment status...</p>
      </div>
    );
  }

  // Render Error State
  if (error) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-4">
         <XCircle className="h-16 w-16 text-destructive mb-4" />
         <h2 className="text-2xl font-bold mb-2">Error</h2>
         <p className="text-destructive mb-6">{error}</p>
         <Button asChild variant="outline">
           <Link to="/">
             <Home className="mr-2 h-4 w-4" />
             Return to Home
           </Link>
         </Button>
       </div>
    );
  }

  // Render Confirmation Content
  const isSuccess = paymentResult && paymentResult.txHash;
  const receiptData = JSON.stringify({ orderId, paymentResult, orderDetails });
  const confirmationPageUrl = generateConfirmationUrl(orderId || "");
  const receiptQrValue = confirmationPageUrl;
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