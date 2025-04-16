import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  User,
} from "lucide-react";
import { useYodl } from '../contexts/YodlContext';
import { useNavigate } from 'react-router-dom';
import { generateConfirmationUrl } from "@/utils/url";
import { Product } from '../config/config';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onInitiateCheckout: (product: Product, buyerName: string) => Promise<void>;
}

const CheckoutModal = ({
  isOpen,
  onClose,
  product,
  onInitiateCheckout,
}: CheckoutModalProps) => {
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "success" | "failed"
  >("pending");
  const [progress, setProgress] = useState(0);
  const { createPayment, merchantAddress, merchantEns, isInIframe } = useYodl();
  const [orderId] = useState(() => `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const [buyerName, setBuyerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen && product) {
      setPaymentStatus("pending");
      setProgress(0);
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
    } else if (!isOpen) {
      setPaymentStatus("pending");
      setProgress(0);
    }
  }, [isOpen, product, orderId]);

  const handleStartPayment = async () => {
    if (!product) return;
    
    if (!buyerName.trim()) {
      setError("Please enter your name (max 8 characters).");
      return;
    }
    if (buyerName.length > 8) {
      setError("Name cannot exceed 8 characters.");
      return;
    }
    
    setError(null);
    setPaymentStatus("processing");
    setProgress(10);

    const timestamp = Date.now().toString().substring(6);
    
    const productNameShort = product.name.substring(0, 8).replace(/\s+/g, '_');
    const userNameShort = buyerName.trim().substring(0, 8).replace(/[^a-zA-Z0-9_-]/g, '_');
    const formattedOrderId = `${productNameShort}_for_${userNameShort}_${timestamp}`;
    
    const finalOrderId = formattedOrderId.substring(0, 31);

    try {
      const confirmationUrl = generateConfirmationUrl(orderId);
      console.log(`Starting payment for order ${finalOrderId}${isInIframe ? ' (in iframe mode)' : ''}`);

      const messageHandler = (event: MessageEvent) => {
        const data = event.data;
        
        if (data && typeof data === 'object' && data.type === 'payment_complete' && data.orderId === orderId) {
          console.log('Received payment completion message:', data);
          setProgress(100);
          setPaymentStatus("success");
          
          setTimeout(() => {
            navigate(`/confirmation?orderId=${orderId}`);
            onClose();
          }, 1500);
          
          window.removeEventListener('message', messageHandler);
        }
      };
      
      window.addEventListener('message', messageHandler);

      const payment = await createPayment({
        amount: product.price,
        currency: product.currency,
        description: product.name,
        orderId: finalOrderId,
        metadata: {
          productId: product.id,
          productName: product.name,
          orderId: orderId,
          customerName: buyerName.trim(),
          emoji: product.emoji,
          quantity: "1"
        },
        redirectUrl: confirmationUrl
      });

      console.log('Payment request successful (or redirect initiated):', payment);

      if (payment?.txHash) {
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
        
        if (isInIframe) {
          setTimeout(() => {
            navigate(`/confirmation?orderId=${orderId}`);
            onClose();
          }, 1500);
        }
      } else {
        setPaymentStatus("processing");
        setProgress(50);
      }
      
      return () => {
        window.removeEventListener('message', messageHandler);
      };

    } catch (error: any) {
      console.error('Payment failed:', error);
      if (error.message?.includes('cancelled') || error.code === 4001) {
        console.log('User cancelled the payment');
        setPaymentStatus("pending");
      } else if (error.message?.includes('timed out')) {
        console.log('Payment request timed out');
        setPaymentStatus("failed");
      } else {
        setPaymentStatus("failed");
      }
      setProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isInIframe ? 'sm:max-w-sm' : 'sm:max-w-md'} w-[92%] sm:w-[90%] bg-background rounded-lg`} style={{ zIndex: 1000 }}>
        <DialogHeader>
          <DialogTitle className={`${isInIframe ? 'text-xl' : 'text-lg sm:text-xl md:text-2xl'} font-bold flex items-center gap-2`}>
            <span>{product?.emoji}</span>
            <span>Checkout</span>
          </DialogTitle>
          {!isInIframe && product && (
            <DialogDescription>
              {product.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-3 sm:mt-4">
          <Card className="border border-border">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
                <div>
                  <h3 className="font-medium text-base sm:text-lg">{product?.name}</h3>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-base sm:text-lg">
                    {product?.price} {product?.currency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-3 sm:my-4" />
        
        <div className="mb-3 sm:mb-4">
          <Label htmlFor="buyerName" className="text-sm font-medium">
            Your Name (for Memo) <span className="text-red-500">*</span>
          </Label>
          <div className="flex items-center mt-1 sm:mt-1.5">
            <User className="w-4 h-4 mr-2 text-muted-foreground" />
            <Input
              id="buyerName"
              placeholder="Max 8 characters"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="flex-1"
              maxLength={8}
              required
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Your name is required and will be included in the transaction memo for seller identification
          </p>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        {paymentStatus === "pending" && (
          <div className="flex flex-col items-center">
            <Button
              onClick={handleStartPayment}
              className="w-full py-6 text-lg font-medium"
              size="lg"
            >
              Pay
            </Button>
          </div>
        )}

        {paymentStatus === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin text-primary" />
            <h3 className="text-lg sm:text-xl font-medium">Processing Payment</h3>
            <Progress value={progress} className="w-full max-w-xs" />
            <p className="text-muted-foreground text-sm text-center px-4">
              {isInIframe ? 'Waiting for confirmation...' : 'Please complete the payment in your wallet or on the Yodl page.'}
            </p>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500" />
            <h3 className="text-lg sm:text-xl font-medium">Payment Successful!</h3>
            <p className="text-muted-foreground text-sm text-center px-4">
              Your transaction is confirmed. Redirecting soon...
            </p>
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <XCircle className="h-12 w-12 sm:h-16 sm:w-16 text-red-500" />
            <h3 className="text-lg sm:text-xl font-medium">Payment Failed</h3>
            <p className="text-muted-foreground text-sm text-center px-4">
              Something went wrong. Please try again.
            </p>
            <Button onClick={handleStartPayment} variant="outline">Try Again</Button>
          </div>
        )}

        <div className="mt-4 sm:mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
