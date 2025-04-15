# Merchant Yapp

A decentralized point-of-sale application with crypto payments built with React, Vite, RainbowKit, and Yodl SDK. Perfect for merchants who want to accept cryptocurrency payments with a beautiful and intuitive UI.

## Features

- **Wallet Connection**: Easy integration with MetaMask and other wallets via RainbowKit
- **Product Management**: Simple configuration to add, remove, or update products
- **Theme Support**: Beautiful purple theme with both light and dark mode
- **Fully Responsive Design**: Optimized for mobile, tablet, and desktop devices
- **Mobile-Friendly UI**: Fixed navigation bar, touch-optimized buttons, and smooth interactions
- **Order Confirmations**: Clean, shareable receipts with product details and QR codes
- **Telegram Integration**: Direct customer communication with transaction receipts
- **Inventory Management**: Support for in-stock, out-of-stock, and unlimited inventory
- **Environment-Based Configuration**: Easy setup with environment variables
- **Yodl Integration**: Seamless crypto payments through Yodl's SDK

## Payment Processing with Yodl

The application uses Yodl SDK to handle payment processing. The integration supports both iframe and redirect payment flows:

### How It Works

1. **Initialization**: The SDK is initialized once as a singleton in the `YodlProvider` context
2. **Payment Request**: When a customer initiates a purchase, the app creates a payment request with:
   - Product details (name, price, currency)
   - A unique order ID (used for tracking)
   - Customer information (if provided)
   - Redirect URL for completion
3. **Payment Flow**:
   - **Iframe Mode**: When running inside the Yodl platform, payments happen within the page
   - **Redirect Mode**: When running standalone, the user is redirected to complete payment and return
4. **Confirmation**: Upon payment completion, transaction details are saved and confirmation is displayed

### Key Features

- **Automatic Detection**: Identifies whether to use iframe or redirect mode
- **Persistent Storage**: Stores order and payment details in localStorage
- **Error Handling**: Comprehensive error handling for cancellations, timeouts, and failures
- **Cross-device Support**: Order details can be accessed across devices via QR codes
- **Responsive UI**: Adapts payment interface based on device type

### Implementation Notes

The payment system is implemented through:
- `YodlContext.tsx`: Core provider for payment functionality
- `CheckoutModal.tsx`: User interface for payment initiation
- `OrderConfirmation.tsx`: Order status and receipt display
- `PaymentBridge.tsx`: Handles cross-window communication

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or other Web3 wallet
- Basic understanding of React and JavaScript

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/merchant-yapp.git
cd merchant-yapp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure your environment:
   - Copy `.env.example` to `.env`
   - Add your WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Configure your admin and shop settings (see Configuration section below)
   - **IMPORTANT**: Never commit your `.env` file to source control

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Configuration

The app is configured using environment variables. These can be set in your `.env` file for local development or through your hosting service for production.

### Shop Configuration

The shop configuration in the `.env` file is formatted as a multi-line JSON string for better readability. Each product is on its own line, making it easy to add, remove, or edit products.

Example format:
```
VITE_SHOP_CONFIG={"shops":[{"name":"Your Shop Name","telegramHandle":"your_telegram"}],"products":[
{"id":"1","name":"T-Shirt","description":"Premium cotton t-shirt","price":0.1,"currency":"USD","emoji":"👕","inStock":true},
{"id":"2","name":"Hat","description":"One size fits all","price":0.05,"currency":"EUR","emoji":"🧢","inStock":true}
]}
```

To add a new product, simply add a new line with the product details following the same format.

### Step 1: Configure Your Admin Wallet

Add the following to your `.env` file:

```
VITE_ADMIN_CONFIG={"admins":[{"ens":"YOUR_ENS_NAME.eth","address":"0xYOUR_WALLET_ADDRESS"}]}
```

This JSON string contains:
- `admins`: An array of admin wallets
  - `ens`: Your ENS name (optional if address is provided)
  - `address`: Your Ethereum wallet address (optional if ENS is provided)

## Product Configuration Options

| Field | Description | Example Values |
|-------|-------------|----------------|
| id | Unique identifier for the product | "1", "coffee-01" |
| name | Product name | "Coffee", "T-Shirt" |
| description | Short product description | "Freshly brewed" |
| price | Product price (decimal) | 0.1, 25, 199.99 |
| currency | Currency code | "BRL", "USD", "EUR", "CHF", "THB" |
| emoji | Visual representation | "☕", "👕", "🧢" |
| inStock | Availability status | true, false, "infinite" |

### Environment Configuration Security

The configuration uses Zod for validation and will throw an error if the configuration is invalid. This ensures that:

1. All required fields are present
2. Field types are correct
3. Array requirements are met (e.g., at least one admin is configured)

## Deployment

To deploy your application:

1. Build the production version:
```bash
npm run build
# or
yarn build
```

2. The build output will be in the `dist` directory
3. Set the required environment variables in your hosting platform
4. Deploy this directory to your web hosting service

See `DEPLOYMENT.md` for detailed deployment instructions, including Vercel and Docker deployment options.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
