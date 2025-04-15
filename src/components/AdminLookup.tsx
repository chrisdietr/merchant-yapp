import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { adminConfig } from '../config/config';
import { useYodl } from '../contexts/YodlContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Lock, AlertCircle, Search, CheckCircle, Database, ExternalLink, QrCode } from 'lucide-react';
import { format } from 'date-fns';
import QRCodeScanner from './QRScanner';

/**
 * Component for admin users to look up orders by memo ID
 */
const AdminLookup: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { checkTransactionStatus } = useYodl();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);

  // Check if connected wallet is in the admin list
  useEffect(() => {
    if (!isConnected || !address) {
      setIsAdmin(false);
      return;
    }

    const matchesAdmin = adminConfig.admins.some((admin) => {
      if (admin.address && address) {
        return admin.address.toLowerCase() === address.toLowerCase();
      }
      return false;
    });

    setIsAdmin(matchesAdmin);
  }, [address, isConnected]);

  // Function to look up transaction details
  const lookupTransaction = async (input: string) => {
    if (!input.trim()) {
      setError("Please enter a transaction hash or memo ID to search");
      return;
    }

    setError(null);
    setLoading(true);
    setOrderDetails(null);

    try {
      const lookupId = input.trim();
      
      // Call the checkTransactionStatus function from YodlContext
      console.log("Looking up transaction data for:", lookupId);
      const txData = await checkTransactionStatus({ memoId: lookupId });
      
      if (txData) {
        console.log("Transaction data found:", txData);
        
        // Format timestamp if it exists
        if (txData.timestamp) {
          try {
            txData.formattedTimestamp = format(
              new Date(txData.timestamp),
              'PPP p'
            );
          } catch (e) {
            txData.formattedTimestamp = 'Unknown date';
          }
        }
        
        setOrderDetails(txData);
      } else {
        const type = lookupId.startsWith('0x') ? 'transaction hash' : 'memo ID';
        setError(`No transaction found with ${type}: ${lookupId}`);
      }
    } catch (error: any) {
      setError(error.message || "Failed to lookup transaction");
      console.error("Lookup error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission to look up order
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookupTransaction(searchInput);
  };

  // Handle QR code scan result
  const handleQRScan = async (data: string) => {
    setSearchInput(data);
    await lookupTransaction(data);
  };

  // Open QR scanner
  const openQRScanner = () => {
    setIsQRScannerOpen(true);
  };

  // Close QR scanner
  const closeQRScanner = () => {
    setIsQRScannerOpen(false);
  };

  // If not connected or not an admin, show access denied
  if (!isConnected) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Lookup
          </CardTitle>
          <CardDescription>
            Connect your wallet to access admin features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Please connect your wallet to continue.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Admin Lookup
          </CardTitle>
          <CardDescription>
            This feature is only available to admin users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Your wallet address ({address?.substring(0, 6)}...{address?.substring(address.length - 4)}) does not have admin privileges.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Transaction Lookup
          </CardTitle>
          <CardDescription>
            Look up transaction details by transaction hash or memo ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="searchInput">Transaction Hash or Memo ID</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="searchInput"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Enter tx hash or memo ID"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={openQRScanner}
                    className="absolute right-0 top-0 h-full aspect-square text-muted-foreground hover:text-foreground"
                    title="Scan QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                <Button type="submit" disabled={loading} className="shrink-0">
                  {loading ? (
                    <span className="animate-spin">...</span>
                  ) : (
                    <Search className="h-4 w-4 mr-2" />
                  )}
                  Lookup
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: 0x64c3cb7f...2469c (scan QR code to lookup transaction)
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {orderDetails && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h3 className="text-lg font-medium">Transaction Found</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Database className="h-3 w-3" />
                    <span>Blockchain Data</span>
                  </div>
                </div>
                <Separator />
                
                {/* Transaction Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Transaction Details</h4>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Transaction Hash:</span>
                    <a 
                      href={`https://yodl.me/tx/${orderDetails.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate max-w-[200px] flex items-center gap-1"
                    >
                      {`${orderDetails.txHash.substring(0, 6)}...${orderDetails.txHash.substring(orderDetails.txHash.length - 4)}`}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="font-medium">Chain ID:</span>
                    <span>{orderDetails.chainId}</span>
                  </div>
                  
                  {orderDetails.formattedTimestamp && (
                    <div className="flex justify-between">
                      <span className="font-medium">Timestamp:</span>
                      <span>{orderDetails.formattedTimestamp}</span>
                    </div>
                  )}
                  
                  {orderDetails.status && (
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <span className="text-green-600 font-medium">
                        {orderDetails.status.charAt(0).toUpperCase() + orderDetails.status.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Payment Details */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Payment Details</h4>
                  
                  {(orderDetails.amount !== undefined && orderDetails.currency) && (
                    <div className="flex justify-between">
                      <span className="font-medium">Amount:</span>
                      <span>{orderDetails.amount} {orderDetails.currency}</span>
                    </div>
                  )}
                  
                  {orderDetails.tokenSymbol && (
                    <div className="flex justify-between">
                      <span className="font-medium">Token:</span>
                      <span>{orderDetails.tokenSymbol}</span>
                    </div>
                  )}
                  
                  {orderDetails.memo && (
                    <div className="flex justify-between">
                      <span className="font-medium">Memo/Order ID:</span>
                      <span className="truncate max-w-[180px]">{orderDetails.memo}</span>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Addresses */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Addresses</h4>
                  
                  {orderDetails.receiverAddress && (
                    <div className="flex justify-between">
                      <span className="font-medium">Receiver:</span>
                      <span className="truncate max-w-[180px] font-mono text-xs">
                        {orderDetails.receiverEns || 
                         `${orderDetails.receiverAddress.substring(0, 6)}...${orderDetails.receiverAddress.substring(orderDetails.receiverAddress.length - 4)}`}
                      </span>
                    </div>
                  )}
                  
                  {orderDetails.senderAddress && (
                    <div className="flex justify-between">
                      <span className="font-medium">Sender:</span>
                      <span className="truncate max-w-[180px] font-mono text-xs">
                        {orderDetails.senderEns || 
                         `${orderDetails.senderAddress.substring(0, 6)}...${orderDetails.senderAddress.substring(orderDetails.senderAddress.length - 4)}`}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* View Full Details Button */}
                <div className="pt-2">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    asChild
                  >
                    <a 
                      href={`https://yodl.me/tx/${orderDetails.txHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      View Full Details
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* QR Code Scanner Dialog */}
      <QRCodeScanner 
        isOpen={isQRScannerOpen} 
        onClose={closeQRScanner} 
        onScan={handleQRScan}
      />
    </>
  );
};

export default AdminLookup; 