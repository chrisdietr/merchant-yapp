import { ThemeToggle } from "@/components/ThemeToggle"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "./ui/button"
import { Link, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isConnected } = useAccount()
  const { isAuthenticated, isAdmin, signIn, isLoading } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle screen resize
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Check on mount
    checkIsMobile()
    
    // Add resize listener
    window.addEventListener('resize', checkIsMobile)
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  // Only redirect to homepage if we're not already there
  const homeLink = location.pathname === "/" ? null : "/"
  
  // Check if user has admin access (must be both admin AND authenticated)
  const hasAdminAccess = isAdmin && isAuthenticated;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="sticky top-0 z-10 border-b border-purple-200/50 dark:border-white/15 bg-white/90 dark:bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-bold text-purple-800 dark:text-white hover:text-primary">
            Merchant Yapp
          </Link>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center text-gray-700 dark:text-gray-300 hover:text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Admin Scanner link - only show if admin AND authenticated */}
            {hasAdminAccess && (
              <Link 
                to="/admin/scanner"
                className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="M2 10h20" />
                  <path d="M6 16h.01" />
                  <path d="M12 16h.01" />
                  <path d="M18 16h.01" />
                </svg>
                <span>Admin Scanner</span>
              </Link>
            )}
            
            {/* Admin Indicator - only show a subtle indicator if admin */}
            {hasAdminAccess && (
              <div className="flex items-center">
                <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"></span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Admin</span>
              </div>
            )}
            
            {/* Simple Sign-In button */}
            {isConnected && isAdmin && !isAuthenticated && (
              <Button 
                variant="outline" 
                size="sm"
                className="border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10"
                onClick={() => signIn()}
                disabled={isLoading}
              >
                {isLoading ? 'Signing...' : 'Sign-In'}
              </Button>
            )}
            
            {/* Use the standard ConnectButton with minimal options */}
            <ConnectButton 
              showBalance={false}
              chainStatus="none"
              accountStatus="address"
              label="Connect"
            />
            
            <ThemeToggle />
          </div>
        </div>
        
        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-purple-200/50 dark:border-white/15 bg-white/95 dark:bg-background/95 backdrop-blur-lg py-4">
            <div className="container flex flex-col gap-4">
              {/* Admin Scanner link - only show if admin AND authenticated */}
              {hasAdminAccess && (
                <Link 
                  to="/admin/scanner"
                  className="flex items-center gap-2 py-2 text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="M2 10h20" />
                    <path d="M6 16h.01" />
                    <path d="M12 16h.01" />
                    <path d="M18 16h.01" />
                  </svg>
                  <span>Admin Scanner</span>
                </Link>
              )}
              
              {/* Admin Indicator - only show a subtle indicator if admin */}
              {hasAdminAccess && (
                <div className="flex items-center py-2">
                  <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"></span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Admin</span>
                </div>
              )}
              
              {/* Simple Sign-In button */}
              {isConnected && isAdmin && !isAuthenticated && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10 w-full mb-2"
                  onClick={() => signIn()}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing...' : 'Sign-In'}
                </Button>
              )}
              
              {/* Use the standard ConnectButton with minimal options */}
              <div className="py-2">
                <ConnectButton 
                  showBalance={false}
                  chainStatus="none"
                  accountStatus="address"
                  label="Connect"
                />
              </div>
              
              <div className="py-2 flex justify-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="container py-6 px-4 md:py-8 md:px-6">{children}</main>
    </div>
  )
}
