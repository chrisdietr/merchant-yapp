import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wallet } from "lucide-react";

// Define Product type locally
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
  inStock: boolean | string;
}

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
  inStock: boolean | string;
  onCheckout: (product: Product) => void;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
}

const ProductCard = ({
  id = "1",
  name = "Product Name",
  description = "Product description goes here. This is a placeholder for the actual product description.",
  price = 9.99,
  currency = "USD",
  emoji = "🛍️",
  inStock = true,
  onCheckout = () => {},
  isWalletConnected = false,
  onConnectWallet = () => {},
}: ProductCardProps) => {
  const productData: Product = { id, name, description, price, currency, emoji, inStock };

  const handleCheckout = () => {
    if (isWalletConnected) {
      onCheckout(productData);
    } else {
      onConnectWallet();
    }
  };

  const isAvailable = inStock === true || inStock === "infinite" || inStock === "true";

  return (
    <Card className="w-full max-w-sm overflow-hidden transition-all duration-200 hover:shadow-lg bg-card dark:bg-card/80 flex flex-col">
      <div className="flex-grow">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-black dark:text-white">{name}</CardTitle>
            <div className="text-4xl">{emoji}</div>
          </div>
          <CardDescription className="text-sm text-muted-foreground dark:text-gray-400 min-h-[2.5rem]">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {price} {currency}
            </div>
          </div>
        </CardContent>
      </div>
      <CardFooter>
        <Button
          onClick={handleCheckout}
          className={`w-full ${isWalletConnected && isAvailable ? 'bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700 text-white' : ''}`}
          disabled={!isAvailable}
          variant={isWalletConnected ? "default" : "outline"}
        >
          {!isAvailable ? (
            "Sold Out"
          ) : isWalletConnected ? (
            "Buy Now"
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet to Buy
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
