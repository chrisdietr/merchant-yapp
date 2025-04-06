# Build stage
FROM node:20 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20 AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install production dependencies only
RUN npm ci --production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Set environment variables
ENV NODE_ENV=production

# Expose the port your app runs on
EXPOSE 3000

# Start the server
CMD ["npm", "start"]