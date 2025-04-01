
export interface Product {
  id: string
  name: string
  price: number
  description: string
  image: string
}

export interface ShopData {
  products: Product[]
}
