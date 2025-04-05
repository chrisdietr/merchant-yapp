import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import shopsData from "@/config/shops.json"
import { Shop } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Look up a shop by owner address
 * @param ownerAddress The owner's Ethereum address
 * @returns The shop object or null if not found
 */
export function getShopByOwnerAddress(ownerAddress: string): Shop | null {
  if (!ownerAddress || !shopsData.shops) return null;
  
  const normalizedAddress = ownerAddress.toLowerCase();
  const shop = shopsData.shops.find(
    (shop: Shop) => 
      shop.ownerAddress && 
      shop.ownerAddress.toLowerCase() === normalizedAddress
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

/**
 * Check if the current page is running inside an iframe
 * @returns True if the page is in an iframe, false otherwise
 */
export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we can't access window.top due to same-origin policy,
    // we're definitely in an iframe
    return true;
  }
}

/**
 * Gets the parent origin URL when running in an iframe
 * @returns The parent origin or null if not in iframe or origin can't be determined
 */
export function getParentOrigin(): string | null {
  if (!isInIframe()) return null;
  
  try {
    if (document.referrer) {
      const url = new URL(document.referrer);
      return `${url.protocol}//${url.host}`;
    }
  } catch (e) {
    console.error('Error getting parent origin:', e);
  }
  
  return null;
}

/**
 * Open a URL properly handling iframe contexts
 * @param url The URL to open
 * @param target Optional target (_blank, _self, etc). Defaults to _blank
 */
export function openUrl(url: string, target: string = '_blank'): void {
  if (isInIframe()) {
    // In iframe context, we need to handle URL opening differently
    try {
      // First attempt: Try to communicate with parent frame
      window.parent.postMessage({ type: 'OPEN_URL', url, target }, '*');
      
      // As a fallback, still try to open the URL
      setTimeout(() => {
        window.open(url, target);
      }, 100);
    } catch (e) {
      // Fallback if postMessage fails
      window.open(url, target);
    }
  } else {
    // Normal context, just open the URL
    window.open(url, target);
  }
}
