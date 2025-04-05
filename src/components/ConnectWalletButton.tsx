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
  }, [isAdmin, isAuthenticated, signIn]);
  
  // When in Yodl iframe and we have a detected address, show custom button
  if (isYodlIframe && yodlAddress) {
    return (
      <div className="flex items-center gap-2">
        {isAdmin && !isAuthenticated && (
          <Button 
            variant="outline" 
            size="sm"
            className="border-purple-300/50 hover:bg-purple-50/50 dark:border-white/20 dark:hover:bg-white/10"
            onClick={() => {
              setIsConnecting(true);
              signIn().finally(() => setIsConnecting(false));
            }}
            disabled={isConnecting}
          >
            {isConnecting ? 'Signing...' : 'Sign-In'}
          </Button>
        )}
        
        <Button 
          variant="outline" 
          size="sm"
          className="border-purple-300/50 bg-purple-50/20 dark:border-white/20 dark:bg-white/5 cursor-default"
        >
          <span className="mr-2 h-2 w-2 rounded-full bg-green-500"></span>
          Connected via Yodl
        </Button>
      </div>
    );
  }
  
  // Default to RainbowKit's ConnectButton
  return (
    <ConnectButton 
      showBalance={false}
      chainStatus="none"
      accountStatus="address"
      label="Connect"
    />
  );
} 