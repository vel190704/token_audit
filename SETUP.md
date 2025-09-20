# Tokenized Audit Trail - Quick Setup Guide

## Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v16 or higher) and npm
- **Python** (v3.9 or higher)
- **PostgreSQL** (v12 or higher)
- **Git**
- **MetaMask** browser extension

## Quick Start (Development Environment)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd tokenized-audit-trail
```

### 2. Smart Contract Setup

```bash
cd smart-contracts
npm install
```

Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

Compile and deploy contracts:
```bash
npx hardhat compile
npx hardhat node  # In a separate terminal
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Database Setup

Create PostgreSQL database:
```sql
CREATE DATABASE audit_trail_db;
CREATE USER audit_user WITH PASSWORD 'audit_password';
GRANT ALL PRIVILEGES ON DATABASE audit_trail_db TO audit_user;
```

### 4. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` file:
```bash
cp .env.example .env
# Edit .env with your database and blockchain configuration
```

Start the backend:
```bash
uvicorn main:app --reload
```

### 5. Frontend Setup

```bash
cd frontend
npm install
npm start
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Production Deployment

### Environment Variables

Create production environment files with appropriate values:

**Smart Contracts (.env):**
```bash
INFURA_API_KEY=your_infura_project_id
PRIVATE_KEY=your_deployment_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

**Backend (.env):**
```bash
DATABASE_URL=postgresql://user:password@host:port/database
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_project_id
SECRET_KEY=your_super_secret_key
DEBUG=false
```

### Docker Deployment

Use the provided Docker configuration:

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Testing

### Smart Contracts
```bash
cd smart-contracts
npx hardhat test
```

### Backend
```bash
cd backend
python -m pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Troubleshooting

### Common Issues

1. **MetaMask Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check that you're on the correct network
   - Refresh the page and try reconnecting

2. **Smart Contract Deployment Fails**
   - Verify you have sufficient ETH for gas fees
   - Check network configuration in hardhat.config.js
   - Ensure private key has proper permissions

3. **Backend Database Errors**
   - Verify PostgreSQL is running
   - Check database credentials in .env
   - Ensure database exists and user has permissions

4. **IPFS Connection Issues**
   - Install and run local IPFS node: `ipfs daemon`
   - Or use Infura IPFS endpoint
   - Check IPFS_API_URL in backend .env

### Logs and Debugging

- Backend logs: Check terminal running `uvicorn`
- Smart contract logs: Use `console.log` in contracts and `npx hardhat node`
- Frontend logs: Open browser developer tools

## Support

For additional help:

1. Check the [documentation](./docs/) folder
2. Review the API documentation at `/docs` endpoint
3. Create an issue in the repository
4. Contact the development team

## Security Notes

- Never commit private keys or sensitive data
- Use environment variables for all configuration
- Enable HTTPS in production
- Regularly update dependencies
- Audit smart contracts before mainnet deployment