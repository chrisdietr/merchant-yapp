
export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  emoji: string
  owner?: string
  inStock?: string | boolean
}

export interface ShopData {
  products: Product[]
}

export interface Shop {
  ownerAddress: string;
  name: string;
  telegramHandle: string;
  contactInfo?: {
    email?: string;
    phone?: string;
  };
}
