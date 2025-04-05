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
  const [isSigningIn, setIsSigningIn] = useState(false)

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
  
  // Handle sign in with proper loading state
  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      console.log('Attempting to sign in from Layout...');
      const success = await signIn();
      console.log('Sign in result from Layout:', success);
    } catch (error) {
      console.error('Error during sign in from Layout:', error);
    } finally {
      setIsSigningIn(false);
    }
  };

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
        <div className="container flex h-14 md:h-16 items-center relative">
          {/* Left section for admin scanner */}
          <div className="flex-1 flex items-center">
            {/* Admin Scanner link - only show if admin AND authenticated */}
            {hasAdminAccess && (
              <Link 
                to="/admin/scanner"
                className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                aria-label="Admin Scanner"
              >
                {/* QR Code icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:w-4 md:h-4">
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
                <span className="hidden md:inline">Admin Scanner</span>
              </Link>
            )}
            
            {/* Admin Indicator - show on desktop */}
            {hasAdminAccess && !isMobile && (
              <div className="hidden md:flex items-center ml-4">
                <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"></span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">Admin</span>
              </div>
            )}
          </div>
          
          {/* Center the title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center my-auto">
            <Link 
              to="/" 
              className="text-base md:text-xl font-bold text-purple-800 dark:text-white hover:text-primary"
            >
              Merchant Yapp
            </Link>
          </div>
          
          {/* Right section for controls */}
          <div className="flex-1 flex items-center justify-end gap-1 md:gap-4">
            {/* Theme toggle before wallet connect */}
            <ThemeToggle />
            
            {/* Use our custom ConnectWalletButton that handles Yodl iframe scenarios */}
            <ConnectWalletButton />
          </div>
        </div>
      </header>
      
      <main className={isIframe ? "pt-14 py-2 px-2" : "container py-6 px-4 md:py-8 md:px-6"}>
        {children || <Outlet />}
      </main>
    </div>
  )
}

