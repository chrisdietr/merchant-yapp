import { FiatCurrency } from '@yodlpay/yapp-sdk';

/**
 * Format a currency amount with the appropriate currency symbol
 * Handles both fiat currencies and crypto tokens
 */
export function formatCurrency(amount: number | string, currency: string): string {
  // Ensure amount is a number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Default to 2 decimal places
  const decimals = 2;
  
  // Convert crypto token symbols to standard currency codes if needed
  let formattedCurrency = currency;
  let isCryptoToken = false;
  
  // Check if this is a crypto token rather than a standard currency
  if (currency && !Object.values(FiatCurrency).includes(currency as any)) {
    // This is likely a crypto token
    isCryptoToken = true;
    
    // For tokens like USDC that represent USD, we can use USD for formatting
    if (currency === 'USDC' || currency === 'USDT' || currency === 'DAI') {
      formattedCurrency = 'USD';
    }
  }
  
  try {
    if (isCryptoToken) {
      // For crypto tokens, use a simpler display format
      if (isNaN(numericAmount)) {
        return `0.00 ${currency}`;
      }
      return `${numericAmount.toFixed(decimals)} ${currency}`;
    } else {
      // For standard currencies, use the Intl formatter
      const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: formattedCurrency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      };
      return new Intl.NumberFormat('en-US', options).format(numericAmount);
    }
  } catch (error) {
    // Fallback in case of any errors
    console.error('Error formatting currency:', error);
    if (isNaN(numericAmount)) {
      return `0.00 ${currency}`;
    }
    return `${numericAmount.toFixed(decimals)} ${currency}`;
  }
} 