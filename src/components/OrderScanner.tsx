import React, { useState, useEffect } from 'react';
import QRScanner from './QRScanner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WALLET_ADDRESS } from '../config/yodl';
import { useAuth } from '@/contexts/AuthContext';
import yodlService from '../lib/yodl';

// Define the parsed QR data structure
interface OrderData {
  orderId: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  status: string;
  txHash?: string;
  nonce?: string;
  productName?: string;
}

interface OrderScannerProps {
  isAdmin: boolean;
}

const OrderScanner: React.FC<OrderScannerProps> = ({ isAdmin }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawScanData, setRawScanData] = useState<string | null>(null);
  
  // Double-check admin status with AuthContext for security
  const { isAdmin: contextIsAdmin, isAuthenticated } = useAuth();
  const hasAdminAccess = contextIsAdmin && isAuthenticated && isAdmin;

  // Only allow verified admins to use this component
  if (!hasAdminAccess) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unauthorized Access</AlertTitle>
        <AlertDescription>
          Only verified merchants can access the order verification scanner.
        </AlertDescription>
      </Alert>
    );
  }

  // Log debug info when raw scan data changes
  useEffect(() => {
    if (rawScanData) {
      console.log('Raw QR Data Received:', rawScanData);
    }
  }, [rawScanData]);

  const handleScanResult = (result: string) => {
    if (!result) return;
    
    // Store raw data for debugging
    setRawScanData(result);
    console.log('QR Scan Raw Data:', result);
    
    try {
      // First check if the QR code is a URL (from confirmation page)
      if (result.includes('http')) {
        console.log('URL detected in QR code:', result);
        
        try {
          // Parse the URL to extract order information
          const url = new URL(result);
          console.log('Parsed URL:', url.toString());
          const pathParts = url.pathname.split('/');
          console.log('Path parts:', pathParts);
          
          // Check if it's a verify URL with format: /verify/{orderId}/{txHash}
          if (pathParts.length >= 3 && pathParts[1] === 'verify') {
            const orderId = pathParts[2];
            const txHash = pathParts.length >= 4 ? pathParts[3] : undefined;
            
            console.log('Extracted from URL - orderId:', orderId, 'txHash:', txHash);
            
            // Get stored order data if available
            const orderInfo = yodlService.getOrderInfo(orderId);
            console.log('Order info from storage:', orderInfo);
            
            if (orderInfo) {
              setScannedData({
                orderId,
                status: orderInfo.status || 'pending',
                amount: orderInfo.amount,
                currency: orderInfo.currency,
                txHash: txHash || orderInfo.txHash,
                timestamp: orderInfo.timestamp || new Date().toISOString(),
                productName: orderInfo.productName,
                nonce: orderInfo.nonce
              });
              setScanning(false);
              setError(null);
              return;
            } else if (txHash) {
              // If we have a txHash but no stored data, fetch from API asynchronously
              setScannedData({
                orderId,
                status: 'pending', // Will be updated after API response
                amount: 0,
                currency: 'UNKNOWN',
                txHash,
                timestamp: new Date().toISOString()
              });
              
              // Start API fetch in background
              fetchTransactionDetails(txHash, orderId);
              
              setScanning(false);
              setError(null);
              return;
            } else {
              setError('Order information not found for this QR code');
              return;
            }
          }
        } catch (urlError) {
          console.error('Error parsing URL:', urlError);
          // Continue to try JSON parsing if URL parsing failed
        }
      }
      
      // If not a URL, try to parse as JSON
      console.log('Attempting to parse as JSON');
      try {
        const parsedData = JSON.parse(result) as OrderData;
        console.log('Parsed JSON data:', parsedData);
        
        // Validate that the scanned data is indeed an order
        if (!parsedData.orderId || !parsedData.timestamp) {
          console.error('Invalid QR format - missing required fields');
          throw new Error('Invalid QR code format. Not a valid order.');
        }
        
        setScannedData(parsedData);
        setScanning(false);
        setError(null);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        throw new Error(`Failed to parse JSON: ${jsonError.message}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('QR Scan Error:', err);
      setError(`Failed to parse QR code: ${errorMessage}`);
      // Don't stop scanning on error
    }
  };

  // Function to fetch transaction details from API
  const fetchTransactionDetails = async (txHash: string, orderId: string) => {
    try {
      console.log(`Fetching transaction details for ${txHash}`);
      const paymentDetails = await yodlService.fetchPaymentDetails(txHash);
      console.log('Payment details from API:', paymentDetails);
      
      if (paymentDetails) {
        const updatedData = {
          orderId,
          status: 'completed' as const,
          amount: parseFloat(paymentDetails.amount || paymentDetails.tokenOutAmount || paymentDetails.invoiceAmount || '0'),
          currency: paymentDetails.currency || paymentDetails.tokenOutSymbol || paymentDetails.invoiceCurrency || 'UNKNOWN',
          txHash,
          timestamp: paymentDetails.timestamp || paymentDetails.blockTimestamp || paymentDetails.created || new Date().toISOString(),
        };
        
        // Update scanned data with API data
        setScannedData(updatedData);
        
        // Store this info for future reference
        yodlService.storeOrderInfo(orderId, updatedData);
      }
    } catch (apiError) {
      console.error('Error fetching payment details:', apiError);
      // Don't update UI with error since we already have partial data showing
    }
  };

  const handleScanError = (err: Error) => {
    console.error('QR Scanner Error:', err);
    setError(`Camera error: ${err.message}`);
  };

  const resetScanner = () => {
    setScannedData(null);
    setRawScanData(null);
    setError(null);
    setScanning(false);
  };

  const startScanning = () => {
    setScanning(true);
    setScannedData(null);
    setRawScanData(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="mb-4 md:mb-6 bg-gradient-to-br from-green-900/60 to-green-800/60 border border-green-400/30">
        <CardHeader className="pb-2 md:pb-4">
          <CardTitle className="text-lg md:text-xl text-green-100">Order Verification Scanner</CardTitle>
          <CardDescription className="text-xs md:text-sm text-green-200/80">
            Scan customer QR codes to verify order details and payment status.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {scanning ? (
            <div className="mb-3 md:mb-4">
              <QRScanner 
                onResult={handleScanResult}
                onError={handleScanError}
              />
              <p className="text-xs md:text-sm text-green-200/70 mt-2 text-center">
                Position the QR code in the frame to scan
              </p>
            </div>
          ) : (
            <>
              {scannedData && (
                <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 p-3 md:p-4 rounded-lg border border-green-400/30 mb-3 md:mb-4 text-white">
                  <h3 className="text-base md:text-lg font-medium text-green-300 mb-2">Order Details</h3>
                  <div className="text-xs md:text-sm space-y-1 md:space-y-2">
                    <p><span className="font-semibold">Order ID:</span> {scannedData.orderId}</p>
                    <p><span className="font-semibold">Status:</span> <span className={`px-2 py-0.5 md:py-1 rounded-full text-xs font-medium ${
                      scannedData.status === 'completed' ? 'bg-green-500/30 text-green-200' : 
                      scannedData.status === 'failed' ? 'bg-red-500/30 text-red-200' : 
                      'bg-yellow-500/30 text-yellow-200'
                    }`}>
                      {scannedData.status.charAt(0).toUpperCase() + scannedData.status.slice(1)}
                    </span></p>
                    <p><span className="font-semibold">Date:</span> {new Date(scannedData.timestamp).toLocaleString()}</p>
                    {scannedData.amount && scannedData.currency && (
                      <p><span className="font-semibold">Amount:</span> {scannedData.amount} {scannedData.currency}</p>
                    )}
                    {scannedData.txHash && (
                      <div>
                        <p className="font-semibold">Transaction:</p>
                        <a
                          href={`https://yodl.me/tx/${scannedData.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-300 hover:text-green-200 hover:underline break-all text-[10px] md:text-xs"
                        >
                          {scannedData.txHash}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="mb-3 md:mb-4 text-xs md:text-sm">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {rawScanData && !scannedData && (
                <Alert className="mb-3 md:mb-4 text-xs md:text-sm">
                  <AlertTitle>Debug Info</AlertTitle>
                  <AlertDescription className="break-all">
                    <p>Raw data: {rawScanData.substring(0, 100)}{rawScanData.length > 100 ? '...' : ''}</p>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-between px-3 pb-3 md:px-6 md:pb-6 pt-0">
          {scanning ? (
            <Button onClick={() => setScanning(false)} size="sm" className="border border-green-400/20 hover:bg-green-400/10 text-xs md:text-sm">Cancel</Button>
          ) : (
            <>
              <Button onClick={startScanning} size="sm" className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-0 text-xs md:text-sm h-8 md:h-10">
                {scannedData ? 'Scan Another Order' : 'Start Scanning'}
              </Button>
              {scannedData && (
                <Button onClick={resetScanner} size="sm" className="ml-2 border border-green-400/20 hover:bg-green-400/10 text-xs md:text-sm h-8 md:h-10">
                  Clear
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default OrderScanner; 