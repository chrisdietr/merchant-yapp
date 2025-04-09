# Deploying Merchant Yapp to Vercel

This guide explains how to deploy the Merchant Yapp application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Git repository with your Merchant Yapp code
3. Node.js installed on your local machine

## Deployment Steps

### 1. Prepare Your Project

Ensure your project has the following files correctly configured:

- `vercel.json` - Contains the Vercel-specific configuration
- `.env.production` - Contains production environment variables
- `vite.config.ts` - Configured for Vercel deployment

### 2. Deploy to Vercel

#### Option 1: Deploy via the Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and log in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure the project:
   - Framework Preset: Vite
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
   - Install Command: `npm install` (default)
5. Add Environment Variables:
   - Add the variables from your `.env.production` file
   - Make sure to add `VITE_WALLETCONNECT_PROJECT_ID`
6. Click "Deploy"

#### Option 2: Deploy via Vercel CLI

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Log in to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project directory:
   ```bash
   vercel
   ```

4. Follow the prompts and select the appropriate options.

### 3. Configure Custom Domain

1. In the Vercel dashboard, go to your project settings
2. Click on "Domains"
3. Add your domain: `merchant-yapp.vercel.app`
4. Follow the instructions to configure DNS settings if needed

### 4. Verify Deployment

1. Visit your deployed site at https://merchant-yapp.vercel.app
2. Verify that all functionality works correctly:
   - Wallet connections
   - Payment processing
   - Order confirmations
   - QR code generation

## Troubleshooting

### URL Issues

If you encounter issues with URLs or redirects:

1. Check that `VITE_BASE_URL` is properly set in your environment variables
2. Verify that the URL utilities are being used correctly
3. Check browser console for any errors related to URL generation

### API Limitations

Remember that some RPC providers may have different rate limits in production. Consider using dedicated API keys for production deployment.

## Continuous Deployment

Vercel automatically deploys your application when you push changes to your connected Git repository. No additional configuration is needed for continuous deployment. 