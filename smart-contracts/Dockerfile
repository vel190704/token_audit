FROM node:16-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git python3 make g++ curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S hardhat -u 1001
RUN chown -R hardhat:nodejs /app
USER hardhat

# Expose Hardhat network port
EXPOSE 8545

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8545 || exit 1

# Default command - run Hardhat network
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]