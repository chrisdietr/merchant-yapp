// import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { requireAdmin } from '@/lib/auth'

const SHOPS_FILE_PATH = path.join(process.cwd(), 'public', 'shops.json')

// Create a response helper similar to NextResponse
const createJsonResponse = (data: any, options = {}) => {
  const { status = 200 } = options as { status?: number };
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export async function POST(request: Request) {
  try {
    const userAddress = request.headers.get('x-user-address')
    if (!userAddress || !requireAdmin(userAddress)) {
      return createJsonResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const product = await request.json()
    
    // Read current products
    const shopsData = JSON.parse(fs.readFileSync(SHOPS_FILE_PATH, 'utf-8'))
    
    // Add new product
    const newProduct = {
      id: Date.now().toString(),
      ...product,
      owner: userAddress,
    }
    
    shopsData.products.push(newProduct)
    
    // Write back to file
    fs.writeFileSync(SHOPS_FILE_PATH, JSON.stringify(shopsData, null, 2))
    
    return createJsonResponse(newProduct)
  } catch (error) {
    console.error('Error adding product:', error)
    return createJsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const userAddress = request.headers.get('x-user-address')
    if (!userAddress || !requireAdmin(userAddress)) {
      return createJsonResponse({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await request.json()
    
    // Read current products
    const shopsData = JSON.parse(fs.readFileSync(SHOPS_FILE_PATH, 'utf-8'))
    
    // Find and remove product
    const productIndex = shopsData.products.findIndex(
      (p: any) => p.id === productId && p.owner.toLowerCase() === userAddress.toLowerCase()
    )
    
    if (productIndex === -1) {
      return createJsonResponse(
        { error: 'Product not found or unauthorized' },
        { status: 404 }
      )
    }
    
    shopsData.products.splice(productIndex, 1)
    
    // Write back to file
    fs.writeFileSync(SHOPS_FILE_PATH, JSON.stringify(shopsData, null, 2))
    
    return createJsonResponse({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return createJsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 