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

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => {
      window.removeEventListener('resize', checkIsMobile)
    }
  }, [])

  useEffect(() => {
    setIsIframe(isInIframe())
  }, [])

  const homeLink = location.pathname === "/" ? null : "/"
  const hasAdminAccess = isAdmin && isAuthenticated

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true)
      const success = await signIn()
    } catch (error) {
      console.error('Error during sign in from Layout:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

  const iframeStyles = isIframe ? {
    padding: '0',
    border: 'none',
  } : {}

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300" style={iframeStyles}>
      <header className={`sticky ${isIframe ? 'top-10' : 'top-0'} z-50 border-b border-purple-200/50 dark:border-white/15 bg-white/90 dark:bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-background/60`}>
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 sm:px-6">
          {/* Title container - centered vertically */}
          <div className="flex items-center h-full mr-4">
            <Link 
              to="/" 
              className="text-base md:text-xl font-bold text-purple-800 dark:text-white hover:text-primary leading-none"
            >
              Merchant Yapp
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-end">
            <div className="flex items-center space-x-2 md:space-x-4">
              {hasAdminAccess && (
                <Link 
                  to="/admin/scanner"
                  className="flex items-center gap-1 text-xs md:text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300"
                  aria-label="Admin Scanner"
                >
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

              {hasAdminAccess && !isMobile && (
                <div className="hidden md:flex items-center">
                  <span className="animate-pulse inline-block w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"></span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Admin</span>
                </div>
              )}

              <ThemeToggle />
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      </header>

      <main className={isIframe ? "pt-14 py-2 px-2" : "container py-6 px-4 md:py-8 md:px-6"}>
        {children || <Outlet />}
      </main>
    </div>
  )
}
