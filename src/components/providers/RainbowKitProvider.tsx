import '@rainbow-me/rainbowkit/styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '@/config/rainbowkit'
import { RainbowKitProvider as RKProvider } from '@rainbow-me/rainbowkit'
import { useMemo } from 'react'
import { isInIframe } from '@/lib/utils'

// Create a single query client instance that persists across renders
// This helps avoid double initialization issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 0,                 // Don't retry failed queries
    }
  }
});

/**
 * RainbowKitProvider component
 * Basic wallet connection functionality without animations
 */
export function RainbowKitProvider({ children }: { children: React.ReactNode }) {
  // Use a stable config reference to prevent unnecessary re-renders
  const stableConfig = useMemo(() => config, []);
  // Check if we're in an iframe
  const inIframe = useMemo(() => isInIframe(), []);
  
  return (
    <WagmiProvider config={stableConfig}>
      <QueryClientProvider client={queryClient}>
        <RKProvider 
          coolMode={false} 
          showRecentTransactions={false}
          modalSize={inIframe ? "compact" : "wide"}
          initialChain={10} // Set initial chain to Optimism (chainId 10)
        >
          {children}
        </RKProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 