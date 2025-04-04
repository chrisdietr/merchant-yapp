import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import shopsData from "@/config/shops.json"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface Shop {
  ownerAddress: string;
  name: string;
  telegramHandle: string;
  contactInfo?: {
    email: string;
    phone: string;
  };
}

/**
 * Get shop information by owner address
 * @param ownerAddress Ethereum address of the shop owner
 * @returns Shop information or null if not found
 */
export function getShopByOwnerAddress(ownerAddress: string): Shop | null {
  // Normalize address for case-insensitive comparison
  const normalizedAddress = ownerAddress.toLowerCase();
  
  // Find shop with matching owner address
  const shop = shopsData.shops.find(
    shop => shop.ownerAddress.toLowerCase() === normalizedAddress
  );
  
  return shop || null;
}

/**
 * Generate a Telegram chat link with prepopulated message
 * @param telegramHandle Telegram handle without the @ symbol
 * @param message Message to prepopulate in the chat
 * @returns URL that opens Telegram chat
 */
export function generateTelegramLink(telegramHandle: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://t.me/${telegramHandle}?text=${encodedMessage}`;
}
