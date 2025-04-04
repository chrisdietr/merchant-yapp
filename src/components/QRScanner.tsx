import React, { useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface QRScannerProps {
  onResult: (result: string) => void;
  onError?: (error: Error) => void;
  className?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ onResult, onError, className }) => {
  const [error, setError] = useState<string | null>(null);

  const handleScan = (result: any) => {
    if (result) {
      console.log('QR Scan Result:', result);
      if (result?.text) {
        onResult(result.text);
      }
    }
  };

  const handleError = (err: Error) => {
    console.error('QR Scanner Error:', err);
    setError(`Camera error: ${err.message}`);
    
    if (onError) {
      onError(err);
    }
  };

  return (
    <div className={`qr-scanner-container ${className || ''}`}>
      {error ? (
        <Alert variant="destructive" className="mb-3">
          <AlertTitle>Camera Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <QrReader
          constraints={{ facingMode: 'environment' }}
          onResult={handleScan}
          scanDelay={500}
          videoId="qr-video"
          videoStyle={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover' 
          }}
          containerStyle={{ 
            width: '100%', 
            aspectRatio: '4/3',
            borderRadius: '0.375rem',
            overflow: 'hidden'
          }}
        />
      )}
    </div>
  );
};

export default QRScanner; 