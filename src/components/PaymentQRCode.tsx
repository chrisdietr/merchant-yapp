import { useEffect, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import shopsData from "@/config/shops.json"
import { useAuth } from "@/contexts/AuthContext"

// Define a simplified Product interface matching the shop.json structure
interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  emoji: string;
  inStock: boolean | string;
}

interface PaymentQRCodeProps {
  productId: string
}

export function PaymentQRCode({ productId }: PaymentQRCodeProps) {
  const [product, setProduct] = useState<ProductData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { address } = useAuth()

  const qrValue = product
    ? JSON.stringify({
        productId: product.id,
        name: product.name,
        price: product.price,
        orderId: `ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        senderAddress: address || undefined,
        // Get shop information - we just need the first shop for demo
        shopInfo: shopsData.shops.length > 0 ? {
          name: shopsData.shops[0].name,
          ownerAddress: shopsData.shops[0].ownerAddress
        } : undefined
      })
    : ""

  useEffect(() => {
    function fetchProduct() {
      try {
        const foundProduct = shopsData.products.find((p) => p.id === productId)
        
        if (!foundProduct) {
          throw new Error("Product not found")
        }
        
        setProduct(foundProduct)
        setIsLoading(false)
      } catch (err) {
        setError("Error loading product information. Please try again.")
        setIsLoading(false)
        console.error("Error fetching product:", err)
      }
    }
    
    fetchProduct()
  }, [productId])

  // Log the QR code value for debugging
  useEffect(() => {
    if (product) {
      console.log("QR Code value:", qrValue)
    }
  }, [product, qrValue])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="h-48 w-48 animate-pulse bg-muted rounded-md"></div>
        <div className="animate-pulse bg-muted h-6 w-40 rounded"></div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <p className="text-destructive">{error || "Product not found"}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Return to Shop
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8 animate-fade-in">
      <h2 className="text-2xl font-bold text-center">Payment Confirmation</h2>
      <div className="flex flex-col items-center space-y-4 p-6 border rounded-lg bg-card">
        <div className="bg-white p-4 rounded-lg">
          <QRCodeSVG 
            value={qrValue} 
            size={200} 
            level="H"
            includeMargin
          />
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium">{product.name}</p>
          <p className="text-xl font-bold">${product.price.toFixed(2)}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Scan this QR code to confirm your purchase. The merchant will use this to process your order.
      </p>
      <Button variant="outline" onClick={() => navigate("/")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Shop
      </Button>
    </div>
  )
}
