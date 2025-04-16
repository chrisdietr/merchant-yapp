import { Suspense, useEffect } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import { createConfig, http, WagmiConfig } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base, gnosis } from 'wagmi/chains';
import { YodlProvider, useYodl } from './contexts/YodlContext';
import Home from "./components/home";
import OrderConfirmation from "./components/OrderConfirmation";
import PaymentBridge from "./components/PaymentBridge";
import routes from "tempo-routes";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './contexts/ThemeContext';

const chains = [mainnet, polygon, optimism, arbitrum, base, gnosis] as const;

const { connectors } = getDefaultWallets({
  appName: 'Merchant Yapp',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
});

const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [gnosis.id]: http(),
  },
});

const queryClient = new QueryClient();

// Wrapper for the application content with iframe detection
function AppContent() {
  const { isInIframe } = useYodl();
  
  // Add basic CSS fixes for mobile/tablet devices
  useEffect(() => {
    // Add a style tag to ensure iframes are clickable on mobile/tablet
    const style = document.createElement('style');
    style.textContent = `
      /* Ensure iframes are generally accessible */
      iframe {
        pointer-events: auto !important;
        touch-action: auto !important;
        z-index: 10 !important; /* Keep a reasonable z-index */
      }
      
      /* Basic iOS iframe scrolling */
      .iframe-container {
        -webkit-overflow-scrolling: touch;
        overflow: auto;
      }
      
      /* Basic Yodl iframe styling */
      iframe[src*="yodl.me"] {
        position: relative !important; /* Default to relative */
        min-height: 500px; /* Ensure minimum height */
        background-color: white !important;
      }
      
      /* Mobile wallet UI fixes */
      [data-rk] > div {
        z-index: 99999 !important;
        position: fixed !important;
      }
      
      /* RainbowKit wallet connect button popover positioning */
      [data-rk] div[data-rk-component="ConnectButtonRenderer"] > div {
        transform: none !important;
        position: fixed !important;
        inset: auto !important;
        right: 0 !important;
        left: 0 !important;
        top: auto !important;
        bottom: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
        z-index: 2147483647 !important;
        border-radius: 12px 12px 0 0 !important;
        padding-bottom: env(safe-area-inset-bottom) !important;
      }
      
      @media (min-width: 768px) {
        /* Fix wallet UI on desktop */
        [data-rk] div[data-rk-component="ConnectButtonRenderer"] > div {
          transform: none !important;
          position: absolute !important;
          inset: auto !important;
          right: 0 !important;
          left: auto !important;
          top: 100% !important;
          bottom: auto !important;
          width: auto !important;
          border-radius: 12px !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    // REMOVED overlay logic and dynamic mobile styling
    
    return () => {
      document.head.removeChild(style);
    };
  }, []); // Run only once on mount
  
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <div className={`bg-background text-foreground min-h-screen ${isInIframe ? 'iframe-mode' : ''}`}>
        <PaymentBridge />
        
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/confirmation" element={<OrderConfirmation />} />
        </Routes>
        {import.meta.env.VITE_TEMPO === "true" && useRoutes(routes)}
      </div>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiConfig config={wagmiConfig}>
          <RainbowKitProvider
            modalSize="compact"
            showRecentTransactions={true}
            coolMode
          >
            <YodlProvider>
              <AppContent />
            </YodlProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
