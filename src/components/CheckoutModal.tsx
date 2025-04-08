import React, { useState } from "react";
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
  QrCode,
  ExternalLink,
  Copy,
} from "lucide-react";

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
  paymentLink?: string;
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
  paymentLink = "https://yodl.me/0x123abc?amount=2.5&currency=CHF",
}: CheckoutModalProps) => {
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "processing" | "success" | "failed"
  >("pending");
  const [progress, setProgress] = useState(0);

  // Simulate payment processing
  const handleStartPayment = () => {
    setPaymentStatus("processing");

    // Simulate progress updates
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setPaymentStatus("success");
          // Here you would trigger merchant notifications
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    // You could add a toast notification here
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-background">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <span>{product.emoji}</span>
            <span>Checkout</span>
          </DialogTitle>
          <DialogDescription>
            Complete your purchase using cryptocurrency via Yodl.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Card className="border border-border">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-medium text-lg">{product.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {product.description}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {product.price} {product.currency}
                  </p>
                  <Badge variant="outline" className="mt-1">
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
            <div className="bg-muted p-4 rounded-lg w-full max-w-[250px] h-[250px] flex items-center justify-center">
              <QrCode size={200} className="text-primary" />
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button onClick={handleStartPayment} className="w-full">
                Pay with Wallet
              </Button>

              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(paymentLink, "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Link
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCopyLink}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
        )}

        {paymentStatus === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <h3 className="text-xl font-medium">Processing Payment</h3>
            <Progress value={progress} className="w-full" />
            <p className="text-muted-foreground text-sm text-center">
              Please wait while we confirm your transaction on the blockchain.
            </p>
          </div>
        )}

        {paymentStatus === "success" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-medium">Payment Successful!</h3>
            <p className="text-muted-foreground text-sm text-center">
              Your payment has been confirmed. The merchant has been notified of
              your purchase.
            </p>
            <Button onClick={onClose} className="mt-2">
              Return to Shop
            </Button>
          </div>
        )}

        {paymentStatus === "failed" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <XCircle className="h-16 w-16 text-destructive" />
            <h3 className="text-xl font-medium">Payment Failed</h3>
            <p className="text-muted-foreground text-sm text-center">
              There was an issue processing your payment. Please try again or
              use a different payment method.
            </p>
            <div className="flex gap-2 w-full max-w-xs">
              <Button
                variant="outline"
                onClick={() => setPaymentStatus("pending")}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                onClick={onClose}
                variant="destructive"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          {paymentStatus === "pending" && (
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
