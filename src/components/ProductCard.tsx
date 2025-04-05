import { Product } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import YodlBuyNowButton from "./YodlBuyNowButton"
import { FiatCurrency } from "@yodlpay/yapp-sdk"
import shopsData from "@/config/shops.json"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  // Safety check - if this is somehow the placeholder product, don't render anything
  if (product.id === "PLACEHOLDER_ID") {
    console.warn("Attempted to render placeholder product - skipping");
    return null;
  }

  const { address } = useAccount()

  // Generate a unique order ID for this product
  const orderId = `product_${product.id}_${Date.now()}`;

  // Get the shop's owner address from the first shop in the array
  // This replaces the need for an owner field in each product
  const shopOwnerAddress = shopsData.shops[0]?.["ownerAddress"] || "";

  // Convert the product currency to FiatCurrency enum
  const getCurrency = (currency: string): FiatCurrency => {
    switch (currency.toUpperCase()) {
      case 'USD':
        return FiatCurrency.USD;
      case 'EUR':
        return FiatCurrency.EUR;
      case 'CHF':
        return FiatCurrency.CHF;
      case 'BRL':
        return FiatCurrency.BRL;
      case 'THB':
        return FiatCurrency.THB;
      default:
        return FiatCurrency.USD; // Default to USD if not found
    }
  };

  return (
    <Card className="w-full max-w-[98%] mx-auto md:max-w-none h-full flex flex-col gradient-card text-card-foreground border border-white/10 hover:shadow-xl hover:shadow-purple-500/30">
      <CardHeader className="pb-3 md:pb-2">
        <CardTitle className="flex items-center gap-3 md:gap-3 text-xl md:text-2xl">
          <span className="text-3xl md:text-4xl bg-white/15 p-2 rounded-full flex-shrink-0">{product.emoji}</span>
          <span className="font-bold">{product.name}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5 md:pb-4 flex-grow">
        <p className="text-sm md:text-sm text-card-foreground/80 mb-3 md:mb-2">{product.description}</p>
        <p className="text-lg md:text-xl font-bold text-white mb-3 md:mb-2">
          {product.price} {product.currency}
        </p>
        <div className="mt-2">
          {product.inStock ? (
            <span className="inline-block px-2 py-1 text-xs bg-green-500/30 text-green-200 rounded-md border border-green-400/20">
              {product.inStock === "infinite" ? "Infinite" : "In Stock"}
            </span>
          ) : (
            <span className="inline-block px-2 py-1 text-xs bg-red-500/30 text-red-200 rounded-md border border-red-400/20">
              Out of Stock
            </span>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 mt-auto">
        {!address ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <Button className="w-full gradient-button text-white border-none shadow-md shadow-purple-700/20 text-xs md:text-sm" onClick={openConnectModal}>
                Connect Wallet to Buy
              </Button>
            )}
          </ConnectButton.Custom>
        ) : product.inStock ? (
          <YodlBuyNowButton
            amount={product.price}
            currency={getCurrency(product.currency)}
            orderId={orderId}
            productName={product.name}
            ownerAddress={shopOwnerAddress}
            buttonText="Buy Now"
            buttonClassName="w-full gradient-button text-white h-9 md:h-10 px-3 md:px-4 py-2 inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium shadow-md shadow-purple-700/20 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        ) : (
          <Button 
            className="w-full bg-gray-700 text-white h-9 md:h-10 px-3 md:px-4 py-2 inline-flex items-center justify-center rounded-md text-xs md:text-sm font-medium shadow-md cursor-not-allowed opacity-70"
            disabled
          >
            Not in Stock
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
