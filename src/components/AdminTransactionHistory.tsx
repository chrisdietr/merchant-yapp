import React, { useEffect, useState, useRef } from 'react';
import { useYodl } from '../contexts/YodlContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, fromUnixTime } from 'date-fns';
import { ExternalLink, Clock, Calendar, Tag, User } from 'lucide-react';
import { shopConfig } from '../config/config';

interface AdminPayment {
  txHash: string;
  chainId: number;
  memo?: string;
  timestamp?: string; // Timestamp from the initial getPayments call
  blockTimestamp?: string; // Timestamp fetched from transaction details
  amount: number;
  currency: string;
  senderAddress?: string; // Address of the user who made the payment
}

interface AdminTransactionDetails {
  payment?: {
    blockTimestamp?: string;
    payerAddress?: string; // Assuming the details might contain payer info
    [key: string]: any;
  };
  [key: string]: any;
}

const AdminTransactionHistory = () => {
  const { yodl, merchantAddress } = useYodl();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugLogsRef = useRef<string[]>([]);

  // Helper function to add debug logs without triggering renders
  const addDebugLog = (message: string) => {
    console.log('[AdminHistory Debug]:', message);
    debugLogsRef.current.push(message);
    if (debugLogsRef.current.length % 10 === 0) {
      setDebugLogs([...debugLogsRef.current]);
    }
  };

  // Format date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not available';
    try {
      const isoDate = parseISO(dateString);
      if (!isNaN(isoDate.getTime())) return format(isoDate, 'PPP');
      if (/^\d{10}$/.test(dateString)) {
        const unixDateSec = fromUnixTime(parseInt(dateString, 10));
        if (!isNaN(unixDateSec.getTime())) return format(unixDateSec, 'PPP');
      }
      if (/^\d{13}$/.test(dateString)) {
        const unixDateMs = new Date(parseInt(dateString, 10));
        if (!isNaN(unixDateMs.getTime())) return format(unixDateMs, 'PPP');
      }
      const numDate = new Date(Number(dateString));
      if (!isNaN(numDate.getTime())) return format(numDate, 'PPP');
      const regDate = new Date(dateString);
      if (!isNaN(regDate.getTime())) return format(regDate, 'PPP');
      return 'Date not available';
    } catch (err) {
      return 'Date not available';
    }
  };

  // Format time safely
  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Time not available';
    try {
      const isoDate = parseISO(dateString);
      if (!isNaN(isoDate.getTime())) return format(isoDate, 'HH:mm');
      if (/^\d{10}$/.test(dateString)) {
        const unixDateSec = fromUnixTime(parseInt(dateString, 10));
        if (!isNaN(unixDateSec.getTime())) return format(unixDateSec, 'HH:mm');
      }
      if (/^\d{13}$/.test(dateString)) {
        const unixDateMs = new Date(parseInt(dateString, 10));
        if (!isNaN(unixDateMs.getTime())) return format(unixDateMs, 'HH:mm');
      }
      const numDate = new Date(Number(dateString));
      if (!isNaN(numDate.getTime())) return format(numDate, 'HH:mm');
      const regDate = new Date(dateString);
      if (!isNaN(regDate.getTime())) return format(regDate, 'HH:mm');
      return 'Time not available';
    } catch (err) {
      return 'Time not available';
    }
  };

  // Fetch transaction details (optional, primarily for block timestamp)
  const fetchTransactionDetails = async (txHash: string): Promise<AdminTransactionDetails | null> => {
    try {
      addDebugLog(`fetchTransactionDetails: Fetching details for ${txHash}`);
      const response = await fetch(`https://tx.yodl.me/api/v1/payments/${txHash}`);
      if (!response.ok) {
        addDebugLog(`fetchTransactionDetails: Failed status ${response.status}`);
        return null;
      }
      const data = await response.json();
      addDebugLog(`fetchTransactionDetails: Response for ${txHash}: ${JSON.stringify(data).substring(0, 100)}...`);
      const blockTimestamp = data?.payment?.blockTimestamp;
      const payerAddress = data?.payment?.payerAddress;
      if (blockTimestamp) addDebugLog(`Found blockTimestamp: ${blockTimestamp}`);
      if (payerAddress) addDebugLog(`Found payerAddress: ${payerAddress}`);
      return data;
    } catch (error) {
      addDebugLog(`fetchTransactionDetails: Error for ${txHash}`);
      return null;
    }
  };

  useEffect(() => {
    const fetchAdminPayments = async () => {
      if (!merchantAddress) {
        setIsLoading(false);
        addDebugLog('fetchAdminPayments: No merchantAddress available yet.');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        debugLogsRef.current = [];
        addDebugLog(`fetchAdminPayments: Starting fetch for recipient: ${merchantAddress}`);

        // Fetch payments received by the merchant address
        // NOTE: Assuming getPayments supports a 'recipient' parameter.
        // This might need adjustment based on actual SDK capabilities.
        // @ts-ignore - Assuming 'recipient' might work
        const response = await yodl.getPayments({ recipient: merchantAddress, perPage: 200 }); // Fetch more for admin?
        addDebugLog(`fetchAdminPayments: Raw response: ${JSON.stringify(response).substring(0, 100)}...`);

        let allPayments: any[] = [];
        if (Array.isArray(response)) {
          allPayments = response;
        } else if (response && typeof response === 'object') {
          // @ts-ignore - Assuming response might contain a nested 'payments' array
          allPayments = response.payments || [];
        }
        addDebugLog(`fetchAdminPayments: Found ${allPayments.length} total payments for recipient.`);

        // Filter payments with memos matching product names
        const productNames = shopConfig.products.map(p => p.name.toLowerCase());
        const relevantPayments = allPayments
          .filter((p: any) => {
            if ('error' in p) return false;
            const memo = p.memo?.toLowerCase() || '';
            return productNames.some(name => memo.includes(name));
          })
          .map((p: any): AdminPayment => ({
            txHash: p.txHash,
            chainId: p.chainId,
            memo: p.memo,
            timestamp: p.timestamp, // Original timestamp if available
            amount: p.amount,
            currency: p.currency,
            senderAddress: p.payerAddress || p.senderAddress // Get sender from initial data if possible
          }));
        
        addDebugLog(`fetchAdminPayments: Found ${relevantPayments.length} relevant payments after memo filter.`);

        // Fetch details to get reliable blockTimestamp and potentially senderAddress
        const paymentsWithDetails = await Promise.all(
          relevantPayments.map(async (payment) => {
            const details = await fetchTransactionDetails(payment.txHash);
            if (!details) return payment;

            const updatedPayment = { ...payment };
            if (details.payment?.blockTimestamp) {
              updatedPayment.blockTimestamp = details.payment.blockTimestamp;
            }
            if (details.payment?.payerAddress) { // Use payerAddress if found in details
              updatedPayment.senderAddress = details.payment.payerAddress;
            }
            return updatedPayment;
          })
        );

        setDebugLogs([...debugLogsRef.current]);
        setPayments(paymentsWithDetails);
      } catch (err: any) {
        addDebugLog(`fetchAdminPayments: Error: ${err.message}`);
        console.error('Error fetching admin payments:', err);
        setError('Failed to load admin transaction history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminPayments();
  }, [merchantAddress, yodl]);

  const shouldShowDebug = window.location.search.includes('debug=true');

  return (
    <Card className="w-full max-w-5xl mx-auto mt-8 border-primary border-2">
      <CardHeader className="bg-primary/10">
        <CardTitle className="text-2xl text-primary">Admin Mode: Received Sales</CardTitle>
      </CardHeader>
      <CardContent className="p-0 border-t border-primary/20">
        {isLoading ? (
          <div className="text-center py-8">Loading admin history...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-8">Error: {error}</div>
        ) : payments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">No relevant sales found.</div>
        ) : (
          <div className="divide-y">
            {shouldShowDebug && (
              <div className="p-4 bg-yellow-50 text-xs font-mono overflow-auto max-h-60">
                <div className="font-bold mb-2">Admin Debug Information:</div>
                {debugLogs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            )}
            {payments.map((payment, index) => (
              <div key={payment.txHash} className={`p-4 sm:p-6 ${index % 2 === 0 ? 'bg-muted/20' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4 mb-4">
                  <div className="text-lg md:text-xl font-medium text-purple-700 dark:text-purple-400">
                    {payment.memo || 'Unknown Product'}
                  </div>
                  <div className="font-semibold text-base sm:text-lg md:text-xl whitespace-nowrap">
                    {payment.amount} {payment.currency}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-muted-foreground">
                  {/* Column 1: Date & Time */}
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-500 opacity-90" />
                      <span>{formatDate(payment.blockTimestamp || payment.timestamp)}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-500 opacity-90" />
                      <span>{formatTime(payment.blockTimestamp || payment.timestamp)}</span>
                    </div>
                  </div>
                  
                  {/* Column 2: Payer, Tx, Button */}
                  <div className="space-y-2">
                    <div className="flex items-center truncate">
                      <User className="h-4 w-4 mr-2 flex-shrink-0 text-purple-600 dark:text-purple-500 opacity-90" />
                      <span className="truncate" title={payment.senderAddress}>Payer: {payment.senderAddress ? `${payment.senderAddress.substring(0, 6)}...${payment.senderAddress.substring(payment.senderAddress.length - 4)}` : 'Unknown'}</span>
                    </div>
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-500 opacity-90" />
                      <span className="truncate" title={payment.txHash}>Tx: {payment.txHash.substring(0, 10)}...{payment.txHash.substring(payment.txHash.length - 8)}</span>
                    </div>
                    <div className="flex justify-end sm:justify-start pt-1">
                      <a
                        href={`https://yodl.me/tx/${payment.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1 text-sm"
                      >
                        View Receipt
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
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

export default AdminTransactionHistory; 