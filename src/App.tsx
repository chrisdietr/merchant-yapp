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
  projectId: '08ab6e0bb13605f4b9d678b99067a0c2',
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
  
  // Add CSS fixes for mobile/tablet devices
  useEffect(() => {
    // Detect if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Add a style tag to ensure iframes are clickable on mobile/tablet
    const style = document.createElement('style');
    style.textContent = `
      /* Ensure iframes are properly accessible on mobile/tablet */
      iframe {
        pointer-events: auto !important;
        touch-action: auto !important;
        z-index: 10 !important;
      }
      
      /* Fix for iOS iframe scrolling */
      .iframe-container {
        -webkit-overflow-scrolling: touch;
        overflow: auto;
      }
      
      /* Fix for certain Yodl iframe issues */
      iframe[src*="yodl.me"] {
        position: ${isMobile ? 'fixed' : 'relative'} !important;
        ${isMobile ? 'top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important;' : ''}
        min-height: 500px;
        background-color: white !important;
      }
      
      /* Mobile-specific fullscreen overlay to prevent background content from showing */
      ${isMobile ? `
      .yodl-iframe-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9;
        background-color: white;
        display: none;
      }
      
      .yodl-iframe-overlay.visible {
        display: block;
      }
      ` : ''}
    `;
    document.head.appendChild(style);
    
    // Add a fullscreen overlay element for mobile Yodl iframe
    if (isMobile) {
      const overlay = document.createElement('div');
      overlay.className = 'yodl-iframe-overlay';
      document.body.appendChild(overlay);
      
      // Monitor for Yodl iframes and show the overlay when they appear
      const observer = new MutationObserver((mutations) => {
        const yodlIframes = document.querySelectorAll('iframe[src*="yodl.me"]');
        if (yodlIframes.length > 0) {
          overlay.classList.add('visible');
        } else {
          overlay.classList.remove('visible');
        }
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    }
    
    return () => {
      document.head.removeChild(style);
      const overlay = document.querySelector('.yodl-iframe-overlay');
      if (overlay) {
        document.body.removeChild(overlay);
      }
    };
  }, [isInIframe]);
  
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
          <RainbowKitProvider>
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
