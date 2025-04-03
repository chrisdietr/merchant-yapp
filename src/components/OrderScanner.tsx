import React, { useState } from 'react';
import QrScanner from 'react-qr-scanner';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WALLET_ADDRESS } from '../config/yodl';
import { useAuth } from '@/contexts/AuthContext';

// Define the parsed QR data structure
interface OrderData {
  orderId: string;
  timestamp: string;
  amount?: number;
  currency?: string;
  status: string;
  txHash?: string;
  nonce?: string;
}

interface OrderScannerProps {
  isAdmin: boolean;
}

const OrderScanner: React.FC<OrderScannerProps> = ({ isAdmin }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
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

  const handleScan = (data: { text: string } | null) => {
    if (data && data.text) {
      try {
        // Parse QR code data
        const parsedData = JSON.parse(data.text) as OrderData;
        
        // Validate that the scanned data is indeed an order
        if (!parsedData.orderId || !parsedData.timestamp) {
          throw new Error('Invalid QR code format. Not a valid order.');
        }
        
        setScannedData(parsedData);
        setScanning(false);
        setError(null);
      } catch (err) {
        setError('Failed to parse QR code. Please try again.');
        console.error('QR Scan Error:', err);
      }
    }
  };

  const handleError = (err: Error) => {
    setError(`Camera error: ${err.message}`);
    console.error('QR Scanner Error:', err);
  };

  const resetScanner = () => {
    setScannedData(null);
    setError(null);
    setScanning(false);
  };

  const startScanning = () => {
    setScanning(true);
    setScannedData(null);
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
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                <QrScanner
                  delay={300}
                  onError={handleError}
                  onScan={handleScan}
                  constraints={{
                    video: { facingMode: "environment" }
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
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