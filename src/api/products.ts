import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

const SHOPS_FILE_PATH = path.join(process.cwd(), 'public', 'shops.json')

export async function POST(request: Request) {
  try {
    const { address } = request.headers.get('x-user-address')
    if (!requireAdmin(address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await request.json()
    
    // Read current products
    const shopsData = JSON.parse(fs.readFileSync(SHOPS_FILE_PATH, 'utf-8'))
    
    // Add new product
    const newProduct = {
      id: Date.now().toString(),
      ...product,
      owner: address,
    }
    
    shopsData.products.push(newProduct)
    
    // Write back to file
    fs.writeFileSync(SHOPS_FILE_PATH, JSON.stringify(shopsData, null, 2))
    
    return NextResponse.json(newProduct)
  } catch (error) {
    console.error('Error adding product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const { address } = request.headers.get('x-user-address')
    if (!requireAdmin(address)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await request.json()
    
    // Read current products
    const shopsData = JSON.parse(fs.readFileSync(SHOPS_FILE_PATH, 'utf-8'))
    
    // Find and remove product
    const productIndex = shopsData.products.findIndex(
      (p: any) => p.id === productId && p.owner.toLowerCase() === address.toLowerCase()
    )
    
    if (productIndex === -1) {
      return NextResponse.json(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      )
    }
    
    shopsData.products.splice(productIndex, 1)
    
    // Write back to file
    fs.writeFileSync(SHOPS_FILE_PATH, JSON.stringify(shopsData, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 