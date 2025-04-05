import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Check, DollarSign } from 'lucide-react'
import shopsData from "@/config/shops.json"
import { generateYodlLink } from "@/config/yodl"

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
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const [qrValue, setQrValue] = useState<string>('')

  useEffect(() => {
    if (productId) {
      fetchProduct()
    }
  }, [productId])

  useEffect(() => {
    if (product) {
      // Generate the Yodl payment link
      const orderId = `product_${product.id}_${Date.now()}`
      const metadata = {
        productId: product.id,
        productName: product.name,
        emoji: product.emoji
      }
      
      const yodlLink = generateYodlLink(
        product.price,
        product.currency as any,
        orderId,
        true, // Disconnect wallet after payment
        metadata
      )
      
      // Set the QR code value to the Yodl payment link
      setQrValue(`https://${yodlLink}`)
    }
  }, [product])

  // Log the QR code value for debugging
  useEffect(() => {
    if (product) {
      console.log("QR Code value:", qrValue)
    }
  }, [product, qrValue])

  function fetchProduct() {
    setIsLoading(true)
    setError(null)
    
    try {
      // Find the product in the shops.json file
      const foundProduct = shopsData.products.find(p => p.id === productId)
      
      if (!foundProduct) {
        setError(`Product with ID ${productId} not found`)
        setIsLoading(false)
        return
      }
      
      setProduct(foundProduct)
    } catch (err) {
      console.error("Error fetching product:", err)
      setError("Failed to load product details")
    } finally {
      setIsLoading(false)
    }
  }

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
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">{product.emoji}</span>
            <p className="font-medium">{product.name}</p>
          </div>
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
