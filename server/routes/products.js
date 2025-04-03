import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const SHOPS_FILE = path.join(__dirname, '../../src/config/shops.json');

// Debug middleware for product routes
const debugProducts = (req, res, next) => {
  console.log('Product Request:', {
    path: req.path,
    method: req.method,
    session: req.session,
    body: req.body
  });
  next();
};

router.use(debugProducts);

// Helper function to read products
const readProducts = () => {
  try {
    console.log('Reading products from:', SHOPS_FILE);
    const data = fs.readFileSync(SHOPS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading products:', error);
    return { products: [] };
  }
};

// Helper function to write products
const writeProducts = (products) => {
  try {
    fs.writeFileSync(SHOPS_FILE, JSON.stringify(products, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing products:', error);
    return false;
  }
};

// GET all products
router.get('/', (req, res) => {
  try {
    const products = readProducts();
    console.log(`Returning ${products.products.length} products`);
    res.json(products);
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ success: false, message: 'Error retrieving products' });
  }
});

// POST a new product - requires admin auth
router.post('/', adminMiddleware, (req, res) => {
  try {
    console.log('Adding new product:', req.body);
    
    const { name, description, price, image } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ success: false, message: 'Name and price are required' });
    }
    
    const products = readProducts();
    const newProduct = {
      id: uuidv4(),
      name,
      description: description || '',
      price,
      image: image || '',
      owner: req.user.address
    };
    
    products.products.push(newProduct);
    
    if (writeProducts(products)) {
      console.log('Product added successfully:', newProduct);
      res.status(201).json({ success: true, product: newProduct });
    } else {
      res.status(500).json({ success: false, message: 'Error saving product' });
    }
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ success: false, message: 'Error adding product' });
  }
});

// PUT update a product - requires auth and ownership
router.put('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image } = req.body;
    
    console.log(`Updating product ${id}:`, req.body);
    
    const products = readProducts();
    const productIndex = products.products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const product = products.products[productIndex];
    
    // Check ownership or admin status
    if (product.owner !== req.user.address && !req.user.isAdmin) {
      console.error(`User ${req.user.address} attempted to update product owned by ${product.owner}`);
      return res.status(403).json({ success: false, message: 'Not authorized to update this product' });
    }
    
    // Update product
    products.products[productIndex] = {
      ...product,
      name: name || product.name,
      description: description !== undefined ? description : product.description,
      price: price || product.price,
      image: image !== undefined ? image : product.image
    };
    
    if (writeProducts(products)) {
      console.log('Product updated successfully:', products.products[productIndex]);
      res.json({ success: true, product: products.products[productIndex] });
    } else {
      res.status(500).json({ success: false, message: 'Error updating product' });
    }
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, message: 'Error updating product' });
  }
});

// DELETE a product - requires auth and ownership
router.delete('/:id', authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`Deleting product ${id}`);
    
    const products = readProducts();
    const productIndex = products.products.findIndex(p => p.id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const product = products.products[productIndex];
    
    // Check ownership or admin status
    if (product.owner !== req.user.address && !req.user.isAdmin) {
      console.error(`User ${req.user.address} attempted to delete product owned by ${product.owner}`);
      return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
    }
    
    products.products.splice(productIndex, 1);
    
    if (writeProducts(products)) {
      console.log('Product deleted successfully');
      res.json({ success: true, message: 'Product deleted successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Error deleting product' });
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

export default router; 