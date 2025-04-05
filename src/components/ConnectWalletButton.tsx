import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import yodlService from '@/lib/yodl';

export function ConnectWalletButton() {
  const { isConnected } = useAccount();
  const { address, isAdmin, isAuthenticated, signIn } = useAuth();
  const [isYodlIframe, setIsYodlIframe] = useState(false);
  const [yodlAddress, setYodlAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  // Check if we're in an iframe on mount
  useEffect(() => {
    const isInIframe = yodlService.isInIframe();
    setIsYodlIframe(isInIframe);
    
    // If in iframe, try to get the connected address
    if (isInIframe) {
      yodlService.getConnectedAccountCached().then(account => {
        if (account) {
          console.log('Using cached Yodl account:', account);
          setYodlAddress(account);
          
          // Auto-sign in with Yodl if admin
          if (isAdmin && !isAuthenticated) {
            signIn().then(success => {
              console.log('Auto-sign in result:', success);
            });
          }
        }
      });
    }
    
    // Check for mobile
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [isAdmin, isAuthenticated, signIn]);

  // Effect to update wallet connected state when isConnected changes
  useEffect(() => {
    if (isConnected) {
      setWalletConnected(true);
    }
  }, [isConnected]);
  
  // Handle sign in with proper loading state
  const handleSignIn = async () => {
    try {
      setIsConnecting(true);
      console.log('Attempting to sign in...');
      const success = await signIn();
      console.log('Sign in result:', success);
    } catch (error) {
      console.error('Error during sign in:', error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // When in Yodl iframe and we have a detected address, show custom button
  if (isYodlIframe && yodlAddress) {
    return (
      <div className="flex items-center gap-1 md:gap-2">
        {isAdmin && !isAuthenticated && (
          <Button 
            variant="outline" 
            size={isMobile ? "xs" : "sm"}
            className="text-xs md:text-sm border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10 px-2 py-1 md:px-3 md:py-1.5"
            onClick={handleSignIn}
            disabled={isConnecting}
          >
            {isConnecting ? 'Signing...' : 'Sign-In'}
          </Button>
        )}
        
        <Button 
          variant="outline" 
          size={isMobile ? "xs" : "sm"}
          className="text-xs md:text-sm border-purple-300/50 bg-purple-50/20 dark:border-white/20 dark:bg-white/5 cursor-default px-2 py-1 md:px-3 md:py-1.5"
        >
          <span className="mr-1 md:mr-2 h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-green-500"></span>
          Connected via Yodl
        </Button>
      </div>
    );
  }
  
  // Default to RainbowKit's ConnectButton with custom styling
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        
        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // Show connect button if not mounted OR (not account AND not walletConnected)
              // This ensures the connect button stays visible even if account disappears after
              // a failed/cancelled authentication
              if (!mounted || (!account && !walletConnected)) {
                return (
                  <Button 
                    onClick={openConnectModal} 
                    variant="outline"
                    size={isMobile ? "xs" : "sm"}
                    className="text-xs md:text-sm border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Connect
                  </Button>
                );
              }

              // If wallet was connected but account isn't available (e.g., after a failed login)
              // still show the connect button
              if (walletConnected && !account) {
                return (
                  <Button 
                    onClick={openConnectModal} 
                    variant="outline"
                    size={isMobile ? "xs" : "sm"}
                    className="text-xs md:text-sm border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10"
                  >
                    Connect
                  </Button>
                );
              }
              
              // If we have an account, show the normal UI
              return (
                <div className="flex items-center gap-1 md:gap-2">
                  {isAdmin && !isAuthenticated && (
                    <Button 
                      variant="outline" 
                      size={isMobile ? "xs" : "sm"}
                      className="text-xs md:text-sm border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10 px-2 py-1 md:px-3 md:py-1.5"
                      onClick={handleSignIn}
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Signing...' : 'Sign-In'}
                    </Button>
                  )}
                  
                  <button
                    onClick={openAccountModal}
                    className="flex h-7 md:h-9 items-center gap-1 rounded-md border border-purple-300/50 bg-white/80 px-2 py-1 md:px-3 md:py-1.5 text-xs md:text-sm font-medium hover:bg-purple-50/50 dark:border-white/20 dark:bg-background/80 dark:hover:bg-white/10"
                  >
                    <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-green-500 mr-1 md:mr-2"></span>
                    <span className="truncate max-w-[80px] md:max-w-[120px]">
                      {account?.displayName || "Connect"}
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
} 