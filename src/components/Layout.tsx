import { ThemeToggle } from "@/components/ThemeToggle"
import { useAccount } from "wagmi"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "./ui/button"
import { Link, useLocation, Outlet } from "react-router-dom"
import { useState, useEffect } from "react"
import { isInIframe } from "@/lib/utils"
import { ConnectWalletButton } from "./ConnectWalletButton"

interface LayoutProps {
  children?: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isConnected } = useAccount()
  const { isAuthenticated, isAdmin, signIn, isLoading } = useAuth()
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(false)
  const [isIframe, setIsIframe] = useState(false)

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
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  // Check if we're in an iframe
  useEffect(() => {
    setIsIframe(isInIframe())
  }, [])

  // Only redirect to homepage if we're not already there
  const homeLink = location.pathname === "/" ? null : "/"
  
  // Check if user has admin access (must be both admin AND authenticated)
  const hasAdminAccess = isAdmin && isAuthenticated

  // Adjust layout when in iframe
  const iframeStyles = isIframe ? {
    // More compact layout for iframe
    padding: '0',
    border: 'none',
  } : {}

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300" style={iframeStyles}>
      {/* Always show header, even in iframe, but with adjusted styling */}
      <header className={`sticky ${isIframe ? 'top-10' : 'top-0'} z-50 border-b border-purple-200/50 dark:border-white/15 bg-white/90 dark:bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-background/60`}>
        <div className="container flex flex-col md:flex-row md:h-16 py-2 md:py-0 items-center justify-between relative">
          {/* Center the Merchant Yapp title on mobile */}
          <div className="w-full flex justify-center md:justify-start md:w-auto">
            <Link 
              to="/" 
              className="text-xl font-bold text-purple-800 dark:text-white hover:text-primary md:flex-none flex-shrink-0"
            >
              Merchant Yapp
            </Link>
          </div>
          
          {/* Mobile and Desktop navigation combined */}
          <div className="flex flex-col md:flex-row items-center w-full md:w-auto gap-2 md:gap-4 mt-2 md:mt-0">
            {/* Wallet button on top row for mobile */}
            <div className="w-full flex justify-center md:justify-end md:w-auto mb-2 md:mb-0">
              <ConnectWalletButton />
            </div>
            
            <div className="flex items-center justify-center gap-4 md:gap-2">
              {/* Admin Scanner link - only show if admin AND authenticated */}
              {hasAdminAccess && (
                <Link 
                  to="/admin/scanner"
                  className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                  aria-label="Admin Scanner"
                >
                  {/* QR Code icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                  <span className="inline">Admin Scanner</span>
                </Link>
              )}
              
              {/* Admin Indicator - show on both mobile and desktop */}
              {hasAdminAccess && (
                <div className="flex items-center">
                  <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"></span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Admin</span>
                </div>
              )}
              
              {/* Simple Sign-In button */}
              {isConnected && isAdmin && !isAuthenticated && !isIframe && (
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
              
              {/* Theme toggle below wallet connect on mobile */}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      
      <main className={isIframe ? "pt-20 py-2 px-2" : "container py-6 px-4 md:py-8 md:px-6"}>
        {children || <Outlet />}
      </main>
    </div>
  )
}

