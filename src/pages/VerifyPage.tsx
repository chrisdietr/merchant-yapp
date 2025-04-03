import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import yodlService from '../lib/yodl';
import { formatCurrency } from '../utils/currency';
import { getShopByOwnerAddress } from '@/lib/utils';

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

const VerifyPage: React.FC = () => {
  const { orderId, txHash } = useParams<{ orderId: string; txHash?: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [shopInfo, setShopInfo] = useState<any>(null);

  useEffect(() => {
    const loadOrderData = async () => {
      try {
        if (!orderId) {
          setError('No order ID provided');
          setLoading(false);
          return;
        }

        // Try to get order info from localStorage first
        const storedOrderInfo = yodlService.getOrderInfo(orderId);
        
        if (storedOrderInfo) {
          setOrder({
            orderId,
            ...storedOrderInfo,
            txHash: txHash || storedOrderInfo.txHash,
            status: storedOrderInfo.status || 'pending'
          });
          
          // Set shop info if owner address is available
          if (storedOrderInfo.ownerAddress) {
            const shop = getShopByOwnerAddress(storedOrderInfo.ownerAddress);
            setShopInfo(shop);
          }
        } else if (txHash) {
          // If not in localStorage but we have txHash, try to fetch from API
          try {
            const paymentDetails = await yodlService.fetchPaymentDetails(txHash);
            
            if (paymentDetails) {
              const orderData = {
                orderId,
                txHash,
                amount: parseFloat(paymentDetails.amount || paymentDetails.tokenOutAmount || paymentDetails.invoiceAmount || '0'),
                currency: paymentDetails.currency || paymentDetails.tokenOutSymbol || paymentDetails.invoiceCurrency || 'UNKNOWN',
                status: 'completed' as const,
                timestamp: paymentDetails.timestamp || paymentDetails.blockTimestamp || paymentDetails.created || new Date().toISOString(),
              };
              
              setOrder(orderData);
              
              // Store this info for future reference
              yodlService.storeOrderInfo(orderId, orderData);
            } else {
              setError('Payment details not found');
            }
          } catch (apiError) {
            console.error('Error fetching payment details:', apiError);
            setError('Failed to verify payment');
          }
        } else {
          // No stored data and no txHash
          setError('Order information not found');
        }
      } catch (e) {
        console.error('Error loading order data:', e);
        setError('Failed to load order data');
      } finally {
        setLoading(false);
      }
    };

    loadOrderData();
  }, [orderId, txHash]);

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
            
            {order.productName && (
              <div className="flex justify-between">
                <span className="text-black dark:text-foreground/70">Product:</span>
                <span className="font-medium text-black dark:text-white">{order.productName}</span>
              </div>
            )}
            
            {order.txHash && (
              <div className="flex justify-between items-start">
                <span className="text-black dark:text-foreground/70">Transaction:</span>
                <a
                  href={`https://yodl.me/tx/${order.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline font-medium text-right break-all max-w-[200px]"
                >
                  {order.txHash}
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
          </div>
          
          {shopInfo && (
            <div className="mt-4 text-center">
              <span className="text-sm text-black dark:text-white">
                Purchase from <span className="font-semibold">{shopInfo.name}</span>
              </span>
            </div>
          )}
        </div>
      ) : (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Order not found</AlertDescription>
        </Alert>
      )}
      
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