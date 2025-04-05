import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import yodlService from '@/lib/yodl';

export function ConnectWalletButton() {
  const { isConnected } = useAccount();
  const { isAuthenticated, signIn, signOut, isAdmin, isLoading: authLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isYodlIframe, setIsYodlIframe] = useState(false);
  const [yodlAddress, setYodlAddress] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

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
  
  // Custom sign-in handler
  const handleSignIn = async () => {
    try {
      // Reset error state
      setSignInError(null);
      
      // Set loading state
      setIsSigningIn(true);
      
      console.log("Attempting to sign in...");
      
      // Call the sign-in function from auth context
      const success = await signIn();
      
      console.log("Sign in result:", success);
      
      if (!success) {
        setSignInError("Sign-in failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during sign in:", error);
      setSignInError("An error occurred during sign-in");
    } finally {
      setIsSigningIn(false);
    }
  };
  
  // When in Yodl iframe and we have a detected address, show custom button
  if (isYodlIframe && yodlAddress) {
    return (
      <div className="flex items-center gap-1 md:gap-2">
        {!isAuthenticated && isConnected && (
          <Button
            size="sm"
            onClick={handleSignIn}
            disabled={isSigningIn || authLoading}
            className="text-xs bg-purple-600 hover:bg-purple-700 flex items-center"
          >
            {isSigningIn || authLoading ? "Signing in..." : "Sign In"}
          </Button>
        )}
        
        {isAuthenticated && (
          <Button
            size="sm"
            variant="ghost"
            onClick={signOut}
            className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            Sign Out
          </Button>
        )}
        
        {/* Show error message if sign-in failed */}
        {signInError && (
          <div className="text-red-500 text-xs mt-1">{signInError}</div>
        )}
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
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal} size="sm" className="text-xs">
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} size="sm" variant="destructive" className="text-xs">
                    Wrong network
                  </Button>
                );
              }

              return (
                <div className="flex items-center gap-2">
                  {!isAuthenticated && (
                    <Button
                      onClick={handleSignIn}
                      size="sm"
                      disabled={isSigningIn || authLoading}
                      className="text-xs bg-purple-600 hover:bg-purple-700 flex items-center"
                    >
                      {isSigningIn || authLoading ? "Signing in..." : "Sign In"}
                    </Button>
                  )}
                  
                  {isAuthenticated && (
                    <Button
                      onClick={signOut}
                      size="sm"
                      variant="ghost"
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      Sign Out
                    </Button>
                  )}
                  
                  <Button
                    onClick={openAccountModal}
                    size="sm"
                    variant="outline" 
                    className="text-xs"
                  >
                    {account.displayName}
                    {account.displayBalance ? ` (${account.displayBalance})` : ''}
                  </Button>
                </div>
              );
            })()}
            
            {/* Show error message if sign-in failed */}
            {signInError && (
              <div className="text-red-500 text-xs mt-1">{signInError}</div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
} 