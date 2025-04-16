import React, { useEffect, useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useYodl } from '../contexts/YodlContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Clock, Calendar, Tag, User, ShieldCheck, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shopConfig } from '../config/config';
import { formatDate, formatTime, fetchTransactionDetails } from '../utils/dateUtils';
import { isAdminAuthenticated, clearAdminAuth } from '../utils/siwe';
import AdminAuthDialog from './AdminAuthDialog';
import { adminConfig } from '../config/config';

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

const AdminTransactionHistory = () => {
  const { address } = useAccount();
  const { yodl, merchantAddress } = useYodl();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const debugLogsRef = useRef<string[]>([]);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if current wallet is an admin
  const isAdmin = address ? 
    adminConfig.admins.some(admin => admin.address?.toLowerCase() === address?.toLowerCase()) 
    : false;
  
  // Check if debug mode is enabled via URL parameter
  const isDebugMode = window.location.search.includes('debug=true');

  // Helper function to add debug logs without triggering renders
  const addDebugLog = (message: string) => {
    if (isDebugMode) {
      console.log('[AdminHistory Debug]:', message);
    }
    debugLogsRef.current.push(message);
    if (debugLogsRef.current.length % 10 === 0) {
      setDebugLogs([...debugLogsRef.current]);
    }
  };
  
  // Check authentication status when component mounts or address changes
  useEffect(() => {
    if (!address) {
      setIsAuthenticated(false);
      return;
    }
    
    const isAuthed = isAdminAuthenticated(address);
    setIsAuthenticated(isAuthed);
    
    // If we're not authenticated and we're an admin, show the auth dialog
    if (!isAuthed && isAdmin) {
      setShowAuthDialog(true);
    }
  }, [address, isAdmin]);
  
  // Handle successful authentication
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthDialog(false);
  };
  
  // Handle logout
  const handleLogout = () => {
    clearAdminAuth();
    setIsAuthenticated(false);
  };

  useEffect(() => {
    const fetchAdminPayments = async () => {
      // Only fetch if we're authenticated
      if (!merchantAddress || !isAuthenticated) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        debugLogsRef.current = [];
        addDebugLog(`fetchAdminPayments: Starting fetch for recipient: ${merchantAddress}`);

        // Fetch payments received by the merchant address
        // @ts-ignore - Assuming 'recipient' might work
        const response = await yodl.getPayments({ recipient: merchantAddress, perPage: 200 });
        
        if (isDebugMode) {
          const truncatedResponse = JSON.stringify(response).substring(0, 100) + '...';
          addDebugLog(`fetchAdminPayments: Raw response: ${truncatedResponse}`);
        }

        let allPayments: any[] = [];
        if (Array.isArray(response)) {
          allPayments = response;
        } else if (response && typeof response === 'object') {
          // @ts-ignore
          allPayments = response.payments || [];
        }
        addDebugLog(`fetchAdminPayments: Found ${allPayments.length} total payments for recipient.`);

        // Filter payments with memos matching product names
        const productNames = shopConfig.products.map(p => p.name.toLowerCase());
        let memoMatches = 0;
        
        const relevantPayments = allPayments
          .filter((p: any) => {
            if ('error' in p) return false;
            const memo = p.memo?.toLowerCase() || '';
            const isMatch = productNames.some(name => memo.includes(name));
            
            if (isMatch && isDebugMode) {
              memoMatches++;
            }
            
            return isMatch;
          })
          .map((p: any): AdminPayment => ({
            txHash: p.txHash,
            chainId: p.chainId,
            memo: p.memo,
            timestamp: p.timestamp,
            amount: p.amount,
            currency: p.currency,
            senderAddress: p.payerAddress || p.senderAddress
          }));
        
        if (isDebugMode) {
          addDebugLog(`fetchAdminPayments: Found ${memoMatches} memo matches`);
          addDebugLog(`fetchAdminPayments: Found ${relevantPayments.length} relevant payments after memo filter.`);
        }

        // Fetch details to get reliable blockTimestamp and potentially senderAddress
        const paymentsWithDetails = await Promise.all(
          relevantPayments.map(async (payment) => {
            const details = await fetchTransactionDetails(payment.txHash, isDebugMode ? addDebugLog : undefined);
            if (!details) return payment;

            const updatedPayment = { ...payment };
            if (details.payment?.blockTimestamp) {
              updatedPayment.blockTimestamp = details.payment.blockTimestamp;
            }
            if (details.payment?.payerAddress) {
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
  }, [merchantAddress, yodl, isDebugMode, isAuthenticated]);

  const shouldShowDebug = isDebugMode;

  if (!isAdmin) {
    return null;
  }
  
  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-5xl mx-auto mt-8 border-primary border-2">
        <CardHeader className="bg-primary/10">
          <CardTitle className="text-2xl text-primary flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Admin Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="mb-4">Please authenticate to view your store's received sales.</p>
          <Button 
            onClick={() => setShowAuthDialog(true)}
            className="mx-auto"
          >
            Authenticate as Admin
          </Button>
          <AdminAuthDialog 
            isOpen={showAuthDialog} 
            onSuccess={handleAuthSuccess} 
            onClose={() => setShowAuthDialog(false)} 
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-5xl mx-auto mt-8 border-primary border-2">
        <CardHeader className="bg-primary/10 flex flex-row items-center justify-between">
          <CardTitle className="text-2xl text-primary flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" />
            Admin Mode: Received Sales
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="ml-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
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
                  <div className="font-bold mb-2">Admin Debug Information (only visible with ?debug=true):</div>
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
                        <span>{formatTime(payment.blockTimestamp || payment.timestamp, true)}</span>
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
                        <span className="truncate" title={payment.txHash}>Tx: {payment.txHash.substring(0, 6)}...{payment.txHash.substring(payment.txHash.length - 4)}</span>
                      </div>
                      <div className="mt-1">
                        <a
                          href={`https://tx.yodl.me/${payment.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1.5 text-sm font-medium"
                        >
                          View Receipt <ExternalLink className="h-3.5 w-3.5" />
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
      
      {/* Auth dialog for re-authentication */}
      <AdminAuthDialog 
        isOpen={showAuthDialog} 
        onSuccess={handleAuthSuccess} 
        onClose={() => setShowAuthDialog(false)} 
      />
    </>
  );
};

export default AdminTransactionHistory; 