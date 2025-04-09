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
  const [searchParams, setSearchParams] = useSearchParams();
  const { yodl, merchantAddress, merchantEns, isInIframe, parsePaymentFromUrl } = useYodl(); 
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  
  const orderId = searchParams.get("orderId");
  const urlTxHash = searchParams.get("txHash");
  const urlChainId = searchParams.get("chainId");

  const shop = shopConfig.shops[0];
  const shopTelegramHandle = shop?.telegramHandle;
  
  // Detect if we're on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Helper function to clean specific parameters from URL without reload
  const cleanUrlParams = (paramsToRemove: string[]) => {
    const newSearchParams = new URLSearchParams(searchParams);
    paramsToRemove.forEach(param => newSearchParams.delete(param));
    // Use replace: true to avoid adding to browser history
    setSearchParams(newSearchParams, { replace: true }); 
  };

  // Primary Effect: Detect Payment Completion and Load Data
  useEffect(() => {
    if (!orderId) {
      setError("Order ID is missing from URL.");
      setIsLoading(false);
      return;
    }

    console.log(`Order Confirmation: Starting check for orderId: ${orderId}`);
    setIsLoading(true); 
    setError(null);
    setWarning(null);
    setPaymentResult(null);
    setOrderDetails(null);

    let confirmedPayment: PaymentResult | null = null;

    // --- Step 1: Check URL parameters for txHash (Primary confirmation method) ---
    if (urlTxHash) {
      console.log(`Found txHash in URL: ${urlTxHash}`);
      confirmedPayment = {
        txHash: urlTxHash,
        chainId: urlChainId ? parseInt(urlChainId, 10) : undefined
      };
      // Clean txHash/chainId from URL now that we've processed them
      cleanUrlParams(['txHash', 'chainId']);
    } else {
      // --- Step 2: Fallback - Check localStorage (for same-device flow) ---
      console.log("No txHash in URL, checking localStorage as fallback.");
      try {
        const storedPaymentResult = localStorage.getItem(`payment_${orderId}`);
        if (storedPaymentResult) {
          const parsedResult = JSON.parse(storedPaymentResult);
          if (parsedResult.txHash) {
            console.log("Found payment result in localStorage (fallback):", parsedResult);
            confirmedPayment = parsedResult;
          }
        }
      } catch (e) {
        console.warn("Error parsing localStorage for payment:", e);
      }
    }

    // --- Step 3: Set Payment State --- 
    if (confirmedPayment) {
      setPaymentResult(confirmedPayment);
      console.log("Payment considered CONFIRMED.", confirmedPayment);
      // Ensure it's stored locally even if confirmed via URL
      localStorage.setItem(`payment_${orderId}`, JSON.stringify(confirmedPayment));
    } else {
      console.log("Payment NOT confirmed via URL or localStorage.");
      // No payment confirmation found, will show 'Waiting for payment' state
    }

    // --- Step 4: Load Order Details (Always attempt) ---
    console.log("Attempting to load order details from localStorage...");
    try {
      const storedDetails = localStorage.getItem(orderId) || localStorage.getItem(`order_${orderId}`);
      if (storedDetails) {
        const parsedDetails = JSON.parse(storedDetails);
        // Format timestamp
        if (!parsedDetails.timestamp) {
           parsedDetails.timestamp = format(new Date(), 'PPP p');
        } else {
           try { parsedDetails.timestamp = format(new Date(parsedDetails.timestamp), 'PPP p'); } catch {}
        }
        setOrderDetails(parsedDetails as OrderDetails);
        console.log("Loaded order details from localStorage:", parsedDetails);
      } else {
        console.warn("Could not find order details in localStorage for", orderId);
        if (confirmedPayment) {
          // If payment is confirmed but details missing (e.g., QR scan)
          setWarning("Payment confirmed, but order details could not be loaded on this device. Please refer to your original purchase device or receipt link.");
        }
      }
    } catch (e) {
      console.error("Error loading order details:", e);
      setError("Failed to load order details data.");
    }

    // --- Step 5: Finalize Loading State --- 
    setIsLoading(false);
    console.log("Order Confirmation checks complete.");

  }, [orderId, urlTxHash, urlChainId, setSearchParams]); // Re-run if key URL params change

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

  // Main Render Logic
  const isSuccess = paymentResult && paymentResult.txHash;

  // Modify QR Code generation to include txHash and chainId
  const generateQrUrl = () => {
    const url = new URL(generateConfirmationUrl(orderId || ""));
    if (paymentResult?.txHash) {
      url.searchParams.set('txHash', paymentResult.txHash);
    }
    if (paymentResult?.chainId !== undefined) {
      url.searchParams.set('chainId', String(paymentResult.chainId));
    }
    return url.toString();
  };
  const receiptQrValue = generateQrUrl();
  
  // Log the final QR value
  console.log("Final QR Code Value:", receiptQrValue);

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
              
              {warning && (
                <div className="p-4 mb-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center text-yellow-800">
                  {warning}
                </div>
              )}
              
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