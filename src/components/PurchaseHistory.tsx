import React, { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useYodl } from '../contexts/YodlContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, fromUnixTime } from 'date-fns';
import { ExternalLink, Clock, Calendar, Tag, User } from 'lucide-react';
import { shopConfig } from '../config/config';
import type { PaymentStatus } from '@yodlpay/yapp-sdk';

interface Payment {
  txHash: string;
  chainId: number;
  memo?: string;
  timestamp?: string;
  amount: number;
  currency: string;
  blockTimestamp?: string;
}

interface TransactionDetails {
  payment?: {
    blockTimestamp?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

const PurchaseHistory = () => {
  const { address } = useAccount();
  const { yodl, merchantAddress } = useYodl();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugLogsRef = useRef<string[]>([]);

  // Helper function to add debug logs without triggering renders
  const addDebugLog = (message: string) => {
    console.log('[PurchaseHistory Debug]:', message);
    debugLogsRef.current.push(message);
    // Only update state once per batch to avoid render loops
    if (debugLogsRef.current.length % 10 === 0) {
      setDebugLogs([...debugLogsRef.current]);
    }
  };

  // Format date safely, falling back to a readable message if invalid
  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'Date not available';
    }
    
    try {
      // Try to parse as ISO date first
      const isoDate = parseISO(dateString);
      if (!isNaN(isoDate.getTime())) {
        return format(isoDate, 'PPP');
      }
      
      // Try as unix timestamp in seconds (10 digits)
      if (/^\d{10}$/.test(dateString)) {
        const unixDate = fromUnixTime(parseInt(dateString, 10));
        if (!isNaN(unixDate.getTime())) {
          return format(unixDate, 'PPP');
        }
      }
      
      // Try as unix timestamp in milliseconds (13 digits)
      if (/^\d{13}$/.test(dateString)) {
        const msDate = new Date(parseInt(dateString, 10));
        if (!isNaN(msDate.getTime())) {
          return format(msDate, 'PPP');
        }
      }
      
      // Try as number (any format)
      const numDate = new Date(Number(dateString));
      if (!isNaN(numDate.getTime())) {
        return format(numDate, 'PPP');
      }
      
      // Try as regular date string
      const regDate = new Date(dateString);
      if (!isNaN(regDate.getTime())) {
        return format(regDate, 'PPP');
      }
      
      return 'Date not available';
    } catch (err) {
      return 'Date not available';
    }
  };

  // Format time safely, falling back to a readable message if invalid
  const formatTime = (dateString?: string) => {
    if (!dateString) {
      return 'Time not available';
    }
    
    try {
      // Try to parse as ISO date first
      const isoDate = parseISO(dateString);
      if (!isNaN(isoDate.getTime())) {
        return format(isoDate, 'p');
      }
      
      // Try as unix timestamp in seconds (10 digits)
      if (/^\d{10}$/.test(dateString)) {
        const unixDate = fromUnixTime(parseInt(dateString, 10));
        if (!isNaN(unixDate.getTime())) {
          return format(unixDate, 'p');
        }
      }
      
      // Try as unix timestamp in milliseconds (13 digits)
      if (/^\d{13}$/.test(dateString)) {
        const msDate = new Date(parseInt(dateString, 10));
        if (!isNaN(msDate.getTime())) {
          return format(msDate, 'p');
        }
      }
      
      // Try as number (any format)
      const numDate = new Date(Number(dateString));
      if (!isNaN(numDate.getTime())) {
        return format(numDate, 'p');
      }
      
      // Try as regular date string
      const regDate = new Date(dateString);
      if (!isNaN(regDate.getTime())) {
        return format(regDate, 'p');
      }
      
      return 'Time not available';
    } catch (err) {
      return 'Time not available';
    }
  };

  // Fetch transaction details from Yodl API
  const fetchTransactionDetails = async (txHash: string): Promise<TransactionDetails | null> => {
    try {
      addDebugLog(`fetchTransactionDetails: Fetching details for ${txHash}`);
      const response = await fetch(`https://tx.yodl.me/api/v1/payments/${txHash}`);
      
      if (!response.ok) {
        addDebugLog(`fetchTransactionDetails: Failed with status ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      addDebugLog(`fetchTransactionDetails: Response for ${txHash}: ${JSON.stringify(data).substring(0, 200)}...`);
      
      // Extract the blockTimestamp if it exists
      const blockTimestamp = data?.payment?.blockTimestamp;
      if (blockTimestamp) {
        addDebugLog(`Found blockTimestamp: ${blockTimestamp}`);
      } else {
        addDebugLog(`No blockTimestamp found in response`);
      }
      
      return data;
    } catch (error) {
      addDebugLog(`fetchTransactionDetails: Error for ${txHash}`);
      return null;
    }
  };

  useEffect(() => {
    const fetchPayments = async () => {
      if (!address) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        debugLogsRef.current = [];
        
        addDebugLog(`fetchPayments: Starting payment fetch for sender: ${address}`);
        
        // Get all payments for the connected address - ignore TS errors for now
        // @ts-ignore - SDK type definitions don't match actual behavior
        const response = await yodl.getPayments({ address });
        addDebugLog(`fetchPayments: Got response: ${JSON.stringify(response).substring(0, 200)}...`);
        
        // Handle different response types
        let allPayments: any[] = [];
        if (Array.isArray(response)) {
          allPayments = response;
          addDebugLog(`fetchPayments: Response is an array with ${allPayments.length} payments`);
        } else if (response && typeof response === 'object') {
          // @ts-ignore - SDK type definitions don't match actual behavior
          allPayments = response.payments || [];
          addDebugLog(`fetchPayments: Response is an object with ${allPayments.length} payments`);
        }
        
        // Filter payments that have memos matching product names
        const productNames = shopConfig.products.map(p => p.name.toLowerCase());
        
        // @ts-ignore - SDK type definitions don't match actual behavior
        const relevantPayments = allPayments
          .filter((paymentStatus: any) => {
            // Skip if it's an error response
            if ('error' in paymentStatus) return false;
            
            const memo = paymentStatus.memo?.toLowerCase() || '';
            // Check if memo includes any product name
            return productNames.some(name => memo.includes(name));
          })
          .map((paymentStatus: any) => {
            // Extract the payment data
            const payment: Payment = {
              txHash: paymentStatus.txHash,
              chainId: paymentStatus.chainId,
              memo: paymentStatus.memo,
              timestamp: paymentStatus.timestamp,
              amount: paymentStatus.amount,
              currency: paymentStatus.currency
            };
            
            // Log the timestamp format
            if (payment.timestamp) {
              addDebugLog(`Payment ${payment.txHash}: Original timestamp = "${payment.timestamp}"`);
            } else {
              addDebugLog(`Payment ${payment.txHash}: No timestamp available in original data`);
            }
            
            return payment;
          });
        
        addDebugLog(`fetchPayments: Found ${relevantPayments.length} relevant payments`);
        
        // Fetch additional details for each payment
        const paymentsWithDetails = await Promise.all(
          relevantPayments.map(async (payment) => {
            const details = await fetchTransactionDetails(payment.txHash);
            
            if (!details) {
              addDebugLog(`No details found for ${payment.txHash}`);
              return payment;
            }
            
            // Extract blockTimestamp from the nested payment object in the response
            if (details.payment?.blockTimestamp) {
              addDebugLog(`Payment ${payment.txHash}: Got blockTimestamp = "${details.payment.blockTimestamp}"`);
              return {
                ...payment,
                blockTimestamp: details.payment.blockTimestamp
              };
            }
            
            return payment;
          })
        );

        // Set debug logs for display
        setDebugLogs([...debugLogsRef.current]);
        setPayments(paymentsWithDetails);
      } catch (err) {
        addDebugLog(`fetchPayments: Error: ${err}`);
        console.error('Error fetching payments:', err);
        setError('Failed to load purchase history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [address, yodl]);

  // Check if we need to display debug information
  const shouldShowDebug = window.location.search.includes('debug=true');

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8">
      <CardHeader className="bg-muted/50">
        <CardTitle className="text-2xl">Purchase History</CardTitle>
        {!shouldShowDebug && (
          <div className="text-xs text-muted-foreground">
            <a href="?debug=true" className="hover:underline">Enable debug mode</a>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse h-6 w-24 bg-muted rounded mx-auto mb-4"></div>
            <div className="text-muted-foreground">Loading purchase history...</div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">
            <div className="text-lg mb-2">Error</div>
            <div>{error}</div>
          </div>
        ) : !address ? (
          <div className="text-center py-8">
            <div className="text-lg mb-2">Wallet Not Connected</div>
            <div className="text-muted-foreground">
              Connect your wallet to view your purchase history
            </div>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="text-lg mb-2">No Purchases Found</div>
            <div>You haven't made any purchases yet</div>
          </div>
        ) : (
          <div className="divide-y">
            {shouldShowDebug && (
              <div className="p-4 bg-yellow-50 text-xs font-mono overflow-auto max-h-60">
                <div className="font-bold mb-2">Debug Information:</div>
                {debugLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
            {payments.map((payment) => (
              <div
                key={payment.txHash}
                className="p-6 hover:bg-muted/20 transition-colors"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div className="text-lg font-medium">
                    {payment.memo || 'Unknown Product'}
                  </div>
                  <div className="rounded-full text-sm font-medium">
                    {payment.amount} {payment.currency}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-y-2 gap-x-8 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground/70" />
                    <span>Date: {formatDate(payment.blockTimestamp || payment.timestamp)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                    <span>Time: {formatTime(payment.blockTimestamp || payment.timestamp)}</span>
                  </div>
                  <div className="flex items-center truncate">
                    <User className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" title={merchantAddress}>Recipient: {merchantAddress ? `${merchantAddress.substring(0, 6)}...${merchantAddress.substring(merchantAddress.length - 4)}` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center md:col-span-2">
                    <Tag className="h-4 w-4 mr-2 text-muted-foreground/70" />
                    <span>Tx: {payment.txHash.substring(0, 10)}...{payment.txHash.substring(payment.txHash.length - 8)}</span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  <a
                    href={`https://yodl.me/tx/${payment.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    View Transaction
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchaseHistory; 