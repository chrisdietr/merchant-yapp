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

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open your browser and navigate to `http://localhost:5173`

## Configuration

### Step 1: Configure Your Admin Wallet

1. Open `src/config/admin.json` and configure your wallet:

```json
{
  "admins": [
    {
      "ens": "YOUR_ENS_NAME.eth",
      "address": "0xYOUR_WALLET_ADDRESS"
    }
  ]
}
```

### Step 2: Configure Your Shop

1. Open `src/config/shops.json` and customize your shop information:

```json
{
  "shops": [
    {
      "name": "Your Shop Name",
      "telegramHandle": "your_telegram_handle"
    }
  ],
  "products": [
    {
      "id": "1",
      "name": "T-Shirt",
      "description": "Premium cotton t-shirt",
      "price": 0.1,
      "currency": "USD",
      "emoji": "👕",
      "inStock": true
    }
  ]
}
```

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

## Deployment

To deploy your application:

1. Build the production version:
```bash
npm run build
# or
yarn build
```

2. The build output will be in the `dist` directory
3. Deploy this directory to your web hosting service

## License

This project is licensed under the MIT License - see the LICENSE file for details.
