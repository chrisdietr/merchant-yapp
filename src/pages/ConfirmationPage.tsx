import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode.react';
import yodlService from '../lib/yodl';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import { Button } from "@/components/ui/button";
import { formatCurrency } from '../utils/currency';
import { getShopByOwnerAddress, generateTelegramLink, openUrl } from '@/lib/utils';
import html2canvas from 'html2canvas';
import shopsData from "@/config/shops.json";
import { OrderInfo } from '@/lib/yodl';
import { Shop } from '@/lib/types';
import { useAccount, useSignMessage } from 'wagmi';

// Order details interface
interface OrderDetails {
  orderId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  txHash?: string;
  timestamp?: string;
  productName?: string;
  ownerAddress?: string;
  signature?: string;
  messageToSign?: string;
  buyerAddress?: string;
}

// Direct lookup for product names - will use product ID from orderId
const productMap: Record<string, string> = {};

// Initialize product map from shops.json
shopsData.products.forEach((product: any) => {
  productMap[product.id] = product.name;
});

const ConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails>({
    orderId: orderId ? orderId : 'unknown',
    status: 'pending',
    amount: 0,
    currency: 'USD'
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isSigning, setIsSigning] = useState<boolean>(false);
  const [signatureComplete, setSignatureComplete] = useState<boolean>(false);
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // Check if device is mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // Handle message signing for order verification
  const handleSignMessage = async (orderDetails: OrderDetails) => {
    try {
      if (!address) {
        console.error('No wallet address available for message signing');
        return false;
      }

      setIsSigning(true);
      
      // Create message to sign
      const messageToSign = yodlService.createOrderSignMessage(
        orderDetails.orderId,
        orderDetails.amount,
        orderDetails.currency
      );
      
      console.log('Requesting wallet to sign message:', messageToSign);
      
      // Use wagmi to sign the message
      const signature = await signMessageAsync({
        message: messageToSign,
        account: address
      });
      
      console.log('Message signed successfully:', signature);
      
      // Update the order with signature info
      const updatedOrder = {
        ...orderDetails,
        signature,
        messageToSign,
        buyerAddress: address
      };
      
      // Update state and localStorage
      setOrder(updatedOrder);
      
      // Prepare data for storage in OrderInfo format
      const orderInfoData: OrderInfo = {
        orderId: orderDetails.orderId,
        timestamp: orderDetails.timestamp || new Date().toISOString(),
        status: orderDetails.status,
        amount: orderDetails.amount,
        currency: orderDetails.currency,
        signature,
        messageToSign,
        buyerAddress: address,
        txHash: orderDetails.txHash,
        productName: orderDetails.productName,
        ownerAddress: orderDetails.ownerAddress
      };
      
      yodlService.storeOrderInfo(orderDetails.orderId, orderInfoData);
      
      setSignatureComplete(true);
      return true;
    } catch (error) {
      console.error('Error signing message:', error);
      return false;
    } finally {
      setIsSigning(false);
    }
  };

  useEffect(() => {
    // If we don't have an orderId, we can't proceed
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }

    // Check if payment info exists in URL (redirect flow)
    const payment = yodlService.parsePaymentFromUrl();
    
    // Initialize orderInfo with data from localStorage
    const storedOrderInfo = yodlService.getOrderInfo(orderId);
    
    // DEBUG: Directly check all orders in localStorage
    try {
      const allOrders = localStorage.getItem('yodl_orders');
      console.log('All orders in localStorage:', allOrders ? JSON.parse(allOrders) : 'No orders found');
    } catch (e) {
      console.error('Error parsing localStorage orders:', e);
    }
    
    // Debug logging to identify issue
    console.log('Order ID:', orderId);
    console.log('Stored order info:', storedOrderInfo);
    console.log('Product map:', productMap);
    
    // Extract product ID from order ID (format: product_ID_TIMESTAMP)
    let productId = '';
    let foundProductName = '';
    
    if (orderId) {
      const parts = orderId.split('_');
      if (parts.length >= 2 && parts[0] === 'product') {
        productId = parts[1];
        console.log('Product ID extracted:', productId);
        
        // Check if we have this product in our map
        if (productMap[productId]) {
          foundProductName = productMap[productId];
          console.log('Found product name from product map:', foundProductName);
        }
      }
    }
    
    // For testing, explicitly check if we have products in shopsData
    console.log('Available products in shops data:', shopsData.products);
    
    // Check if this looks like a product order ID
    if (orderId && orderId.startsWith('product_')) {
      // Try to find the product name from localStorage or other sources
      try {
        // First try product map
        if (foundProductName) {
          console.log('Using product name from product map:', foundProductName);
          setOrder(prev => ({
            ...prev,
            productName: foundProductName
          }));
        } else {
          // Check shops.json directly for this product ID
          const productFromShops = shopsData.products.find((p: any) => p.id === productId);
          if (productFromShops) {
            console.log('Found product directly in shops.json:', productFromShops.name);
            setOrder(prev => ({
              ...prev,
              productName: productFromShops.name
            }));
          } else {
            // Otherwise try to find from localStorage
            // Attempt to find product name in other stored orders
            const allOrders = localStorage.getItem('yodl_orders');
            if (allOrders) {
              const parsedOrders = JSON.parse(allOrders);
              // Find any order with this product ID pattern that has a product name
              const matchingOrders = Object.values(parsedOrders).filter((order: any) => 
                order.productName && order.orderId && order.orderId.includes(`product_${productId}`)
              );
              console.log('Matching orders with same product ID:', matchingOrders);
              
              if (matchingOrders.length > 0) {
                // Use the product name from the first matching order
                const matchedProductName = (matchingOrders[0] as any).productName;
                console.log('Found product name from other orders:', matchedProductName);
                
                // Update the current order with this product name
                if (matchedProductName && (!storedOrderInfo || !storedOrderInfo.productName)) {
                  console.log('Setting product name from matched order');
                  setOrder(prev => ({
                    ...prev,
                    productName: matchedProductName
                  }));
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error trying to find product name:', e);
      }
    }
    
    if (storedOrderInfo) {
      // Update order with stored info
      setOrder(prev => ({
        ...prev,
        ...storedOrderInfo,
        orderId,
        // Ensure product name is assigned if available
        productName: storedOrderInfo.productName || prev.productName,
      }));
      
      // Try to get shop info if ownerAddress is available
      if (storedOrderInfo.ownerAddress) {
        const shop = getShopByOwnerAddress(storedOrderInfo.ownerAddress);
        setShopInfo(shop);
      }
      
      // Set signature complete flag if we already have a signature
      if (storedOrderInfo.signature && storedOrderInfo.messageToSign) {
        setSignatureComplete(true);
      }
    }

    // If we have a payment from URL, update order and fetch details
    if (payment && payment.txHash) {
      setOrder(prev => ({
        ...prev,
        txHash: payment.txHash,
        status: 'completed',
      }));

      // Store the transaction hash in the order info
      if (storedOrderInfo) {
        const updatedOrderInfo: OrderInfo = {
          ...storedOrderInfo,
          orderId,
          txHash: payment.txHash,
          status: 'completed',
          timestamp: storedOrderInfo.timestamp || new Date().toISOString(),
        };
        yodlService.storeOrderInfo(orderId, updatedOrderInfo);
      }

      // Fetch payment details from Yodl
      fetchPaymentDetails(payment.txHash);
      
      // Clean URL parameters
      yodlService.cleanPaymentUrl();
    } else if (storedOrderInfo && storedOrderInfo.txHash) {
      // If we have a stored txHash, fetch payment details
      fetchPaymentDetails(storedOrderInfo.txHash);
    } else {
      setLoading(false);
    }
  }, [orderId]);

  // Process verified payment and initiate signature if needed
  useEffect(() => {
    const processVerifiedPayment = async () => {
      // Only proceed if not already signing, not already signed, payment confirmed, and we have order details
      if (!isSigning && !signatureComplete && order.status === 'completed' && !loading && address) {
        console.log('Order confirmed, requesting message signature...');
        
        // Check if we already have a signature
        if (order.signature && order.messageToSign) {
          console.log('Order already has signature, skipping signature request');
          setSignatureComplete(true);
          return;
        }
        
        // Request signature
        await handleSignMessage(order);
      }
    };
    
    processVerifiedPayment();
  }, [loading, order.status, signatureComplete, isSigning, address]);

  // Fetch payment details from Yodl API
  const fetchPaymentDetails = async (txHash: string) => {
    try {
      setLoading(true);
      console.log(`Fetching payment details for transaction: ${txHash}`);
      const paymentDetails = await yodlService.fetchPaymentDetails(txHash);
      
      if (paymentDetails) {
        console.log('Payment details received:', paymentDetails);
        
        // Extract relevant details from the API response
        // The new API may have different field names
        const mappedDetails = {
          // Need to include the orderId
          orderId: orderId as string,
          // Keep existing txHash
          txHash,
          // Map API response fields to our OrderDetails interface
          // Ensure amount is parsed as a number if it's a string
          amount: parseFloat(paymentDetails.amount || paymentDetails.tokenOutAmount || paymentDetails.invoiceAmount || order.amount) || order.amount,
          currency: paymentDetails.currency || paymentDetails.tokenOutSymbol || paymentDetails.invoiceCurrency || order.currency,
          timestamp: paymentDetails.timestamp || paymentDetails.blockTimestamp || paymentDetails.created || new Date().toISOString(),
          // Always keep status as 'completed' once confirmed - explicitly typed
          status: 'completed' as const,
          // Keep product name and owner address if available
          productName: order.productName || paymentDetails.productName,
          ownerAddress: order.ownerAddress || paymentDetails.ownerAddress,
        };
        
        console.log('Mapped payment details with product name:', mappedDetails);
        
        // Update order with payment details
        setOrder(prev => ({
          ...prev,
          ...mappedDetails,
        }));
        
        // Update order info in localStorage
        yodlService.storeOrderInfo(orderId as string, mappedDetails as OrderInfo);
        
        // Try to get shop info if ownerAddress is available
        if (mappedDetails.ownerAddress) {
          const shop = getShopByOwnerAddress(mappedDetails.ownerAddress);
          setShopInfo(shop);
        }
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
      // Don't set error state, just log it
      // We'll still show the basic confirmation with stored info
    } finally {
      setLoading(false);
    }
  };

  // Function to save confirmation to gallery
  const saveConfirmation = async () => {
    if (!previewCardRef.current) return;
    
    try {
      // Temporarily make the card visible for capturing
      const previewCard = previewCardRef.current;
      const originalStyles = {
        position: previewCard.style.position,
        left: previewCard.style.left,
        opacity: previewCard.style.opacity
      };
      
      // Make it visible in the DOM but below the fold
      previewCard.style.position = 'fixed';
      previewCard.style.left = '0';
      previewCard.style.top = '100vh';  // Position it just below the viewport
      previewCard.style.opacity = '1';
      previewCard.style.zIndex = '9999';
      
      // Wait for styles to apply and DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Capture the now-visible element
      const canvas = await html2canvas(previewCard, {
        backgroundColor: document.body.classList.contains('dark') ? '#25104a' : '#ffffff',
        scale: 2, // Higher quality
        logging: true, // Enable logging for troubleshooting
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          // Don't ignore any elements
          return false;
        }
      });
      
      // Reset original styles
      previewCard.style.position = originalStyles.position;
      previewCard.style.left = originalStyles.left;
      previewCard.style.opacity = originalStyles.opacity;
      
      // Create an anchor element to download the image
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `order-${order.orderId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error saving confirmation:', error);
      alert('Failed to save confirmation');
    }
  };

  // Function to copy social share link
  const copySocialShareLink = () => {
    const shareLink = `https://merchant-yapp.lovable.app/verify/${order.orderId}${order.txHash ? `/${order.txHash}` : ''}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
        alert('Failed to copy link. Please try again.');
      });
  };

  // Get the order QR code value - includes transaction hash and signature data if available
  const getOrderQRValue = () => {
    // First check if we have signature data to include
    if (order.signature && order.messageToSign && order.buyerAddress) {
      console.log('Using signature data for QR code');
      // Include signature verification data in the QR code
      return yodlService.getOrderQRData(order.orderId);
    }
    
    // Fallback to URL-based verification
    const baseUrl = window.location.origin;
    if (order.txHash) {
      return `${baseUrl}/verify/${order.orderId}/${order.txHash}`;
    }
    return `${baseUrl}/verify/${order.orderId}`;
  };
  
  // Generate the Telegram message with order details
  const getTelegramMessage = () => {
    // Use the robust getProductName function instead of fallback
    const productName = getProductName();
    
    // Get proper shop name, similar to the telegramHandle logic
    let shopName = 'your shop';
    
    // First try to get shop name from shopInfo
    if (shopInfo && shopInfo.name) {
      shopName = shopInfo.name;
    } 
    // If not found, try to find shop from ownerAddress
    else if (order.ownerAddress) {
      const shop = getShopByOwnerAddress(order.ownerAddress);
      if (shop && shop.name) {
        shopName = shop.name;
      }
    }
    // Last resort: use first shop name from config
    else if (shopsData.shops && shopsData.shops.length > 0) {
      shopName = shopsData.shops[0].name || 'your shop';
    }
    
    // Add transaction receipt link if available
    let receiptLink = '';
    if (order.txHash) {
      receiptLink = `\n\nHere is the receipt: yodl.me/tx/${order.txHash}`;
    }
    
    return `Hey, I just bought ${productName} from ${shopName}. Where can I pick it up from?${receiptLink}`;
  };

  // Find product emoji from productId in the orderId
  const getProductEmoji = () => {
    if (orderId && orderId.startsWith('product_')) {
      const productId = orderId.split('_')[1];
      const product = shopsData.products.find((p: any) => p.id === productId);
      return product?.emoji || '🛒';
    }
    return '🛒'; // Default shopping cart emoji
  };

  // Get product name for display
  const getProductName = () => {
    // If we have a product name directly, use it
    if (order.productName) {
      console.log('Using order.productName:', order.productName);
      return order.productName;
    }
    
    // Otherwise try to derive it from the order ID
    if (order.orderId && order.orderId.startsWith('product_')) {
      const productId = order.orderId.split('_')[1];
      console.log('Extracted productId from orderId:', productId);
      
      // Try to find from shops data first (most accurate source)
      const productFromShops = shopsData.products.find((p: any) => p.id === productId);
      if (productFromShops) {
        console.log('Found in shopsData:', productFromShops.name);
        return productFromShops.name;
      }
      
      // Last resort: show a basic name with the product ID
      console.log('Using fallback product ID name');
      return `Product #${productId}`;
    }
    
    // Absolute fallback
    console.log('Using unknown product fallback');
    return 'Unknown Product';
  };

  // Helper function to get telegram handle from shops config
  const getShopTelegramHandle = () => {
    // First check if shopInfo has a telegramHandle
    if (shopInfo && shopInfo.telegramHandle) {
      console.log('Found telegramHandle in shopInfo:', shopInfo.telegramHandle);
      return shopInfo.telegramHandle;
    }

    // If we have an ownerAddress, look it up again in shops config
    if (order.ownerAddress) {
      const shop = getShopByOwnerAddress(order.ownerAddress);
      console.log('Looking up shop by ownerAddress:', order.ownerAddress, shop);
      if (shop && shop.telegramHandle) {
        return shop.telegramHandle;
      }
    }

    // Last resort: check if we can find the first shop with a telegramHandle
    // Extract product ID from order ID (format: product_ID_TIMESTAMP)
    if (orderId && orderId.startsWith('product_')) {
      const productId = orderId.split('_')[1];
      console.log('Finding shop by product ID:', productId);
      
      // Find a product with this ID
      const product = shopsData.products.find((p: any) => p.id === productId);
      if (product) {
        // Find shop with matching owner address
        for (const shop of shopsData.shops) {
          if (shop.telegramHandle) {
            console.log('Found shop with telegramHandle:', shop.name, shop.telegramHandle);
            return shop.telegramHandle;
          }
        }
      }
    }

    // Directly check all shops for telegramHandle as a last resort
    for (const shop of shopsData.shops) {
      if (shop.telegramHandle) {
        console.log('Found fallback shop with telegramHandle:', shop.name, shop.telegramHandle);
        return shop.telegramHandle;
      }
    }

    return null;
  };

  // Content to show while waiting for signature
  const renderSigningView = () => {
    return (
      <div className="text-center py-6 md:py-10 bg-white dark:bg-card border rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
        <div className="spinner mb-3 md:mb-4"></div>
        <h2 className="text-lg md:text-xl font-semibold mb-2">Verifying Purchase</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Please sign the message in your wallet to complete the verification process.
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-300 text-sm">
          <p>Your signature confirms that you purchased this item and will be used for verification.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Order Confirmation</h1>
      
      {loading ? (
        <div className="text-center py-6 md:py-10">
          <div className="spinner mb-3 md:mb-4"></div>
          <p>Loading order details...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 md:p-4 mb-4 md:mb-6">
          <p className="text-red-600">{error}</p>
          <Link to="/" className="text-blue-500 hover:underline mt-2 inline-block">
            Return to home
          </Link>
        </div>
      ) : isSigning ? (
        // Show signing view while waiting for signature
        renderSigningView()
      ) : (
        <>
          <div ref={confirmationRef} className="bg-white dark:bg-card border rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
            <div className="text-center mb-4 md:mb-6">
            {order.status === 'completed' ? (
              <div className="text-green-500 mb-2">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                  <h2 className="text-lg md:text-xl font-semibold text-black dark:text-white">Payment Confirmed</h2>
              </div>
            ) : (
              <div className="text-yellow-500 mb-2">
                  <svg className="w-12 h-12 md:w-16 md:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                  <h2 className="text-lg md:text-xl font-semibold text-black dark:text-white">Payment Pending</h2>
              </div>
            )}
          </div>
          
            <div className="mb-4 md:mb-6 flex justify-center">
            <QRCode 
              value={getOrderQRValue()} 
                size={isMobile ? 140 : 180} 
              renderAs="canvas"
              includeMargin={true}
              className="border rounded p-2"
            />
          </div>
          
            <div className="space-y-2 md:space-y-3 mb-4 md:mb-6 text-sm md:text-base">
            <div className="flex justify-between">
                <span className="text-black dark:text-foreground/70">Order ID:</span>
                <span className="font-medium text-black dark:text-white">
                  {order.orderId}
                </span>
              </div>
              
              {/* Product Name with Emoji - Always show this section */}
              <div className="flex justify-between items-center">
                <span className="text-black dark:text-foreground/70">Product:</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getProductEmoji()}</span>
                  <span className="font-medium text-black dark:text-white">
                    {getProductName()}
                  </span>
                </div>
            </div>
            
            {/* Transaction hash moved below Order ID */}
            {order.txHash && (
              <div className="flex justify-between items-center">
                  <span className="text-black dark:text-foreground/70">Transaction:</span>
                  {isCapturing ? (
                    <span className="font-medium text-blue-500 break-all text-xs">
                      {order.txHash}
                    </span>
                  ) : (
                <a 
                  href={`https://yodl.me/tx/${order.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                      className="text-blue-500 hover:underline font-medium truncate max-w-[150px] md:max-w-[200px]"
                >
                      {order.txHash.substring(0, 8)}...
                </a>
                  )}
              </div>
            )}
            
            <div className="flex justify-between">
                <span className="text-black dark:text-foreground/70">Amount:</span>
                <span className="font-medium text-black dark:text-white">{formatCurrency(order.amount, order.currency)}</span>
            </div>
            
            <div className="flex justify-between">
                <span className="text-black dark:text-foreground/70">Status:</span>
              <span className={`font-medium ${order.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.status === 'completed' ? 'Confirmed' : 'Pending'}
              </span>
            </div>
            
            {order.timestamp && (
              <div className="flex justify-between">
                  <span className="text-black dark:text-foreground/70">Timestamp:</span>
                  <span className="font-medium text-black dark:text-white">{new Date(order.timestamp).toLocaleString()}</span>
                </div>
              )}
            </div>
            
            {/* Verification badge */}
            {order.signature && order.messageToSign && order.buyerAddress && (
              <div className="border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/30 rounded-md p-3 text-sm text-green-800 dark:text-green-200">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                  <div>
                    <p className="font-medium">Verified Purchase</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      This order has been cryptographically signed by the buyer
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Preview card for saving to gallery - sleeker version */}
          <div 
            ref={previewCardRef} 
            className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500/30 rounded-lg shadow-lg p-3"
            style={{ position: 'absolute', left: '-9999px', opacity: '0', width: '320px', height: 'auto' }}
          >
            <div className="flex items-start gap-3">
              <div className="bg-white p-1.5 rounded-md">
                <QRCode 
                  value={getOrderQRValue()} 
                  size={50}
                  renderAs="canvas"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1 text-white">
                <div className="flex items-center">
                  <span className="text-xl mr-1.5">{getProductEmoji()}</span>
                  <span className="font-small text-sm">{getProductName()}</span>
                </div>
                
                <p className="text-green-300 font-medium text-xs mt-1.5">
                  {order.status === 'completed' ? '✓ Payment Confirmed' : '⏱ Payment Pending'}
                </p>
                
                <p className="text-base font-bold my-0.5">
                  {formatCurrency(order.amount, order.currency)}
                </p>
                
                <p className="text-gray-300 text-[10px]">
                  {new Date(order.timestamp || Date.now()).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            {/* Always show Telegram button if any telegramHandle exists in configuration */}
            {(() => {
              const telegramHandle = getShopTelegramHandle();
              console.log('Telegram handle for button:', telegramHandle);
              
              if (telegramHandle) {
                return (
                  <Button 
                    onClick={() => {
                      // Open Telegram with prepopulated message without saving image first
                      const telegramUrl = generateTelegramLink(telegramHandle, getTelegramMessage());
                      openUrl(telegramUrl);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="#fff">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.079l-1.702 8.493c-.127.617-.492.864-1 .539l-2.766-2.04-1.336 1.285c-.148.148-.272.272-.56.272l.2-2.834 5.152-4.651c.225-.196-.049-.308-.345-.112l-6.37 4.009-2.744-.912c-.594-.185-.604-.592.128-.878l10.728-4.136c.494-.179.927.108.765.965z"/>
                    </svg>
                    Contact Seller on Telegram
                  </Button>
                );
              }
              return null;
            })()}
            
            <div className="flex gap-2">
              <Button onClick={saveConfirmation} className="flex-1">
                Save to Gallery
              </Button>
              
              <Button onClick={copySocialShareLink} variant="secondary" className="flex-1">
                Copy Share Link
              </Button>
            </div>
            
            <Link to="/">
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default ConfirmationPage; 