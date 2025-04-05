import { useState, useEffect } from "react"
import { ProductCard } from "@/components/ProductCard"
import { Button } from "@/components/ui/button"
import { useAccount } from "wagmi"
import { requireAdmin } from "@/lib/auth"
import { useNavigate, Link } from "react-router-dom"
import { Product } from "@/lib/types"
import shopsData from "@/config/shops.json"
import { useAuth } from "@/contexts/AuthContext"

export default function Index() {
  const [products, setProducts] = useState<Product[]>([])
  const { address } = useAccount()
  const navigate = useNavigate()
  const isAdmin = requireAdmin(address)
  const { isAdmin: authIsAdmin, isAuthenticated } = useAuth()
  
  // Check if user has admin access (must be both admin AND authenticated)
  const hasAdminAccess = authIsAdmin && isAuthenticated

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setProducts(shopsData.products)
      } catch (error) {
        console.error("Error loading products:", error)
      }
    }
    loadProducts()
  }, [])

  const handleDelete = (id: string) => {
    setProducts(products.filter((p) => p.id !== id))
  }

  return (
    <div className="w-full max-w-full py-4 md:py-8">
      <div className="mb-4 md:mb-8 pl-1">
        {/* Admin Scanner Button - only visible for admins */}
        {hasAdminAccess && (
          <Link 
            to="/admin/scanner"
            className="inline-block mb-4 p-2 bg-gradient-to-r from-green-50 to-teal-50 hover:from-green-100 hover:to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 dark:hover:from-green-900/30 dark:hover:to-teal-900/30 rounded-full border border-green-200 dark:border-green-800 shadow-sm"
            aria-label="Admin Scanner"
            title="Admin Scanner"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600 dark:text-green-400">
              <rect x="3" y="3" width="5" height="5" rx="1" />
              <rect x="16" y="3" width="5" height="5" rx="1" />
              <rect x="3" y="16" width="5" height="5" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" />
              <path d="M12 3h.01" />
              <path d="M12 16v.01" />
            </svg>
          </Link>
        )}
        
        <h1 className="text-xl font-medium text-left">Products</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 px-0 max-w-full">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
        ))}
      </div>
    </div>
  )
}
