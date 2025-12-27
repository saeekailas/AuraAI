# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the static build
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/dist ./dist

# Create a simple server script for serving the dist folder
RUN echo '#!/bin/sh\nserve -s dist -l 3000' > /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Run application
CMD ["/entrypoint.sh"]
