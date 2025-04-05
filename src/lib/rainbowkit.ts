import '@rainbow-me/rainbowkit/styles.css'
import {
  getDefaultWallets,
  connectorsForWallets,
  RainbowKitProvider,
  lightTheme,
  darkTheme,
  DisclaimerComponent,
} from '@rainbow-me/rainbowkit'
import { configureChains, createConfig } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { alchemyProvider } from 'wagmi/providers/alchemy'
import * as wagmiChains from 'wagmi/chains'
import { isInIframe } from './utils'

// Configure supported chains - currently only Polygon and Polygon Mumbai (testnet)
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [
    wagmiChains.polygon,
    wagmiChains.polygonMumbai,
  ],
  [
    alchemyProvider({ apiKey: import.meta.env.VITE_ALCHEMY_ID || '' }),
    publicProvider(),
  ]
)

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ''

const appName = "Merchant Yapp ENS: merchant-yapp.yodl.eth"
const appUrl = "https://merchant-yapp.lovable.app"
const appIcon = "https://merchant-yapp.lovable.app/logo.png"

const disclaimer: DisclaimerComponent = ({ Text, Link }) => (
  <Text>
    By connecting your wallet, you agree to the{' '}
    <Link href="https://termsofservice.xyz">Terms of Service</Link> and
    acknowledge you have read and understand the protocol{' '}
    <Link href="https://disclaimer.xyz">Disclaimer</Link>
  </Text>
)

// Get connectors for wallets
const { wallets } = getDefaultWallets({
  appName,
  projectId,
  chains,
})

const connectors = connectorsForWallets([
  ...wallets,
])

// Create Wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
})

// Export chains for use in app
export { chains }

// Export RainbowKitProvider with custom configuration
export const CustomRainbowKitProvider = ({ children }: { children: React.ReactNode }) => {
  const isIframe = isInIframe()
  
  return (
    <RainbowKitProvider
      chains={chains}
      appInfo={{
        appName,
        disclaimer,
        learnMoreUrl: appUrl,
      }}
      modalSize={isIframe ? "compact" : "wide"}
      theme={{
        lightMode: lightTheme({
          accentColor: '#7c3aed', // purple-600
          borderRadius: 'medium'
        }),
        darkMode: darkTheme({
          accentColor: '#7c3aed', // purple-600
          borderRadius: 'medium'
        }),
      }}
    >
      {children}
    </RainbowKitProvider>
  )
}; 