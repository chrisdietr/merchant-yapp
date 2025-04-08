import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import ProductCard from "./ProductCard";
import CheckoutModal from "./CheckoutModal";
import shopConfig from "../config/shop.json";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
  inStock: boolean | string;
}

interface ShopConfig {
  shop: {
    name: string;
    owner: string;
    telegramHandle?: string;
    webhookUrl?: string;
  };
  products: Product[];
}

const Home = () => {
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] =
    useState<boolean>(false);

  // Mock wallet connection function
  const connectWallet = () => {
    // In a real implementation, this would use RainbowKit
    const mockAddress = "0x1234...abcd";
    setWalletAddress(mockAddress);
    setIsWalletConnected(true);
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setIsWalletConnected(false);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutClose = () => {
    setIsCheckoutModalOpen(false);
    setSelectedProduct(null);
  };

  const { shop, products } = shopConfig as ShopConfig;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{shop.name}</h1>

          {isWalletConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {walletAddress}
              </span>
              <Button variant="outline" size="sm" onClick={disconnectWallet}>
                Disconnect
              </Button>
            </div>
          ) : (
            <Button onClick={connectWallet}>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h2 className="text-3xl font-bold mb-6">Products</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onCheckout={() => handleProductSelect(product)}
                isWalletConnected={isWalletConnected}
              />
            ))}
          </div>
        </section>
      </main>

      {selectedProduct && (
        <CheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={handleCheckoutClose}
          product={selectedProduct}
          walletAddress={walletAddress}
          shopConfig={shop}
        />
      )}
    </div>
  );
};

export default Home;
