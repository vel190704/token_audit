#!/bin/bash

# Tokenized Audit Trail - Deployment Script
# This script automates the deployment process

set -e

echo "🚀 Starting Tokenized Audit Trail Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required commands exist
check_requirements() {
    print_status "Checking requirements..."
    
    commands=("node" "npm" "python3" "docker" "docker-compose")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is not installed"
            exit 1
        fi
    done
    print_status "All requirements satisfied"
}

# Setup environment files
setup_env_files() {
    print_status "Setting up environment files..."
    
    # Smart contracts .env
    if [ ! -f "smart-contracts/.env" ]; then
        cp smart-contracts/.env.example smart-contracts/.env
        print_warning "Please edit smart-contracts/.env with your configuration"
    fi
    
    # Backend .env
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_warning "Please edit backend/.env with your configuration"
    fi
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        cp frontend/.env.example frontend/.env
        print_warning "Please edit frontend/.env with your configuration"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Smart contracts
    print_status "Installing smart contract dependencies..."
    cd smart-contracts
    npm install
    cd ..
    
    # Backend
    print_status "Installing backend dependencies..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    cd ..
    
    # Frontend
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
}

# Deploy smart contracts
deploy_contracts() {
    print_status "Deploying smart contracts..."
    cd smart-contracts
    
    # Compile contracts
    npx hardhat compile
    
    # Deploy to local network
    if [ "$1" = "local" ]; then
        print_status "Starting local blockchain..."
        npx hardhat node &
        sleep 5
        npx hardhat run scripts/deploy.js --network localhost
    elif [ "$1" = "testnet" ]; then
        npx hardhat run scripts/deploy.js --network goerli
    elif [ "$1" = "mainnet" ]; then
        print_warning "Deploying to mainnet. Are you sure? (y/N)"
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            npx hardhat run scripts/deploy.js --network mainnet
        else
            print_status "Mainnet deployment cancelled"
            exit 0
        fi
    fi
    
    cd ..
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Check if PostgreSQL is running
    if ! pg_isready -h localhost -p 5432 &> /dev/null; then
        print_error "PostgreSQL is not running. Please start PostgreSQL service."
        exit 1
    fi
    
    # Run database migrations
    cd backend
    source venv/bin/activate
    python -c "
from database import engine
from models import Base
Base.metadata.create_all(bind=engine)
print('Database tables created successfully')
"
    cd ..
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Smart contract tests
    print_status "Running smart contract tests..."
    cd smart-contracts
    npx hardhat test
    cd ..
    
    # Backend tests
    print_status "Running backend tests..."
    cd backend
    source venv/bin/activate
    python -m pytest
    cd ..
    
    # Frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm test -- --watchAll=false
    cd ..
}

# Start services
start_services() {
    print_status "Starting services..."
    
    if [ "$1" = "docker" ]; then
        docker-compose up -d
        print_status "Services started with Docker Compose"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:8000"
        print_status "API Docs: http://localhost:8000/docs"
    else
        # Start backend
        print_status "Starting backend..."
        cd backend
        source venv/bin/activate
        uvicorn main:app --reload &
        cd ..
        
        # Start frontend
        print_status "Starting frontend..."
        cd frontend
        npm start &
        cd ..
        
        print_status "Services started in development mode"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:8000"
    fi
}

# Main deployment function
deploy() {
    local environment=${1:-"local"}
    local mode=${2:-"dev"}
    
    print_status "Deploying to $environment in $mode mode"
    
    check_requirements
    setup_env_files
    
    if [ "$mode" = "docker" ]; then
        start_services "docker"
    else
        install_dependencies
        deploy_contracts "$environment"
        setup_database
        
        if [ "$3" = "test" ]; then
            run_tests
        fi
        
        start_services
    fi
    
    print_status "🎉 Deployment completed successfully!"
    print_status "Please check the services and ensure everything is working correctly."
}

# Help function
show_help() {
    echo "Tokenized Audit Trail Deployment Script"
    echo ""
    echo "Usage: $0 [environment] [mode] [options]"
    echo ""
    echo "Environments:"
    echo "  local     - Local development (default)"
    echo "  testnet   - Ethereum testnet (Goerli)"
    echo "  mainnet   - Ethereum mainnet"
    echo ""
    echo "Modes:"
    echo "  dev       - Development mode (default)"
    echo "  docker    - Docker Compose mode"
    echo ""
    echo "Options:"
    echo "  test      - Run tests after deployment"
    echo ""
    echo "Examples:"
    echo "  $0                          # Local development"
    echo "  $0 local docker             # Local with Docker"
    echo "  $0 testnet dev test         # Testnet with tests"
    echo "  $0 --help                   # Show this help"
}

# Parse command line arguments
case $1 in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        deploy "$@"
        ;;
esac