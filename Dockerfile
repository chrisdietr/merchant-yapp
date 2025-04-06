# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install dependencies without frozen lockfile
RUN bun install --no-frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1 AS production

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY bun.lockb ./

# Install production dependencies only without frozen lockfile
RUN bun install --no-frozen-lockfile --production

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Set environment variables
ENV NODE_ENV=production

# Expose the port your app runs on
EXPOSE 3000

# Start the server
CMD ["bun", "start"]