import React, { useState } from 'react';
import { FiatCurrency } from '@yodlpay/yapp-sdk';
import YodlBuyNowButton from '../components/YodlBuyNowButton';
import { SUPPORTED_CURRENCIES } from '../config/yodl';

// Sample product data
const product = {
  id: 'prod-123',
  name: 'Premium Subscription',
  description: 'Access to all premium content for one month',
  price: 25,
  defaultCurrency: FiatCurrency.USD,
  image: 'https://via.placeholder.com/400x300',
};

const ProductPage: React.FC = () => {
  const [selectedCurrency, setSelectedCurrency] = useState<FiatCurrency>(product.defaultCurrency);
  const [quantity, setQuantity] = useState<number>(1);

  // Calculate total price
  const totalPrice = product.price * quantity;
  
  // Generate unique order ID with product info
  const orderId = `${product.id}_qty${quantity}_${Date.now()}`;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <div className="rounded-lg overflow-hidden">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-auto"
          />
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          <div className="text-xl font-semibold mb-4">
            {totalPrice} {selectedCurrency}
          </div>
          <p className="text-gray-600 mb-6">
            {product.description}
          </p>

          {/* Currency Selector */}
          <div className="mb-4">
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
              Select Currency
            </label>
            <select
              id="currency"
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value as FiatCurrency)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {SUPPORTED_CURRENCIES.map((curr) => (
                <option key={curr} value={curr}>
                  {curr}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Selector */}
          <div className="mb-6">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <div className="flex items-center">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-3 py-1 border border-gray-300 rounded-l-md bg-gray-100"
              >
                -
              </button>
              <input
                type="number"
                id="quantity"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-16 text-center border-t border-b border-gray-300 py-1 px-2"
              />
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-3 py-1 border border-gray-300 rounded-r-md bg-gray-100"
              >
                +
              </button>
            </div>
          </div>

          {/* Buy Now Button */}
          <div className="mt-6">
            <div className="text-center mb-2">
              <p className="text-sm text-gray-600">Payment via Yodl SDK</p>
            </div>
            <YodlBuyNowButton
              amount={totalPrice}
              currency={selectedCurrency}
              orderId={orderId}
              buttonText="Buy Now"
              buttonClassName="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 w-full text-lg"
            />
            <p className="text-xs text-gray-500 mt-2">
              Secure payment via Yodl. You'll receive a unique confirmation QR code after payment.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage; 