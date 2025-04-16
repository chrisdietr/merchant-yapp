import React, { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useYodl } from '../contexts/YodlContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Clock, Calendar, Tag, User } from 'lucide-react';
import { shopConfig } from '../config/config';
import type { PaymentStatus } from '@yodlpay/yapp-sdk';
import { formatDate, formatTime, fetchTransactionDetails } from '../utils/dateUtils';

interface Payment {
  txHash: string;
  chainId: number;
  memo?: string;
  timestamp?: string;
  amount: number;
  currency: string;
  blockTimestamp?: string;
}

const PurchaseHistory = () => {
  const { address } = useAccount();
  const { yodl, merchantAddress } = useYodl();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugLogsRef = useRef<string[]>([]);
  
  // Check if debug mode is enabled via URL parameter
  const isDebugMode = window.location.search.includes('debug=true');

  // Helper function to add debug logs without triggering renders
  const addDebugLog = (message: string) => {
    if (isDebugMode) {
      console.log('[PurchaseHistory Debug]:', message);
    }
    
    debugLogsRef.current.push(message);
    // Only update state once per batch to avoid render loops
    if (debugLogsRef.current.length % 10 === 0) {
      setDebugLogs([...debugLogsRef.current]);
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
        addDebugLog(`fetchPayments: Got response with payment data`);
        
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
        
        // Track matches for debug only
        let productMatches = 0;
        
        // @ts-ignore - SDK type definitions don't match actual behavior
        const relevantPayments = allPayments
          .filter((paymentStatus: any) => {
            // Skip if it's an error response
            if ('error' in paymentStatus) return false;
            
            const memo = paymentStatus.memo?.toLowerCase() || '';
            // Check if memo includes any product name
            const isMatch = productNames.some(name => memo.includes(name));
            
            if (isMatch && isDebugMode) {
              productMatches++;
            }
            
            return isMatch;
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
            
            return payment;
          });
        
        if (isDebugMode) {
          addDebugLog(`fetchPayments: Found ${productMatches} product name matches in memos`);
          addDebugLog(`fetchPayments: Found ${relevantPayments.length} relevant payments`);
        }
        
        // Fetch additional details for each payment
        const paymentsWithDetails = await Promise.all(
          relevantPayments.map(async (payment) => {
            const details = await fetchTransactionDetails(payment.txHash, isDebugMode ? addDebugLog : undefined);
            
            if (!details) {
              return payment;
            }
            
            // Extract blockTimestamp from the nested payment object in the response
            if (details.payment?.blockTimestamp) {
              return {
                ...payment,
                blockTimestamp: details.payment.blockTimestamp
              };
            }
            
            return payment;
          })
        );
        
        setDebugLogs([...debugLogsRef.current]);
        setPayments(paymentsWithDetails);
      } catch (err: any) {
        addDebugLog(`fetchPayments: Error: ${err.message}`);
        console.error('Error fetching payments:', err);
        setError('Failed to load purchase history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [address, yodl, isDebugMode]);

  const shouldShowDebug = isDebugMode;

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Your Purchase History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading purchase history...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">Error: {error}</div>
        ) : payments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No purchase history found.</div>
        ) : (
          <div className="space-y-4">
            {shouldShowDebug && (
              <div className="p-4 bg-yellow-50 text-xs font-mono overflow-auto max-h-60">
                <div className="font-bold mb-2">Debug Information (only visible with ?debug=true):</div>
                {debugLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
            {payments.map((payment) => (
              <div key={payment.txHash} className="border p-4 rounded-lg">
                <div className="font-medium text-lg mb-2">
                  {payment.memo || 'Unknown Product'}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDate(payment.blockTimestamp || payment.timestamp)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{formatTime(payment.blockTimestamp || payment.timestamp)}</span>
                  </div>
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    <span>
                      {payment.amount} {payment.currency}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    <a
                      href={`https://tx.yodl.me/${payment.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      View Transaction
                    </a>
                  </div>
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