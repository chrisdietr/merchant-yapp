
import { useEffect, useState, useRef } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Check, DollarSign, Clock } from "lucide-react"
import shopsData from "@/config/shops.json"
import { useAuth } from "@/contexts/AuthContext"
import { Helmet } from "react-helmet"
import html2canvas from "html2canvas"

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
  const [socialPreviewUrl, setSocialPreviewUrl] = useState<string>('')
  const navigate = useNavigate()
  const { address } = useAuth()
  const socialPreviewRef = useRef<HTMLDivElement>(null)

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
        } : undefined,
        // Include emoji for display in the scanner
        emoji: product.emoji
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

  // Generate social preview image when product loads
  useEffect(() => {
    if (product && socialPreviewRef.current) {
      // Small delay to ensure the DOM is fully rendered
      const timer = setTimeout(() => {
        generateSocialPreviewImage().then(url => {
          if (url) {
            console.log("Social preview image generated successfully")
            setSocialPreviewUrl(url)
          } else {
            console.error("Failed to generate social preview image")
          }
        }).catch(err => {
          console.error("Error generating social preview:", err)
        })
      }, 500)
      
      return () => clearTimeout(timer)
    }
  }, [product])

  // Function to generate social preview image URL
  const generateSocialPreviewImage = async () => {
    if (!socialPreviewRef.current || !product) {
      console.error("Missing ref or product for social preview generation")
      return '';
    }
    
    try {
      // Make the social preview visible temporarily for capturing
      const previewElement = socialPreviewRef.current;
      
      // Clone the element to avoid modifying the actual DOM
      const clone = previewElement.cloneNode(true) as HTMLDivElement;
      document.body.appendChild(clone);
      
      // Position and style for capture
      clone.style.position = 'fixed';
      clone.style.left = '0';
      clone.style.top = '0';
      clone.style.width = '1200px';
      clone.style.height = '630px';
      clone.style.opacity = '1';
      clone.style.visibility = 'visible';
      clone.style.zIndex = '-1000';
      clone.style.pointerEvents = 'none';
      
      console.log("Attempting to capture social preview with html2canvas")
      
      // Generate image
      const canvas = await html2canvas(clone, {
        backgroundColor: '#25104a',
        scale: 2,
        logging: true,
        useCORS: true,
        allowTaint: true
      });
      
      // Remove the clone
      document.body.removeChild(clone);
      
      // Get data URL
      const dataUrl = canvas.toDataURL('image/png');
      console.log("Successfully generated social preview image")
      return dataUrl;
    } catch (error) {
      console.error('Error generating social preview:', error);
      return '';
    }
  };

  // Function to get social media preview title
  const getSocialPreviewTitle = () => {
    if (!product) return "Product Order";
    return `${product.name} | Payment Confirmation | Order #${Date.now().toString().slice(-4)}`;
  };

  // Function to get social media preview description
  const getSocialPreviewDescription = () => {
    if (!product) return "Product order confirmation";
    const shopName = shopsData.shops.length > 0 ? shopsData.shops[0].name : "Merchant Shop";
    return `${product.name} purchased from ${shopName} for ${product.price.toFixed(2)} ${product.currency}. Scan the QR code to verify this order.`;
  };

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
      {/* Add social media preview metadata */}
      <Helmet>
        <title>{getSocialPreviewTitle()}</title>
        <meta name="description" content={getSocialPreviewDescription()} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.href} />
        <meta property="og:title" content={getSocialPreviewTitle()} />
        <meta property="og:description" content={getSocialPreviewDescription()} />
        {socialPreviewUrl && <meta property="og:image" content={socialPreviewUrl} />}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={getSocialPreviewTitle()} />
        <meta name="twitter:description" content={getSocialPreviewDescription()} />
        {socialPreviewUrl && <meta name="twitter:image" content={socialPreviewUrl} />}
      </Helmet>

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

      {/* Hidden element for social media preview image generation */}
      <div 
        ref={socialPreviewRef} 
        className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500/30 rounded-lg shadow-lg p-8"
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          visibility: 'hidden',
          width: '1200px', 
          height: '630px',
          overflow: 'hidden'
        }}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex items-start gap-6 max-w-4xl">
            <div className="bg-white p-4 rounded-md">
              <QRCodeSVG 
                value={qrValue} 
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="flex-1 text-white">
              <div className="flex items-center">
                <span className="text-6xl mr-4">{product.emoji}</span>
                <div>
                  <h1 className="font-bold text-4xl">{product.name}</h1>
                  <p className="text-3xl mt-2 opacity-80">Order #{Date.now().toString().slice(-6)}</p>
                </div>
              </div>
              
              <div className="flex items-center text-green-300 font-medium text-3xl mt-6">
                <Check className="mr-2 h-8 w-8" /> Payment Confirmation
              </div>
              
              <div className="flex items-center text-6xl font-bold mt-4">
                <DollarSign className="h-10 w-10 mr-2" />{product.price.toFixed(2)} {product.currency}
              </div>
              
              <div className="flex items-center text-gray-300 text-2xl mt-4">
                <Clock className="h-6 w-6 mr-2" /> {new Date().toLocaleString()}
              </div>
              
              <p className="text-gray-300 text-2xl mt-6">
                merchant-yapp.lovable.app
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
