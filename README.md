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
- **QR Code Verification**: Enhanced scanning capabilities for both URL and JSON QR codes
- **Verification Page**: Customer-facing verification page showing payment status and details
- **Telegram Integration**: Optional direct customer communication with product information
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

> ⚠️ **Important**: This config supports both ENS names and wallet addresses:
> - `ens`: Your ENS name which is used as the primary identifier in Yodl payment links
> - `address`: Your wallet address as fallback for authentication
>
> The system will:
> - Always use ENS for payments if available
> - Fall back to the wallet address for admin verification if ENS resolution fails
> - Support authentication via either the ENS name or wallet address
>
> When using Ethereum addresses, they must be lowercase.

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
    // Your products will go here
  ]
}
```

> ℹ️ **Note**: The shop will automatically use the wallet address or ENS from `admin.json` as the payment receiving address.
> ℹ️ **Note**: The `telegramHandle` is optional. If left empty, the "Contact Seller on Telegram" button will not be displayed.

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

The enhanced scanner now supports:
- Scanning URL-based QR codes from verification pages
- Scanning JSON-based QR codes with product and payment details
- Display of product emoji and description
- Display of buyer wallet address
- Transaction verification with links to block explorer

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
- Direct "Contact Seller on Telegram" button (if telegramHandle is configured)

### Order Verification

The application now includes a dedicated verification page accessed by scanning the QR code:
- Shows product details including emoji and description
- Displays payment status (pending or confirmed)
- Shows transaction details with links to block explorer
- Includes buyer's wallet address for verification
- Links to shop information and contact details

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

### Telegram Integration (Optional)

The application provides an optional way for customers to contact sellers:

1. Set your Telegram handle in the `telegramHandle` field in shops.json
2. When customers complete a purchase, they can click the "Contact Seller on Telegram" button
3. This opens Telegram with a pre-filled message including product name and transaction details
4. If you leave the telegramHandle empty, the button will not be displayed

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

### Iframe Embedding

This application is designed to be easily embedded in iframes, making it ideal for integration with other websites:

1. **Basic embedding**:
```html
<iframe 
  src="https://merchant-yapp.lovable.app" 
  width="100%" 
  height="600px" 
  frameborder="0"
  allow="clipboard-read; clipboard-write; web-share; payment"
></iframe>
```

2. **Responsive embedding with dynamic height**:
```html
<div style="position: relative; padding-bottom: 120%; height: 0; overflow: hidden; max-width: 100%;">
  <iframe
    src="https://merchant-yapp.lovable.app"
    frameborder="0"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
    allow="clipboard-read; clipboard-write; web-share; payment"
  ></iframe>
</div>
```

3. **Advanced embedding with navbar support**:
```html
<div id="yapp-container" style="position: relative; width: 100%; height: 600px;">
  <iframe
    id="yapp-iframe" 
    src="https://merchant-yapp.lovable.app"
    style="width: 100%; height: 100%; border: none;"
    allow="clipboard-read; clipboard-write; web-share; payment"
  ></iframe>
</div>

<script>
  // Handle iframe sizing and navbar visibility
  window.addEventListener('message', (event) => {
    // Make sure the message is from your app
    if (event.origin !== 'https://merchant-yapp.lovable.app') return;
    
    const container = document.getElementById('yapp-container');
    const iframe = document.getElementById('yapp-iframe');
    
    // Handle specific message types
    if (event.data.type === 'IFRAME_READY' || event.data.type === 'RESIZE') {
      // Get the height and navbar height from the message
      const totalHeight = event.data.height || 600;
      const navbarHeight = event.data.navbarHeight || 0;
      
      // Set minimum height to ensure navbar is visible
      const minHeight = Math.max(totalHeight, 400);
      
      // Apply padding to container to account for navbar
      container.style.paddingTop = navbarHeight + 'px';
      iframe.style.height = minHeight + 'px';
    }
    
    // Handle URL opening requests
    if (event.data.type === 'OPEN_URL') {
      window.open(event.data.url, event.data.target);
    }
  });
</script>
```

4. **Handling parent window communication**:
The application sends several types of messages to the parent window:

```javascript
// Available message types from the iframe
{
  // Sent when the iframe is fully loaded and ready
  type: 'IFRAME_READY',
  height: 1200,           // Suggested height in pixels
  navbarHeight: 64        // Height of the navigation bar
}

// Sent when content size changes
{
  type: 'RESIZE',
  height: 1500,           // New suggested height
  navbarHeight: 64        // Height of the navigation bar
}

// Sent when a link should be opened from the iframe
{
  type: 'OPEN_URL',
  url: 'https://example.com',  // URL to open
  target: '_blank'             // Target (_blank, _self, etc)
}
```

## ❓ Troubleshooting

### Common Issues

1. **Admin features not showing**: 
   - Ensure your wallet address or ENS in `admin.json` is lowercase
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

## 🔄 Setting Up Yapp After Forking

Important: Make sure your wallet already has an ENS. If not, head back to yodl.me, connect the wallet you're gonna use for your yapp and create a yodl handle for it.

If you've forked this project and want to set up your own ENS identity, follow these steps in JustaName:
1. Go to [JustaName](https://app.justaname.id/) and connect your wallet
2. Set up your profile by adding:
   - Profile picture (avatar)
   - Header image
   - Website URL (your deployed app URL)
   
3. Add the following custom ENS records by clicking the "+" button for each:

| Key Field | Value Field |
|-----------|-------------|
| me.yodl.type | yapp |

4. Important steps for adding records:
   - Enter the key field and value field exactly as shown above
   - Click + to add the record
   - After adding, go back and click "Save"

These custom records allow your app to work correctly with the Yodl and show up as a yapp. Next step would be to follow the ENS/subdomain from Yodl (or EFP).

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
