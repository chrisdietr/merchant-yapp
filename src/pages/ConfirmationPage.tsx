import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode.react';
import yodlService from '../lib/yodl';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import { Button } from "@/components/ui/button";
import { formatCurrency } from '../utils/currency';
import { getShopByOwnerAddress, generateTelegramLink } from '@/lib/utils';
import html2canvas from 'html2canvas';
import shopsData from "@/config/shops.json";

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
    orderId: orderId || 'unknown',
    status: 'pending',
    amount: 0,
    currency: 'USD',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);

  // Handle screen resize to detect mobile
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check initially
    checkIsMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkIsMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

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
        yodlService.storeOrderInfo(orderId, {
          ...storedOrderInfo,
          txHash: payment.txHash,
          status: 'completed', // Ensure status stays as completed
          timestamp: storedOrderInfo.timestamp || new Date().toISOString(),
        });
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
        yodlService.storeOrderInfo(orderId as string, {
          ...mappedDetails,
        });
        
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
      // Set capturing state to true to show full transaction hash
      setIsCapturing(true);
      
      // Wait for state update to reflect in the DOM
      setTimeout(async () => {
        // Add padding and set background to ensure clean screenshot
        const canvas = await html2canvas(previewCardRef.current, {
          backgroundColor: document.body.classList.contains('dark') ? '#25104a' : '#ffffff',
          scale: 2, // Higher quality
          logging: false,
          useCORS: true
        });
        
        // Reset capturing state
        setIsCapturing(false);
        
        // Create an anchor element to download the image
        const link = document.createElement('a');
        
        // Set the image data as the href
        link.href = canvas.toDataURL('image/png');
        
        // Set the download filename
        link.download = `order-${order.orderId}.png`;
        
        // Append to the document
        document.body.appendChild(link);
        
        // Trigger the download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('Error saving confirmation:', error);
      alert('Failed to save confirmation');
      setIsCapturing(false);
    }
  };

  // Get the order QR code value - includes transaction hash if available
  const getOrderQRValue = () => {
    const baseUrl = window.location.origin;
    if (order.txHash) {
      return `${baseUrl}/verify/${order.orderId}/${order.txHash}`;
    }
    return `${baseUrl}/verify/${order.orderId}`;
  };
  
  // Generate the Telegram message with order details
  const getTelegramMessage = () => {
    const productName = order.productName || 'a product';
    const shopName = shopInfo?.name || 'your shop';
    const orderLink = getOrderQRValue(); // Use the order verification link instead of txn URL
    
    return `Hey, I just bought ${productName} from ${shopName}. Where can I pick it up from? Here's the payment confirmation: ${orderLink}`;
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
                    {(() => {
                      // If we have a product name directly, use it
                      if (order.productName) {
                        return order.productName;
                      }
                      
                      // Otherwise try to derive it from the order ID
                      if (order.orderId && order.orderId.startsWith('product_')) {
                        const productId = order.orderId.split('_')[1];
                        
                        // Check if we have a mapping in our product map
                        if (productMap[productId]) {
                          return productMap[productId];
                        }
                        
                        // Last resort: show a basic name with the product ID
                        return `Product #${productId}`;
                      }
                      
                      // Absolute fallback
                      return 'Unknown Product';
                    })()}
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
          </div>
          
          {/* Preview Card for saving to gallery */}
          <div ref={previewCardRef} className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500/30 rounded-lg shadow-lg p-4 mb-6">
            <div className="flex items-start gap-4">
              <div className="bg-white p-2 rounded-md">
                <QRCode 
                  value={getOrderQRValue()} 
                  size={80}
                  renderAs="canvas"
                  includeMargin={false}
                />
              </div>
              <div className="flex-1 text-white">
                <div className="flex items-center mb-2">
                  <span className="text-2xl mr-2">{getProductEmoji()}</span>
                  <span className="font-medium">{order.productName || 'Product Order'}</span>
                </div>
                <div className="text-sm space-y-1">
                  <p className="text-green-300 font-medium">{order.status === 'completed' ? '✓ Payment Confirmed' : '⏱ Payment Pending'}</p>
                  <p className="text-lg font-bold">{formatCurrency(order.amount, order.currency)}</p>
                  <p className="text-gray-300 text-xs">{new Date(order.timestamp || Date.now()).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col space-y-3">
            {/* Only show Telegram contact button if handle exists */}
            {shopInfo?.telegramHandle && (
              <a 
                href={generateTelegramLink(shopInfo.telegramHandle, getTelegramMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 w-full"
              >
                <img src="https://i.ibb.co/G3Tsy0m3/Telegram-logo-svg.webp" alt="Telegram" className="h-5 w-5 mr-2" />
                Contact Seller on Telegram
              </a>
            )}
            
            <Button onClick={saveConfirmation} className="w-full">
              Save Confirmation to Gallery
            </Button>
            
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