import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import FileStore from 'session-file-store';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import util from 'util';

// Configure util.inspect to handle circular references
util.inspect.defaultOptions.depth = 4;
util.inspect.defaultOptions.maxStringLength = 100;
util.inspect.defaultOptions.breakLength = 80;
util.inspect.defaultOptions.compact = true;

// Import routes
import productsRouter from './routes/products.js';
import authRouter from './routes/auth.js';
import siweRouter from './routes/siwe.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8089';

const FileStoreSession = FileStore(session);

const app = express();

// Security
app.use(helmet({
  contentSecurityPolicy: false // Disabled for development
}));

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Session configuration with file store
app.use(session({
  store: new FileStoreSession({
    path: './sessions',
    ttl: 86400, // 1 day
    reapInterval: 3600, // 1 hour
    retries: 0
  }),
  secret: process.env.SESSION_SECRET || 'supersecretkey',
  name: 'connect.sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'lax'
  },
  rolling: true // Extend session on activity
}));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.session) {
    const now = new Date();
    console.log('Session data:', util.inspect(req.session, { colors: true }));
    
    if (req.session.cookie) {
      console.log('Cookie expiration details:');
      console.log('  Current time:', now);
      console.log('  Cookie expires:', req.session.cookie._expires);
      console.log('  Time until expiry:', req.session.cookie._expires ? Math.floor((req.session.cookie._expires - now) / 1000) + ' seconds' : 'N/A');
      console.log('  Original maxAge:', req.session.cookie.originalMaxAge, 'ms');
    }
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API Routes
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);
app.use('/api/siwe', siweRouter);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
}); 