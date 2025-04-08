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

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
  inStock: boolean | string;
  onCheckout: (productId: string) => void;
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
}: ProductCardProps) => {
  const handleCheckout = () => {
    onCheckout(id);
  };

  const isAvailable = inStock === true || inStock === "infinite";

  return (
    <Card className="w-full max-w-sm overflow-hidden transition-all duration-200 hover:shadow-lg bg-white">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold">{name}</CardTitle>
          <div className="text-4xl">{emoji}</div>
        </div>
        <CardDescription className="text-sm text-gray-500">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">
            {price} {currency}
          </div>
          <Badge variant={isAvailable ? "default" : "destructive"}>
            {isAvailable
              ? inStock === "infinite"
                ? "In Stock"
                : "Available"
              : "Out of Stock"}
          </Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleCheckout}
          className="w-full"
          disabled={!isAvailable}
        >
          {isAvailable ? "Buy Now" : "Sold Out"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
