import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderScanner from '@/components/OrderScanner';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

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
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Admin Order Scanner</h1>
        
        {isAdmin && isAuthenticated ? (
          <>
            <div className="bg-card p-4 border rounded-lg mb-6">
              <h2 className="text-lg font-medium mb-2 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Admin Scanner Features
              </h2>
              <ul className="list-disc list-inside space-y-1 text-sm md:text-base">
                <li>Scan QR codes from customer payment confirmations</li>
                <li>Verify payment status and transaction details instantly</li>
                <li>See product information including emoji and description</li>
                <li>View buyer's wallet address for transaction verification</li>
                <li>Access direct links to blockchain transactions</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/40 rounded-md border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-sm">
                <strong>Pro Tip:</strong> Position the QR code from the customer's payment confirmation screen directly in the scanner frame for best results.
              </div>
            </div>
            <OrderScanner isAdmin={true} />
          </>
        ) : (
          <Alert variant="destructive">
            <AlertTitle>Admin Access Required</AlertTitle>
            <AlertDescription>
              You do not have permission to use the Admin Scanner. Please sign in with an admin account.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default AdminScannerPage; 