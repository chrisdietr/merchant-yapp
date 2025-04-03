import { useState, useEffect } from "react"
import { ProductCard } from "@/components/ProductCard"
import { Product } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import { useAccount } from "wagmi"
import { isAdmin } from "@/lib/auth"
import { useNavigate } from "react-router-dom"
import shopsData from "@/config/shops.json"

export default function Index() {
  const [products, setProducts] = useState<Product[]>([])
  const { address } = useAccount()
  const navigate = useNavigate()
  const { isAdmin: contextIsAdmin, isAuthenticated } = useAuth()
  const { toast } = useToast()
  
  const addressIsAdmin = address ? isAdmin(address) : false;
  const showAdminTools = contextIsAdmin && isAuthenticated && addressIsAdmin;

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Use the imported data instead of fetching
        setProducts(shopsData.products)
      } catch (error) {
        console.error("Error loading products:", error)
        toast({
          title: "Error",
          description: "Failed to load products. Please try again later.",
          variant: "destructive",
        })
      }
    }
    loadProducts()
  }, [toast])

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Products</h1>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
