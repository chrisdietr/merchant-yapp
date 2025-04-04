import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import QRCode from 'qrcode.react';
import yodlService from '../lib/yodl';
import { formatCurrency } from '../utils/currency';
import shopsData from "@/config/shops.json";

// Direct lookup for product names
const productMap: Record<string, string> = {};
const productEmojiMap: Record<string, string> = {};

// Initialize maps from shops.json
shopsData.products.forEach((product: any) => {
  productMap[product.id] = product.name;
  productEmojiMap[product.id] = product.emoji;
});

// Order details interface
interface OrderDetails {
  orderId: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  currency: string;
  txHash?: string;
  timestamp?: string;
  productName?: string;
}

const SocialPreviewImage: React.FC = () => {
  const { orderId, txHash } = useParams<{ orderId: string; txHash?: string }>();
  const [order, setOrder] = useState<OrderDetails>({
    orderId: orderId || 'unknown',
    status: 'pending',
    amount: 0,
    currency: 'USD',
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Handle no orderId case
    if (!orderId) {
      setLoading(false);
      return;
    }

    // Try to get stored order info
    const storedOrderInfo = yodlService.getOrderInfo(orderId);
    
    // Extract product ID from order ID (format: product_ID_TIMESTAMP)
    let productId = '';
    let foundProductName = '';
    
    if (orderId && orderId.startsWith('product_')) {
      const parts = orderId.split('_');
      if (parts.length >= 2 && parts[0] === 'product') {
        productId = parts[1];
        
        // Check if we have this product in our map
        if (productMap[productId]) {
          foundProductName = productMap[productId];
        }
      }
    }
    
    // Set initial order details
    const initialOrder = {
      ...order,
      orderId,
      txHash: txHash || storedOrderInfo?.txHash,
      status: (txHash || storedOrderInfo?.txHash) ? 'completed' as const : 'pending' as const,
      productName: foundProductName || storedOrderInfo?.productName,
    };
    
    // If we have a stored order, use that data
    if (storedOrderInfo) {
      setOrder({
        ...initialOrder,
        ...storedOrderInfo,
        orderId, // Always use the URL orderId
        txHash: txHash || storedOrderInfo.txHash, // Prefer URL txHash
        status: (txHash || storedOrderInfo.txHash) ? 'completed' as const : 'pending' as const,
      });
    } else {
      setOrder(initialOrder);
    }
    
    // If we have txHash, fetch payment details
    if (txHash || (storedOrderInfo && storedOrderInfo.txHash)) {
      const hashToUse = txHash || storedOrderInfo.txHash;
      // Fetch payment details from Yodl
      const fetchDetails = async () => {
        try {
          const paymentDetails = await yodlService.fetchPaymentDetails(hashToUse);
          
          if (paymentDetails) {
            setOrder(prev => ({
              ...prev,
              amount: parseFloat(paymentDetails.amount || paymentDetails.tokenOutAmount || paymentDetails.invoiceAmount || prev.amount) || prev.amount,
              currency: paymentDetails.currency || paymentDetails.tokenOutSymbol || paymentDetails.invoiceCurrency || prev.currency,
              status: 'completed',
            }));
          }
        } catch (error) {
          console.error('Error fetching payment details:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchDetails();
    } else {
      setLoading(false);
    }
  }, [orderId, txHash]);

  // Get product emoji based on product ID in orderId
  const getProductEmoji = () => {
    if (orderId && orderId.startsWith('product_')) {
      const productId = orderId.split('_')[1];
      return productEmojiMap[productId] || '🛒';
    }
    return '🛒';
  };

  // Get product name for display
  const getProductName = () => {
    // If we have a product name directly, use it
    if (order.productName) {
      return order.productName;
    }
    
    // Try to derive it from the order ID
    if (orderId && orderId.startsWith('product_')) {
      const productId = orderId.split('_')[1];
      return productMap[productId] || `Product #${productId}`;
    }
    
    return 'Product';
  };

  // Generate QR code value
  const getQRValue = () => {
    const baseUrl = 'https://merchant-yapp.lovable.app';
    return `${baseUrl}/verify/${orderId}${txHash ? `/${txHash}` : ''}`;
  };

  // Set up document properties for social media crawlers
  useEffect(() => {
    const title = `${getProductName()} - ${order.status === 'completed' ? 'Payment Confirmed' : 'Payment Pending'}`;
    const description = `Order confirmation for ${getProductName()} ${formatCurrency(order.amount, order.currency)}`;
    
    document.title = title;
    
    // Update meta tags
    const metaTags = {
      'description': description,
      'og:title': title,
      'og:description': description,
      'twitter:title': title,
      'twitter:description': description,
    };
    
    // Update or create meta tags
    Object.entries(metaTags).forEach(([name, content]) => {
      // Try to find the meta tag
      let meta = document.querySelector(`meta[name="${name}"]`) || 
                 document.querySelector(`meta[property="${name}"]`);
      
      // If it doesn't exist, create it
      if (!meta) {
        meta = document.createElement('meta');
        if (name.startsWith('og:')) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      // Set content
      meta.setAttribute('content', content);
    });
  }, [order, loading]);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-purple-900 min-h-screen flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex items-start space-x-4">
          <div className="bg-white p-2 rounded-md">
            <QRCode 
              value={getQRValue()} 
              size={100}
              renderAs="canvas"
              includeMargin={false}
            />
          </div>
          <div className="flex-1 text-white">
            <div className="flex items-center">
              <span className="text-3xl mr-2">{getProductEmoji()}</span>
              <span className="font-bold text-xl">{getProductName()}</span>
            </div>
            
            <p className="text-green-300 font-medium mt-2">
              {order.status === 'completed' ? '✓ Payment Confirmed' : '⏱ Payment Pending'}
            </p>
            
            <p className="text-2xl font-bold mt-2">
              {formatCurrency(order.amount, order.currency)}
            </p>
            
            <p className="text-gray-300 text-sm mt-2">
              {order.timestamp ? new Date(order.timestamp).toLocaleString() : new Date().toLocaleString()}
            </p>
            
            <p className="text-white/70 text-xs mt-4">
              merchant-yapp.lovable.app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialPreviewImage; 