import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useYodl } from '../contexts/YodlContext';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { generateConfirmationUrl } from "@/utils/url";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
}

interface CheckoutModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  product?: Product;
  walletAddress?: string;
  shopConfig?: {
    name: string;
    telegramHandle?: string;
  };
  onPayment?: (product: Product) => Promise<void>;
}

const CheckoutModal = ({
  isOpen = true,
  onClose = () => {},
  product = {
    id: "1",
    name: "Coffee",
    description: "Freshly brewed",
    price: 2.5,
    currency: "CHF",
    emoji: "☕",
  },
  walletAddress,
  shopConfig,
  onPayment,
}: CheckoutModalProps) => {
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "success" | "failed"
  >("pending");
  const [progress, setProgress] = useState(0);
  const { createPayment, merchantAddress, merchantEns, isInIframe } = useYodl();
  const [orderId] = useState(`order_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  
  // Reset payment status when modal opens and store product details
  useEffect(() => {
    if (isOpen && product) {
      setPaymentStatus("pending");
      setProgress(0);
      // Store product details for confirmation page
      try {
        localStorage.setItem(`order_${orderId}`, JSON.stringify({
          name: product.name,
          price: product.price,
          currency: product.currency,
          emoji: product.emoji,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        console.error("Failed to save order details to localStorage", e);
      }
    }
  }, [isOpen, product, orderId]);

  const handleStartPayment = async () => {
    if (!product) return;
    setPaymentStatus("processing");

    try {
      // Generate a confirmation page URL
      const confirmationUrl = generateConfirmationUrl(orderId);
      
      console.log(`Starting payment${isInIframe ? ' (in iframe mode)' : ''}`);
      
      const payment = await createPayment({
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: orderId,
        metadata: {
          productId: product.id,
          productName: product.name,
          orderId: orderId,
          emoji: product.emoji
        },
        redirectUrl: confirmationUrl
      });

      // If we get here without a redirect, the payment was successful in iframe mode
      console.log('Payment completed successfully in iframe mode:', payment);
      
      // Store the payment result in localStorage to retrieve on the confirmation page
      try {
        localStorage.setItem(`payment_${orderId}`, JSON.stringify({
          txHash: payment.txHash,
          chainId: payment.chainId
        }));
      } catch (e) {
        console.error("Failed to save payment result to localStorage", e);
      }
      
      setProgress(100);
      setPaymentStatus("success");
      
      // Navigate to confirmation page after a brief delay to show success
      setTimeout(() => {
        navigate(`/confirmation?orderId=${orderId}`);
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Payment failed:', error);
      
      // Handle specific error cases
      if (error.message === 'Payment was cancelled') {
        console.log('User cancelled the payment');
        setPaymentStatus("pending"); 
        setProgress(0);
      } else if (error.message === 'Payment request timed out') {
        console.log('Payment request timed out');
        setPaymentStatus("failed");
      } else {
        // Handle other errors
        setPaymentStatus("failed");
      }
    }
  };

  // Generate the direct payment link (still useful for QR code data)
  const getPaymentLink = () => {
    if (!product) return '';
    const identifier = merchantEns || merchantAddress;
    const confirmationUrl = encodeURIComponent(generateConfirmationUrl(orderId));
    return `https://yodl.me/${identifier}?amount=${product.price}&currency=${product.currency}&redirectUrl=${confirmationUrl}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getPaymentLink());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isInIframe ? 'sm:max-w-sm' : 'sm:max-w-md'} w-[90%] bg-background rounded-lg`}>
        <DialogHeader>
          <DialogTitle className={`${isInIframe ? 'text-xl' : 'text-2xl'} font-bold flex items-center gap-2`}>
            <span>{product?.emoji}</span>
            <span>Checkout</span>
          </DialogTitle>
          {!isInIframe && (
            <DialogDescription>
              Complete your purchase using cryptocurrency via Yodl.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-4">
          <Card className="border border-border">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <h3 className="font-medium text-lg">{product?.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {product?.description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-lg">
                    {product?.price} {product?.currency}
                  </p>
                  <Badge className="mt-1">
                    Crypto Payment
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-4" />

        {paymentStatus === "pending" && (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center px-4">
              {isInIframe 
                ? "Click the button below to start payment" 
                : "Scan or click the QR code to open the payment link in your wallet app."
              }
            </p>
            {isInIframe ? (
              <Button
                onClick={handleStartPayment}
                className="w-full py-6 text-lg"
                size="lg"
              >
                Pay with Crypto
              </Button>
            ) : (
              <button 
                onClick={handleStartPayment} 
                className="p-4 rounded-lg w-full max-w-[250px] h-auto aspect-square flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 bg-white dark:bg-gray-100"
                aria-label="Start Payment with QR Code"
              >
                <QRCodeCanvas 
                  value={getPaymentLink()} 
                  size={200}
                  level={"H"}
                  includeMargin={false}
                  className="w-full h-full"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </button>
            )}
          </div>
        )}

        {paymentStatus === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
            <h3 className="text-lg sm:text-xl font-medium">Processing Payment</h3>
            <Progress value={progress} className="w-full max-w-xs" />
            <p className="text-muted-foreground text-sm text-center px-4">
              Please wait while we confirm your transaction on the blockchain.
            </p>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500" />
            <h3 className="text-lg sm:text-xl font-medium">Payment Successful!</h3>
            <p className="text-muted-foreground text-sm text-center px-4">
              Your payment has been confirmed. Redirecting to order confirmation...
            </p>
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-destructive" />
            <h3 className="text-lg sm:text-xl font-medium">Payment Failed</h3>
            <p className="text-muted-foreground text-sm text-center px-4">
              There was an issue processing your payment. Please try again.
            </p>
            <div className="flex gap-2 w-full max-w-xs mt-2">
              <Button
                className="flex-1"
                size="sm"
                onClick={() => setPaymentStatus("pending")}
              >
                Try Again
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 sm:mt-6">
          {/* Footer buttons removed/simplified as main action is QR click */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
