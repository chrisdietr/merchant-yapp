import React, { useState, useEffect } from 'react';
import { FiatCurrency, Payment } from '@yodlpay/yapp-sdk';
import YodlService from '../lib/yodl';
import YodlBuyNowButton from '../components/YodlBuyNowButton';
import { Button } from "@/components/ui/button";
import { SUPPORTED_CURRENCIES } from '../config/yodl';

const YodlPaymentPage: React.FC = () => {
  const [amount, setAmount] = useState<number>(10);
  const [currency, setCurrency] = useState<FiatCurrency>(FiatCurrency.USD);
  const [orderId, setOrderId] = useState<string>(`order_${Date.now()}`);
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Check for payment information in URL on component mount
  useEffect(() => {
    // Parse payment information from URL (for redirect flow)
    const urlPaymentResult = YodlService.parsePaymentFromUrl();

    if (urlPaymentResult) {
      // Payment was successful via redirect
      setPaymentResult(urlPaymentResult);
      console.log('Payment successful (redirect):', urlPaymentResult);

      // Fetch additional payment details
      fetchPaymentDetails(urlPaymentResult.txHash);

      // Clean the URL to prevent duplicate processing on refresh
      YodlService.cleanPaymentUrl();
    }
  }, []);

  // Fetch payment details from Yodl API
  const fetchPaymentDetails = async (txHash: string) => {
    try {
      const details = await YodlService.fetchPaymentDetails(txHash);
      setPaymentDetails(details);
    } catch (error) {
      console.error('Error fetching payment details:', error);
    }
  };

  // Handle SDK payment directly (not through YodlBuyNowButton)
  const handleDirectSDKPayment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Request payment using our service wrapper
      await YodlService.requestPayment(amount, currency, orderId);
      
      // Note: The above will redirect or return a response, so the code below
      // will only execute if it's in an iframe or if there's an issue
      setLoading(false);
    } catch (error) {
      console.error('Payment error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'Payment was cancelled') {
          setError('Payment was cancelled by user');
        } else if (error.message === 'Payment request timed out') {
          setError('Payment request timed out after 5 minutes');
        } else {
          setError(`Payment failed: ${error.message}`);
        }
      } else {
        setError('An unknown error occurred');
      }
      
      setLoading(false);
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (txHash: string, chainId: number) => {
    // Convert txHash to the expected format (0x prefixed string)
    const payment = {
      txHash: txHash.startsWith('0x') ? txHash as `0x${string}` : `0x${txHash}` as `0x${string}`,
      chainId
    };
    setPaymentResult(payment);
    fetchPaymentDetails(txHash);
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    if (error.message === 'Payment was cancelled') {
      setError('Payment was cancelled by user');
    } else if (error.message === 'Payment request timed out') {
      setError('Payment request timed out after 5 minutes');
    } else {
      setError(`Payment failed: ${error.message}`);
    }
  };

  // Reset payment state
  const resetPayment = () => {
    setPaymentResult(null);
    setPaymentDetails(null);
    setError(null);
    setOrderId(`order_${Date.now()}`);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Yodl Payment Demo</h1>

      {!paymentResult && !error ? (
        <div className="payment-form space-y-4">
          {/* Amount Input */}
          <div className="mb-4">
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Currency Selector */}
          <div className="mb-4">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as FiatCurrency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>

          {/* Order ID */}
          <div className="mb-4">
            <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-1">
              Order ID (Used as memo)
            </label>
            <input
              type="text"
              id="orderId"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              This ID is used as the memo field in Yodl payments
            </p>
          </div>

          {/* Payment Options */}
          <div className="mt-6 space-y-4">
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium mb-2">Option 1: Using YodlBuyNowButton</h3>
              <p className="text-sm text-gray-600 mb-3">
                Uses the Yodl SDK to redirect to a unique confirmation page
              </p>
              <YodlBuyNowButton
                amount={amount}
                currency={currency}
                orderId={orderId}
                buttonText="Pay with Yodl SDK"
              />
            </div>
            
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="font-medium mb-2">Option 2: Direct SDK Call</h3>
              <p className="text-sm text-gray-600 mb-3">
                Uses the SDK requestPayment method directly
              </p>
              <Button
                onClick={handleDirectSDKPayment}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Processing...' : 'Pay with Direct SDK Call'}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700 border border-blue-100">
            <p>
              <strong>Note:</strong> Both methods use the memo field to track your order info.
              Your order ID is stored in localStorage and used to generate a unique QR code.
            </p>
          </div>
        </div>
      ) : (
        <div className="result-container">
          {/* Payment Success */}
          {paymentResult && (
            <div className="success-message bg-green-50 p-4 rounded-lg border border-green-200 mb-4">
              <h2 className="text-xl font-semibold text-green-800 mb-2">Payment Successful!</h2>
              <div className="space-y-2">
                <p>
                  <strong>Transaction Hash:</strong>{' '}
                  <a
                    href={`https://yodl.me/tx/${paymentResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 break-all hover:underline"
                  >
                    {paymentResult.txHash}
                  </a>
                </p>
                <p>
                  <strong>Chain ID:</strong> {paymentResult.chainId}
                </p>
                
                {/* Additional Payment Details */}
                {paymentDetails && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h3 className="text-lg font-medium text-green-800 mb-2">Payment Details</h3>
                    <p>
                      <strong>Amount:</strong> {paymentDetails.tokenOutAmountGross} {paymentDetails.tokenOutSymbol}
                    </p>
                    <p>
                      <strong>Timestamp:</strong> {new Date(paymentDetails.blockTimestamp).toLocaleString()}
                    </p>
                    <p>
                      <strong>Sender:</strong> {paymentDetails.senderAddress}
                      {paymentDetails.senderEnsPrimaryName && ` (${paymentDetails.senderEnsPrimaryName})`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Error */}
          {error && (
            <div className="error-message bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Payment Error</h2>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={resetPayment}
            className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
          >
            Start New Payment
          </button>
        </div>
      )}
    </div>
  );
};

export default YodlPaymentPage; 