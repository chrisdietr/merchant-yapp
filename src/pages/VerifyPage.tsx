import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import yodlService from '../lib/yodl';
import { formatCurrency } from '../utils/currency';
import { getShopByOwnerAddress, generateTelegramLink, openUrl } from '@/lib/utils';
import shopsData from "@/config/shops.json";
import html2canvas from 'html2canvas';
import QRCode from 'qrcode.react';
import { OrderInfo } from '@/lib/yodl';
import { verifyMessage } from 'viem';

interface VerifyParams {
  orderId: string;
  txHash?: string;
}

interface VerificationStatus {
  valid: boolean;
  checked: boolean;
  error?: string;
}

const VerifyPage: React.FC = () => {
  const { orderId, txHash } = useParams<VerifyParams>();
  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shopInfo, setShopInfo] = useState<any>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [signatureVerification, setSignatureVerification] = useState<VerificationStatus>({
    valid: false,
    checked: false
  });

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

  // Verify signature
  const verifyOrderSignature = async (order: OrderInfo) => {
    try {
      if (!order.signature || !order.messageToSign || !order.buyerAddress) {
        console.log("Order doesn't have signature verification data");
        return { valid: false, checked: true, error: "No signature data available" };
      }
      
      console.log('Verifying signature for order:', order.orderId);
      console.log('Signature:', order.signature);
      console.log('Message:', order.messageToSign);
      console.log('Buyer address:', order.buyerAddress);
      
      // Verify using viem
      const isValid = await verifyMessage({
        address: order.buyerAddress as `0x${string}`,
        message: order.messageToSign,
        signature: order.signature as `0x${string}`
      });
      
      console.log('Signature verification result:', isValid);
      return { valid: isValid, checked: true };
    } catch (error) {
      console.error('Error verifying signature:', error);
      return { 
        valid: false, 
        checked: true, 
        error: error instanceof Error ? error.message : "Unknown error verifying signature" 
      };
    }
  };

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }
    
    const getOrderDetails = async () => {
      try {
        // Try to get the order from localStorage first
        const storedOrderInfo = yodlService.getOrderInfo(orderId);
        
        if (storedOrderInfo) {
          console.log('Order info found in storage:', storedOrderInfo);
          setOrder(storedOrderInfo);
          
          // Try to get shop info if ownerAddress is available
          if (storedOrderInfo.ownerAddress) {
            const shop = getShopByOwnerAddress(storedOrderInfo.ownerAddress);
            setShopInfo(shop);
          }
          
          // If we have txHash from params and not in order, update it
          if (txHash && !storedOrderInfo.txHash) {
            storedOrderInfo.txHash = txHash;
            storedOrderInfo.status = 'completed';
            yodlService.storeOrderInfo(orderId, storedOrderInfo);
          }
          
          // Verify signature if available
          if (storedOrderInfo.signature && storedOrderInfo.messageToSign && storedOrderInfo.buyerAddress) {
            const verificationResult = await verifyOrderSignature(storedOrderInfo);
            setSignatureVerification(verificationResult);
          }
        } else {
          // If we don't have stored order info, let's create a basic one
          console.log('No stored order info found, creating basic order');
          
          // Try to parse JSON from QR code if order ID looks like stringified JSON
          try {
            if (orderId.startsWith('{') && orderId.endsWith('}')) {
              const parsedOrder = JSON.parse(orderId);
              console.log('Parsed order from JSON:', parsedOrder);
              if (parsedOrder.orderId) {
                // If this is a JSON object with order details
                setOrder(parsedOrder);
                
                // Store this order info for future reference
                yodlService.storeOrderInfo(parsedOrder.orderId, parsedOrder);
                
                // Verify signature if available
                if (parsedOrder.signature && parsedOrder.messageToSign && parsedOrder.buyerAddress) {
                  const verificationResult = await verifyOrderSignature(parsedOrder);
                  setSignatureVerification(verificationResult);
                }
                
                setLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Error parsing order ID as JSON:', e);
          }
          
          // Extract product ID if this looks like a product order
          let productInfo = null;
          if (orderId.startsWith('product_')) {
            const productId = orderId.split('_')[1];
            productInfo = shopsData.products.find((p: any) => p.id === productId);
          }
          
          // Create a basic order with the info we have
          const basicOrder: OrderInfo = {
            orderId: orderId,
            amount: productInfo?.price || 0,
            currency: productInfo?.currency || 'USD',
            timestamp: new Date().toISOString(),
            productName: productInfo?.name,
            status: txHash ? 'completed' : 'pending',
            txHash
          };
          
          setOrder(basicOrder);
          
          // Store this basic order
          yodlService.storeOrderInfo(orderId, basicOrder);
        }
      } catch (error) {
        console.error('Error fetching order details:', error);
        setError('Could not load order details.');
      } finally {
        setLoading(false);
      }
    };
    
    getOrderDetails();
  }, [orderId, txHash]);

  // Function to save verification to gallery
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
      });
      
      // Reset original styles
      previewCard.style.position = originalStyles.position;
      previewCard.style.left = originalStyles.left;
      previewCard.style.opacity = originalStyles.opacity;
      
      // Create an anchor element to download the image
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `order-${order?.orderId || 'verification'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error saving confirmation:', error);
      alert('Failed to save confirmation');
    }
  };

  // Generate the Telegram message with order details
  const getTelegramMessage = () => {
    let productName = product?.name || order?.productName || "a product";
    let shopName = shopInfo?.name || "the shop";
    
    return `Hey, I just bought ${productName} from ${shopName}. Where can I pick it up from?`;
  };

  // Determine product emoji
  const getProductEmoji = () => {
    if (order?.productName) {
      // Try to find from product data
      const product = shopsData.products.find(
        (p: any) => p.name === order.productName
      );
      if (product?.emoji) return product.emoji;
    }
    
    // Or try from product ID in order ID
    if (orderId && orderId.startsWith('product_')) {
      const productId = orderId.split('_')[1];
      const product = shopsData.products.find((p: any) => p.id === productId);
      if (product?.emoji) return product.emoji;
    }
    
    return '🛒'; // Default shopping cart emoji
  };

  // Handle contact seller click
  const handleContactSeller = () => {
    if (!shopInfo || !shopInfo.telegramHandle) return;
    
    // Create the message with order details
    const message = `Hi, I'm inquiring about my order: ${orderId}. I bought ${order?.productName || 'a product'} from your shop.`;
    
    // Generate and open Telegram link
    const telegramLink = generateTelegramLink(shopInfo.telegramHandle, message);
    openUrl(telegramLink);
  };

  // Show transaction details on Yodl
  const viewTransaction = () => {
    if (!order?.txHash) return;
    
    const txLink = `https://yodl.me/tx/${order.txHash}`;
    openUrl(txLink);
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-8">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Order Verification</h1>
      
      {loading ? (
        <div className="text-center py-6 md:py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verifying order...</p>
        </div>
      ) : error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error}</p>
            <p>
              <Link to="/" className="text-blue-500 hover:underline">
                Return to Home
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      ) : order ? (
        <div className="bg-card text-card-foreground dark:bg-card dark:text-card-foreground border rounded-lg shadow-sm p-4 md:p-6 mb-4 md:mb-6">
          <div className="text-center mb-6">
            {order.status === 'completed' ? (
              <div className="text-green-500 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <h2 className="text-xl font-semibold text-black dark:text-white">Payment Verified</h2>
              </div>
            ) : (
              <div className="text-yellow-500 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h2 className="text-xl font-semibold text-black dark:text-white">Payment Pending</h2>
              </div>
            )}
          </div>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-black dark:text-foreground/70">Order ID:</span>
              <span className="font-medium text-black dark:text-white">{order.orderId}</span>
            </div>
            
            {/* Product Information */}
            {product ? (
              <div className="bg-background/50 p-3 rounded-md border mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-4xl">{product.emoji}</span>
                  <div>
                    <h3 className="font-medium text-black dark:text-white">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-black dark:text-foreground/70">Price:</span>
                  <span className="font-medium text-black dark:text-white">
                    {formatCurrency(product.price, product.currency)}
                  </span>
                </div>
              </div>
            ) : order.productName ? (
              <div className="flex justify-between">
                <span className="text-black dark:text-foreground/70">Product:</span>
                <span className="font-medium text-black dark:text-white">{order.productName}</span>
              </div>
            ) : null}
            
            {order.txHash && (
              <div className="flex justify-between items-start">
                <span className="text-black dark:text-foreground/70">Transaction:</span>
                <a
                  onClick={viewTransaction}
                  className="text-blue-500 hover:underline font-medium text-right break-all max-w-[200px]"
                >
                  View Receipt
                </a>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-black dark:text-foreground/70">Amount:</span>
              <span className="font-medium text-black dark:text-white">
                {formatCurrency(order.amount, order.currency)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-black dark:text-foreground/70">Status:</span>
              <span className={`font-medium ${order.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                {order.status === 'completed' ? 'Confirmed' : 'Pending'}
              </span>
            </div>
            
            {order.timestamp && (
              <div className="flex justify-between">
                <span className="text-black dark:text-foreground/70">Date:</span>
                <span className="font-medium text-black dark:text-white">
                  {new Date(order.timestamp).toLocaleString()}
                </span>
              </div>
            )}
            
            {order.buyerAddress && (
              <div className="flex justify-between items-start">
                <span className="text-black dark:text-foreground/70">Buyer:</span>
                <span className="font-medium text-black dark:text-white">
                  {`${order.buyerAddress.substring(0, 6)}...${order.buyerAddress.substring(order.buyerAddress.length - 4)}`}
                </span>
              </div>
            )}
          </div>
          
          {shopInfo && (
            <div className="mt-4 text-center bg-muted/30 p-3 rounded-md">
              <h3 className="font-semibold text-black dark:text-white mb-1">{shopInfo.name}</h3>
              {shopInfo.telegramHandle && (
                <Button 
                  onClick={() => {
                    // First save confirmation to gallery
                    saveConfirmation().then(() => {
                      // Then open Telegram with prepopulated message using our utility
                      const telegramUrl = generateTelegramLink(shopInfo.telegramHandle, getTelegramMessage());
                      openUrl(telegramUrl);
                    }).catch(error => {
                      console.error('Error saving image before opening Telegram:', error);
                      // Still open Telegram even if saving fails
                      const telegramUrl = generateTelegramLink(shopInfo.telegramHandle, getTelegramMessage());
                      openUrl(telegramUrl);
                    });
                  }}
                  variant="link"
                  className="inline-flex items-center text-sm text-blue-500 hover:underline gap-1 p-0 h-auto"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.99 5.363a1.068 1.068 0 0 0-1.058-.794 2.01 2.01 0 0 0-.513.106L2.217 10.148a1.29 1.29 0 0 0-.792.964c-.099.431.18.869.639.967.019 0 .039.01.039.01l4.959 1.467 1.758 5.424a1.28 1.28 0 0 0 1.096.78 1.183 1.183 0 0 0 1.058-.493l2.453-2.76 4.86 3.582c.157.116.337.165.515.165a1.18 1.18 0 0 0 .462-.097c.355-.175.582-.551.582-.946V5.753a.706.706 0 0 0-.099-.39z" />
                  </svg>
                  Contact on Telegram
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Order not found</AlertDescription>
        </Alert>
      )}
      
      {/* Preview card for saving to gallery - hidden initially */}
      <div 
        ref={previewCardRef} 
        className="bg-gradient-to-br from-gray-900 to-purple-900 border border-purple-500/30 rounded-lg shadow-lg p-3"
        style={{ position: 'absolute', left: '-9999px', opacity: '0', width: '320px', height: 'auto' }}
      >
        <div className="flex items-start gap-3">
          <div className="bg-white p-1.5 rounded-md">
            {order && (
              <QRCode 
                value={window.location.href} 
                size={50}
                renderAs="canvas"
                includeMargin={false}
              />
            )}
          </div>
          <div className="flex-1 text-white">
            <div className="flex items-center">
              <span className="text-xl mr-1.5">{getProductEmoji()}</span>
              <span className="font-small text-sm">{order?.productName || 'Order Verification'}</span>
            </div>
            
            <p className="text-green-300 font-medium text-xs mt-1.5">
              {order?.status === 'completed' ? '✓ Payment Confirmed' : '⏱ Payment Pending'}
            </p>
            
            {order && (
              <p className="text-base font-bold my-0.5">
                {formatCurrency(order.amount, order.currency)}
              </p>
            )}
            
            {order?.timestamp && (
              <p className="text-gray-300 text-[10px]">
                {new Date(order.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-center">
        <Link to="/">
          <Button variant="outline" className="w-full">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default VerifyPage; 