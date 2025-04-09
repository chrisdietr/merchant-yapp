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
import { CheckCircle, Download, ShoppingBag, Loader2, ExternalLink, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format } from 'date-fns';
import { QRCodeCanvas } from 'qrcode.react';
import shopConfig from "../config/shops.json";

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
  const { yodl, merchantAddress, merchantEns } = useYodl(); 
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    console.log("Confirmation Page - Raw URL Search Params:", window.location.search);
    const result = yodl.parsePaymentFromUrl();
    console.log("Confirmation Page - Parsed URL Result:", JSON.stringify(result));

    let loadedOrderDetails: Partial<OrderDetails> | null = null;
    if (orderId) {
      try {
        const storedDetails = localStorage.getItem(orderId);
        if (storedDetails) {
          loadedOrderDetails = JSON.parse(storedDetails);
          console.log("Confirmation Page - Loaded Stored Order Details:", loadedOrderDetails);
        }
      } catch (e) {
        console.error("Failed to load order details from localStorage", e);
      }
    }

    if (result && result.txHash) {
      console.log(`Confirmation Page - Found txHash: ${result.txHash}, chainId: ${result.chainId}`);
      setPaymentResult(result);
      if (loadedOrderDetails) {
          setOrderDetails({
            ...(loadedOrderDetails || {}),
            timestamp: format(new Date(), 'PPP p'),
          } as OrderDetails);
      }
      cleanPaymentUrl();
    } else {
      console.log("Confirmation Page - No valid txHash found in URL parameters.");
      if (orderId && loadedOrderDetails) {
        setOrderDetails({
           ...(loadedOrderDetails || {}),
           timestamp: format(new Date(), 'PPP p'),
         } as OrderDetails);
      }
      setPaymentResult(null); 
    }
    setIsLoading(false);
  }, [yodl, orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const isSuccess = paymentResult && paymentResult.txHash;
  const receiptData = JSON.stringify({ orderId, paymentResult, orderDetails });
  const receiptQrValue = isSuccess ? window.location.href + `&txHash=${paymentResult.txHash}` : window.location.href;
  const yodlTxUrl = isSuccess ? `https://yodl.me/tx/${paymentResult.txHash}` : '';

  // Construct pre-filled Telegram message carefully
  let telegramLink = '#';
  if (isSuccess && orderDetails && shop && shopTelegramHandle) {
    const messageParts = [
      `Hey, I just bought ${orderDetails.emoji} ${orderDetails.name} from ${shop.name}.`, // Keep emoji raw
      `Where can I pick it up?`,
      `Here is the receipt: ${yodlTxUrl}`
    ];
    const encodedMessage = encodeURIComponent(messageParts.join("\n\n"));
    telegramLink = `https://t.me/${shopTelegramHandle}?text=${encodedMessage}`; 
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gradient-to-br dark:from-purple-900 dark:via-indigo-900 dark:to-purple-800">
      <header className="sticky top-0 z-10 w-full bg-background/95 dark:bg-transparent backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b dark:border-purple-700/50">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ShoppingBag className="mr-2 h-4 w-4" />
              <span>Home</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            {isLoading ? (
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            ) : isSuccess ? (
              <>
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle className="text-2xl text-center">Payment Successful!</CardTitle>
                <CardDescription className="text-center">
                  Your order details are below.
                </CardDescription>
              </>
            ) : (
              <CardTitle className="text-2xl text-center">Order Status</CardTitle>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold text-center mb-2">Order Summary</h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="text-right">{orderId || "N/A"}</span>
                  
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
                        className="text-right font-mono truncate text-primary hover:underline flex items-center justify-end gap-1"
                      >
                        {paymentResult.txHash}
                        <ExternalLink className="h-3 w-3 inline-block" />
                      </Link>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-center text-green-800">
                      Thank you for your purchase!
                    </p>
                  </div>
                  <Separator />
                  <div className="flex flex-col items-center gap-4 pt-4">
                     <p className="text-sm font-medium text-center">Scan Receipt QR</p>
                     <div className="p-2 bg-white rounded-lg">
                       <QRCodeCanvas 
                         value={receiptQrValue} 
                         size={150} 
                         level={"H"}
                         includeMargin={false}
                         bgColor="#ffffff"
                         fgColor="#000000"
                       />
                     </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-center text-yellow-800">
                    {orderId ? "Waiting for payment confirmation..." : "Order details not found."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-4 justify-center">
            {isSuccess && shopTelegramHandle && (
              <Button 
                variant="outline"
                onClick={() => window.open(telegramLink, "_blank")}
              >
                <Send className="mr-2 h-4 w-4" />
                Contact Seller
              </Button>
            )}
            {isSuccess && (
              <Button variant="outline" onClick={() => window.print()}>
                <Download className="mr-2 h-4 w-4" />
                Save as PDF
              </Button>
            )}
          </CardFooter>
        </Card>

        {isSuccess && (
          <Card className="w-full max-w-2xl mt-8">
            <CardHeader>
              <CardTitle className="text-lg text-center">Transaction Preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground text-center px-2">Preview of the Yodl transaction page:</p>
              <div className="w-full border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 h-96">
                <iframe
                  src={yodlTxUrl}
                  title="Yodl Transaction Preview"
                  className="w-full h-full border-0"
                  sandbox="allow-same-origin allow-scripts"
                >
                   Loading preview...
                </iframe>
              </div>
               <Button asChild variant="link" size="sm">
                 <a href={yodlTxUrl} target="_blank" rel="noopener noreferrer">
                   View on yodl.me <ExternalLink className="ml-1 h-3 w-3" />
                 </a>
               </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default OrderConfirmation; 