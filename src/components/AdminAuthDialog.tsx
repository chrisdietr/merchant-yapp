import React, { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { adminConfig } from '../config/config';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { createSiweMessage, generateNonce, saveAdminAuth } from '../utils/siwe';

interface AdminAuthDialogProps {
  isOpen: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

// Custom dialog content with higher z-index
const HighZIndexDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>((props, ref) => (
  <DialogContent
    ref={ref}
    className="z-[100] sm:max-w-md"
    {...props}
  />
));
HighZIndexDialogContent.displayName = "HighZIndexDialogContent";

const AdminAuthDialog: React.FC<AdminAuthDialogProps> = ({ isOpen, onSuccess, onClose }) => {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isAdmin = address ? 
    adminConfig.admins.some(admin => admin.address?.toLowerCase() === address?.toLowerCase()) 
    : false;
  
  // If the connected wallet isn't an admin, show an error
  if (!isAdmin) {
    return (
      <Dialog open={isOpen} onOpenChange={() => onClose()}>
        <HighZIndexDialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Not Authorized
            </DialogTitle>
            <DialogDescription>
              The connected wallet is not registered as an admin for this store.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        </HighZIndexDialogContent>
      </Dialog>
    );
  }
  
  const handleAuthenticate = async () => {
    if (!address) return;
    
    try {
      setIsAuthenticating(true);
      setError(null);
      
      // Generate a nonce
      const nonce = generateNonce();
      
      // Create the SIWE message with a simpler statement
      const message = createSiweMessage(
        address,
        'Sign to verify you are the admin of this merchant store.',
        nonce
      );
      
      console.log("SIWE Message:", message); // For debugging
      
      // Request signature from the user
      const signature = await signMessageAsync({ 
        message,
        account: address as `0x${string}`
      });
      
      if (signature) {
        // Signature verified in the wallet, so we can consider this authenticated
        saveAdminAuth(address);
        onSuccess();
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      // Format error message for better user experience
      let errorMsg = 'Failed to authenticate. Please try again.';
      
      if (err.message) {
        if (err.message.includes('User rejected the request')) {
          errorMsg = 'You declined to sign the message. Authentication is required to access admin features.';
        } else if (err.message.includes('invalid')) {
          errorMsg = 'There was an issue with the authentication message format. Please try again.';
        }
      }
      
      setError(errorMsg);
    } finally {
      setIsAuthenticating(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <HighZIndexDialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Admin Authentication
          </DialogTitle>
          <DialogDescription>
            Please sign a message with your wallet to verify you control this admin address.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive" className="my-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4 flex flex-col gap-4">
          <Button 
            onClick={handleAuthenticate} 
            className="w-full" 
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign Message to Authenticate'
            )}
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full"
            disabled={isAuthenticating}
          >
            Cancel
          </Button>
        </div>
      </HighZIndexDialogContent>
    </Dialog>
  );
};

export default AdminAuthDialog; 