FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git python3 make g++ curl

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S hardhat -u 1001 -G nodejs

# Copy package files
COPY package*.json ./

# Install dependencies as root then change ownership
RUN npm install && \
    chown -R hardhat:nodejs /app

# Copy source code and fix ownership
COPY --chown=hardhat:nodejs . .

USER hardhat

# Expose Hardhat network port
EXPOSE 8545

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8545 || exit 1

# Default command - run Hardhat network
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]