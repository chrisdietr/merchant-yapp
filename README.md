# Merchant Yapp

A decentralized point-of-sale application with crypto payments built with React, Vite, RainbowKit, and Sign In with Ethereum (SIWE). Perfect for merchants who want to accept cryptocurrency payments with a beautiful and intuitive UI.

![Merchant Yapp Screenshot](screenshot.png)

## 📋 Features

- **Wallet Connection**: Easy integration with MetaMask and other wallets via RainbowKit
- **Admin Dashboard**: Secure admin area with QR code scanner for order verification
- **Product Management**: Simple configuration to add, remove, or update products
- **Theme Support**: Beautiful purple theme with both light and dark mode
- **Fully Responsive Design**: Optimized for mobile, tablet, and desktop devices
- **Mobile-Friendly UI**: Hamburger menu, touch-optimized buttons, and smooth interactions
- **Order Confirmations**: Clean, shareable receipts with product details and QR codes
- **Telegram Integration**: Direct customer communication with product information
- **Inventory Management**: Support for in-stock, out-of-stock, and unlimited inventory
- **Security**: Admin privileges locked to specific wallet addresses

## 🚀 Quick Start

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

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to `http://localhost:5173`

## ⚙️ Configuration

### Step 1: Configure Your Admin Wallet

1. Open `src/config/admin.json` and replace the wallet address with your own:

```json
{
  "admins": [
    "YOUR_WALLET_ADDRESS_HERE"
  ]
}
```

> ⚠️ **Important**: Wallet addresses in `admin.json` must be lowercase. This ensures authentication works properly.

### Step 2: Configure Your Shop

1. Open `src/config/shops.json` and customize your shop information:

```json
{
  "shops": [
    {
      "ownerAddress": "YOUR_WALLET_ADDRESS_HERE",
      "name": "Your Shop Name",
      "telegramHandle": "your_telegram_handle"
    }
  ],
  "products": [
    // Your products will go here
  ]
}
```

> ℹ️ **Note**: The `ownerAddress` in your shop configuration is automatically used for all products. You don't need to specify an owner for each product.

### Step 3: Add Products

Add your products to the `products` array in `src/config/shops.json`:

```json
"products": [
  {
    "id": "1",
    "name": "T-Shirt",
    "description": "Premium cotton t-shirt",
    "price": 0.1,
    "currency": "BRL",
    "emoji": "👕",
    "inStock": true
  },
  {
    "id": "2",
    "name": "Coffee",
    "description": "Fresh brewed coffee",
    "price": 0.05,
    "currency": "BRL",
    "emoji": "☕",
    "inStock": "infinite"
  },
  {
    "id": "3",
    "name": "Limited Edition Hat",
    "description": "Currently unavailable",
    "price": 0.2,
    "currency": "BRL",
    "emoji": "🧢",
    "inStock": false
  }
]
```

#### Product Configuration Options:

| Field | Description | Example Values |
|-------|-------------|----------------|
| id | Unique identifier for the product | "1", "coffee-01" |
| name | Product name | "Coffee", "T-Shirt" |
| description | Short product description | "Freshly brewed" |
| price | Product price (decimal) | 0.1, 25, 199.99 |
| currency | Currency code | "BRL", "USD", "EUR", "CHF", "THB" |
| emoji | Visual representation | "☕", "👕", "🧢" |
| inStock | Availability status | true, false, "infinite" |

> **Note**: The `inStock` field now supports three states:
> - `true` - The product is in stock and available for purchase
> - `false` - The product is out of stock and cannot be purchased
> - `"infinite"` - The product has unlimited stock

## 🔐 Admin Access

### Accessing Admin Features

1. **Connect your wallet** using the "Connect" button in the top right
2. **Sign in** with your wallet when prompted
3. If your wallet address matches one in `admin.json`, you'll see:
   - An "Admin" indicator in the navigation bar
   - Access to the "Admin Scanner" link
   - Admin tools section on the homepage

### Admin QR Scanner

The Admin QR Scanner allows you to verify customer orders by scanning QR codes. To access it:

1. Connect with an admin wallet
2. Click the "Admin Scanner" link in the navigation
3. Use the scanner to verify payment details from customer QR codes

## 🛒 Customer Experience

### Mobile-Friendly Shopping

The application is fully optimized for mobile devices with:
- Touch-friendly buttons and interactions
- Responsive product grids that adapt to screen size
- Collapsible mobile menu for navigation
- Optimized font sizes and spacing

### Order Confirmation

After a successful purchase, customers will receive a confirmation page that includes:
- Product name and purchase details
- QR code for order verification
- Transaction details with full transaction hash
- Option to save the confirmation to their device's gallery
- Direct "Contact Seller on Telegram" button with pre-filled message

## 🎨 Customization

### Modifying Colors

The application uses Tailwind CSS with custom theming. To change the color scheme:

1. Open `src/index.css` and modify the color variables:

```css
:root {
  /* Light mode theme */
  --background: 0 0% 100%;
  --foreground: 270 50% 30%;
  --primary: 276 100% 65%;
  /* Add or modify other color variables */
}

.dark {
  /* Dark mode theme */
  --background: 270 50% 10%;
  --foreground: 0 0% 98%;
  /* Add or modify dark mode color variables */
}
```

### Adding Custom Styling

Add custom styling to the application by editing:

- `src/index.css` for global styles
- Component-specific styles in their respective files

## 🛠️ Advanced Configuration

### Supported Currencies

The application supports several currencies. To use a different currency:

1. Update the `currency` field in your product configuration
2. Available options: "USD", "EUR", "CHF", "BRL", "THB"

### Payment Processing

This application integrates with Yodl payment system. To configure your payment settings:

1. Set your wallet address in the `ownerAddress` field of your shop in shops.json
2. Ensure your wallet is properly set up to receive the specified currencies

### Telegram Integration

The application provides a direct way for customers to contact sellers:

1. Set your Telegram handle in the `shops.json` file
2. When customers complete a purchase, they can click the "Contact Seller on Telegram" button
3. This opens Telegram with a pre-filled message including product name and transaction details

## 📱 Deployment

To deploy your application:

1. Build the production version:
```bash
npm run build
# or
yarn build
```

2. The build output will be in the `dist` directory
3. Deploy this directory to your web hosting service

## ❓ Troubleshooting

### Common Issues

1. **Admin features not showing**: 
   - Ensure your wallet address in `admin.json` is lowercase
   - Check that you've connected with the correct wallet
   - Verify you've signed the authentication message

2. **Products not displaying**:
   - Check `shops.json` for proper formatting
   - Ensure all required fields are included for each product
   - Verify the file is in the correct location (`src/config/shops.json`)

3. **Wallet connection issues**:
   - Make sure you have MetaMask or another Web3 wallet installed
   - Check that you're on a supported network

4. **Mobile display issues**:
   - Ensure your viewport meta tag is properly set
   - Test on multiple devices or use browser developer tools device emulation
   - Check that media queries are working correctly

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
