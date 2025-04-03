import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderScanner from '../components/OrderScanner';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';

const AdminScannerPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();
  // Get auth context values
  const { isAdmin, isAuthenticated, setIsAdmin, address, signIn, isLoading } = useAuth();
  const isDev = process.env.NODE_ENV === 'development';
  
  // Check if user has admin access (must be both admin AND authenticated)
  const hasAdminAccess = isAdmin && isAuthenticated;
  
  // No development bypass - security is critical
  
  // Finish loading after initial render
  useEffect(() => {
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4 md:py-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-center text-green-100">Admin Order Scanner</h1>
      
      {!address ? (
        <div className="text-center p-4 md:p-6 bg-gradient-to-br from-green-900/60 to-green-800/60 text-white rounded-lg mb-4 md:mb-6 border border-green-400/30">
          <h2 className="text-base md:text-lg font-semibold mb-2">Wallet Connection Required</h2>
          <p className="mb-4 text-xs md:text-sm text-green-200/80">
            Please connect your wallet to access the admin scanner.
          </p>
          <Button onClick={() => navigate('/')} className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-0">
            Return to Home
          </Button>
        </div>
      ) : !isAdmin ? (
        <Alert variant="destructive" className="mb-4 md:mb-6">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription className="space-y-3 text-sm">
            <p>
              The connected wallet ({address.substring(0, 6)}...{address.substring(address.length - 4)}) 
              is not authorized to access this page.
            </p>
            <p>
              Please connect with an admin wallet to continue.
            </p>
          </AlertDescription>
        </Alert>
      ) : !isAuthenticated ? (
        <Alert className="mb-4 md:mb-6 bg-gradient-to-br from-green-900/60 to-green-800/60 border border-green-400/30">
          <AlertTitle className="text-green-100">Authentication Required</AlertTitle>
          <AlertDescription className="space-y-3 text-xs md:text-sm text-green-200/80">
            <p>
              Your wallet has admin privileges, but you need to sign in with Ethereum to access admin tools.
            </p>
            <div className="pt-2">
              <Button 
                onClick={() => signIn()}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 mt-2 border-0 text-sm"
              >
                {isLoading ? 'Signing...' : 'Sign-In with Ethereum'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Alert className="mb-4 md:mb-6 bg-gradient-to-br from-green-900/60 to-green-800/60 border border-green-400/30">
            <AlertTitle className="text-green-100">Admin Access Granted</AlertTitle>
            <AlertDescription className="text-xs md:text-sm text-green-200/80">
              You can now scan customer order QR codes to verify payment details.
            </AlertDescription>
          </Alert>
          
          <OrderScanner isAdmin={true} />
        </>
      )}

      <div className="mt-4 md:mt-6 text-center">
        <Button
          className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 border-0"
          onClick={() => navigate('/')}
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default AdminScannerPage; 