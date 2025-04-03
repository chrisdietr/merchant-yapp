import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, optimism } from 'wagmi/chains'

// Use projectId from environment or fallback
const projectId = '08ab6e0bb13605f4b9d678b99067a0c2'

// Include Optimism chain (chain ID 10) since transaction data shows it's being used
const chains = [mainnet, sepolia, optimism] as const

// Get the actual website URL for metadata - ensure this runs only once
const getAppUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR
  return 'https://merchant-yapp.vercel.app';
};

// Set walletConnectOptions with custom projectId to prevent default initialization
const walletConnectOptions = {
  projectId, 
  showQrModal: true,
  qrModalOptions: { themeMode: 'light' }
};

// Create wallets configuration
const { connectors } = getDefaultWallets({
  appName: 'Merchant Yapp',
  projectId,
  // Use the correct URL for metadata
  appUrl: getAppUrl(),
});

// Create a single config instance
export const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [optimism.id]: http(),
  },
  connectors,
}); 