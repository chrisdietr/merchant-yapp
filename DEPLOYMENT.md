# Deploying Merchant Yapp to Vercel

This guide explains how to deploy the Merchant Yapp application to Vercel and Docker.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com)) - For Vercel deployment
2. Git repository with your Merchant Yapp code
3. Node.js installed on your local machine
4. Docker installed - For Docker deployment

## Deployment Options

### A. Vercel Deployment

#### 1. Prepare Your Project

Ensure your project has the following files correctly configured:

- `vercel.json` - Contains the Vercel-specific configuration
- `.env.production` - Contains production environment variables, including:
  - `VITE_ADMIN_CONFIG` - JSON configuration for admin settings
  - `VITE_SHOP_CONFIG` - JSON configuration for shop settings
  - `VITE_WALLETCONNECT_PROJECT_ID` - Your WalletConnect project ID
- `vite.config.ts` - Configured for Vercel deployment

#### 2. Deploy to Vercel

##### Option 1: Deploy via the Vercel Dashboard (Web UI)

Use this method if you prefer a graphical interface and want to connect to your Git repository for continuous deployment.

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
   - Make sure to add `VITE_WALLETCONNECT_PROJECT_ID`, `VITE_ADMIN_CONFIG`, and `VITE_SHOP_CONFIG`
6. Click "Deploy"

##### Option 2: Deploy via Vercel CLI (Command Line)

Use this method if you prefer working from the command line or need to automate deployments.

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

4. For a production deployment:
   ```bash
   vercel --prod
   ```

5. To specify environment variables on deploy:
   ```bash
   vercel --env VITE_ADMIN_CONFIG='{"admins":[{"ens":"your.ens","address":"0x123..."}]}' \
          --env VITE_SHOP_CONFIG='{"shops":[{"name":"Your Shop","telegramHandle":"your_handle"}],"products":[...]}' \
          --env VITE_WALLETCONNECT_PROJECT_ID='your_project_id'
   ```

### B. Docker Deployment

Docker provides a consistent deployment environment across different platforms.

#### 1. Build the Docker Image

```bash
# Basic build
docker build -t merchant-yapp .

# Build with build args
docker build -t merchant-yapp \
  --build-arg VITE_WALLETCONNECT_PROJECT_ID=your_project_id \
  --build-arg VITE_ADMIN_CONFIG='{"admins":[{"ens":"your.ens","address":"0x123..."}]}' \
  --build-arg VITE_SHOP_CONFIG='{"shops":[{"name":"Your Shop"}],"products":[...]}' \
  .
```

#### 2. Run the Docker Container

```bash
# Basic run on port 3000
docker run -p 3000:80 merchant-yapp

# Run with environment variables
docker run -p 3000:80 \
  -e VITE_WALLETCONNECT_PROJECT_ID=your_project_id \
  -e VITE_ADMIN_CONFIG='{"admins":[{"ens":"your.ens","address":"0x123..."}]}' \
  -e VITE_SHOP_CONFIG='{"shops":[{"name":"Your Shop"}],"products":[...]}' \
  merchant-yapp

# Run in detached mode (background)
docker run -d -p 3000:80 merchant-yapp

# Run with a name and auto-restart
docker run -d -p 3000:80 --name merchant-yapp-app --restart unless-stopped merchant-yapp
```

#### 3. Docker Compose (Optional)

Create a `docker-compose.yml` file:

```yaml
version: '3'
services:
  merchant-yapp:
    build: .
    ports:
      - "3000:80"
    environment:
      - VITE_WALLETCONNECT_PROJECT_ID=your_project_id
      - VITE_ADMIN_CONFIG={"admins":[{"ens":"your.ens","address":"0x123..."}]}
      - VITE_SHOP_CONFIG={"shops":[{"name":"Your Shop"}],"products":[...]}
    restart: unless-stopped
```

Then run:

```bash
docker-compose up -d
```

## Post-Deployment Steps

### 1. Configure Custom Domain

1. In the Vercel dashboard, go to your project settings
2. Click on "Domains"
3. Add your domain (e.g., `merchant-yapp.yourdomain.com`)
4. Follow the instructions to configure DNS settings

### 2. Verify Deployment

1. Visit your deployed site at your domain or Vercel URL
2. Verify that all functionality works correctly:
   - Wallet connections
   - Payment processing
   - Order confirmations
   - QR code generation

## Troubleshooting

### URL Issues

If you encounter issues with URLs or redirects:

1. Check that environment variables are properly set
2. Verify that the URL utilities are being used correctly
3. Check browser console for any errors related to URL generation

### API Limitations

Remember that some RPC providers may have different rate limits in production. Consider using dedicated API keys for production deployment.

## Continuous Deployment

Vercel automatically deploys your application when you push changes to your connected Git repository. No additional configuration is needed for continuous deployment.

For Docker-based deployments, consider setting up a CI/CD pipeline with GitHub Actions, GitLab CI, or Jenkins to automate your build and deployment process. 