# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install dependencies with legacy peer deps to handle React version conflicts
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install PM2 globally
RUN npm install -g pm2

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package-lock.json ./

# Install production dependencies only with legacy peer deps
RUN npm install --legacy-peer-deps --production && \
    npm install session-file-store && \
    npm cache clean --force && \
    mkdir -p sessions

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Add PM2 configuration
COPY ecosystem.config.cjs ./

# Set environment variables
ENV NODE_ENV=production
ENV MALLOC_ARENA_MAX=2
ENV NODE_OPTIONS="--max-old-space-size=512 --experimental-specifier-resolution=node"

# Expose the port your app runs on
EXPOSE 3000

# Start the server using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.cjs"]