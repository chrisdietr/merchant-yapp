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
