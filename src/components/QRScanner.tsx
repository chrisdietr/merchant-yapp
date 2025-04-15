import React, { useState, useEffect } from 'react';
import QrScanner from 'react-qr-scanner';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, X, Camera } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
}

const QRCodeScanner: React.FC<QRScannerProps> = ({ isOpen, onClose, onScan }) => {
  const [error, setError] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get available cameras when component mounts
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setCameras(videoDevices);
          
          // Default to the back camera if available (typically has "back" or "environment" in the label)
          const backCamera = videoDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('environment')
          );
          
          if (backCamera) {
            setDeviceId(backCamera.deviceId);
          } else if (videoDevices.length > 0) {
            setDeviceId(videoDevices[0].deviceId);
          }
          
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error accessing cameras:', err);
          setError('Could not access camera. Please ensure you have granted camera permissions.');
          setIsLoading(false);
        });
    } else {
      setDeviceId(null);
      setError(null);
    }
  }, [isOpen]);

  const handleScan = (data: { text: string } | null) => {
    if (data && data.text) {
      try {
        console.log('QR Code scanned:', data.text);
        
        // Try to extract memo ID from the URL
        let memoId: string | null = null;
        
        // Parse the URL to check for parameters
        try {
          const url = new URL(data.text);
          // Check for orderId parameter (confirmation URLs from this app)
          const orderId = url.searchParams.get('orderId');
          if (orderId) {
            memoId = orderId;
          }
          
          // Check for memo in the URL (might be in different formats)
          if (!memoId) {
            const memo = url.searchParams.get('memo');
            if (memo) {
              memoId = memo;
            }
          }
          
          // Check for txHash (could be used to look up the transaction directly)
          const txHash = url.searchParams.get('txHash');
          if (txHash && txHash.startsWith('0x')) {
            memoId = txHash;
          }
          
          // Last resort: check if the URL path contains a transaction hash format
          if (!memoId) {
            const pathSegments = url.pathname.split('/');
            const potentialTxHash = pathSegments.find(segment => segment.startsWith('0x'));
            if (potentialTxHash && potentialTxHash.length === 66) {
              memoId = potentialTxHash;
            }
          }
        } catch (e) {
          console.error('Error parsing QR URL:', e);
          // If this isn't a URL, maybe it's directly a transaction hash or memo ID
          if (data.text.startsWith('0x') && data.text.length === 66) {
            memoId = data.text;
          } else if (data.text.startsWith('order_')) {
            memoId = data.text;
          }
        }
        
        if (memoId) {
          onScan(memoId);
          onClose();
        } else {
          setError('Could not find a valid transaction or order ID in the QR code.');
        }
      } catch (err) {
        console.error('Error processing QR code:', err);
        setError('Failed to process QR code data.');
      }
    }
  };

  const handleError = (err: any) => {
    console.error('QR Scanner error:', err);
    setError('Error scanning QR code. Please try again.');
  };

  const switchCamera = () => {
    if (cameras.length <= 1) return;
    
    const currentIndex = cameras.findIndex(cam => cam.deviceId === deviceId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setDeviceId(cameras[nextIndex].deviceId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at an order confirmation QR code to scan it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : deviceId ? (
            <div className="overflow-hidden rounded border border-border">
              <QrScanner
                delay={300}
                onError={handleError}
                onScan={handleScan}
                constraints={{
                  audio: false,
                  video: { deviceId: deviceId }
                }}
                className="w-full h-64 object-cover"
                style={{ width: '100%', height: '300px' }}
              />
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
              <Camera className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-center text-gray-500">No camera available or permission denied</p>
            </div>
          )}
          
          {cameras.length > 1 && deviceId && (
            <Button 
              onClick={switchCamera} 
              size="sm" 
              variant="secondary"
              className="absolute top-2 right-2 p-2 h-8 w-8"
            >
              <Camera className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded text-sm mt-2">
            {error}
          </div>
        )}
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          
          {cameras.length > 1 && (
            <Button 
              variant="secondary" 
              onClick={switchCamera}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              <Camera className="h-4 w-4 mr-2" />
              Switch Camera
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QRCodeScanner; 