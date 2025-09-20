#!/bin/bash

# Docker Compose Service Health Check and Startup Script
set -e

echo "🚀 Starting SME Audit Trail Services..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for service to be ready
wait_for_service() {
    local service=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for $service to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker compose ps $service | grep -q "Up"; then
            print_status "$service is ready ✅"
            return 0
        fi
        
        echo "Attempt $attempt/$max_attempts - waiting for $service..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service failed to start after $max_attempts attempts"
    return 1
}

# Function to check service health
check_service_health() {
    local service=$1
    print_status "Checking $service health..."
    docker compose logs $service --tail=10
}

# Stop any existing containers
print_status "Stopping existing containers..."
docker compose down

# Rebuild containers with latest changes
print_status "Rebuilding containers..."
docker compose build --no-cache

# Start infrastructure services first
print_status "Starting infrastructure services..."
docker compose up -d postgres redis ipfs

# Wait for infrastructure to be ready
wait_for_service postgres
wait_for_service redis
wait_for_service ipfs

# Start blockchain service
print_status "Starting Hardhat blockchain service..."
docker compose up -d hardhat

# Wait and check Hardhat
print_status "Waiting for Hardhat to initialize..."
sleep 10
check_service_health hardhat

# Start backend service
print_status "Starting backend API..."
docker compose up -d backend

# Wait for backend to be ready
wait_for_service backend

# Check backend health
print_status "Checking backend health..."
sleep 5
check_service_health backend

# Start frontend service
print_status "Starting frontend..."
docker compose up -d frontend

# Wait for frontend
wait_for_service frontend

# Finally start nginx
print_status "Starting nginx reverse proxy..."
docker compose up -d nginx

# Wait for nginx
wait_for_service nginx

# Final status check
print_status "Checking final status of all services..."
docker compose ps

print_status "🎉 All services started successfully!"
print_status "Frontend: http://localhost:3000"
print_status "Backend API: http://localhost:8001"
print_status "API Docs: http://localhost:8001/docs"
print_status "IPFS Gateway: http://localhost:8080"
print_status "PostgreSQL: localhost:5432"
print_status "Redis: localhost:6380"

print_warning "If any service is unhealthy, check logs with:"
print_warning "docker compose logs [service-name]"