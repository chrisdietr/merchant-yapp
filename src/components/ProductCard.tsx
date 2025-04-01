
import { Product } from "@/lib/types"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate()

  const handleBuyNow = () => {
    navigate(`/payment?productId=${product.id}`)
  }

  return (
    <Card className="product-card overflow-hidden">
      <div className="aspect-square overflow-hidden">
        <img 
          src={product.image} 
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
        />
      </div>
      <CardHeader className="p-4">
        <div>
          <h3 className="font-semibold">{product.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
        </div>
      </CardHeader>
      <CardFooter className="flex items-center justify-between p-4 pt-0">
        <p className="font-semibold">${product.price.toFixed(2)}</p>
        <Button onClick={handleBuyNow} size="sm">Buy Now</Button>
      </CardFooter>
    </Card>
  )
}
