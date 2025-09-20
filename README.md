# Tokenized Audit Trail System

A comprehensive blockchain-based audit trail system for SMEs (Small and Medium Enterprises) that provides transparent, immutable, and verifiable transaction records.

## 🏗️ Architecture

```
tokenized-audit-trail/
├── smart-contracts/          # Solidity contracts
├── backend/                  # FastAPI backend
├── frontend/                 # React.js frontend
├── docs/                     # Documentation
├── tests/                    # Test files
└── docker/                   # Docker configurations
```

## 🚀 Features

- **Blockchain Integration**: Ethereum-based smart contracts for immutable audit trails
- **IPFS Storage**: Decentralized file storage for transaction documents
- **Web3 Interface**: MetaMask integration for seamless user experience
- **FastAPI Backend**: High-performance API with database integration
- **React Frontend**: Modern, responsive user interface
- **Token-based Verification**: Unique tokenization for each transaction

## 🛠️ Technology Stack

### Smart Contracts
- Solidity ^0.8.0
- OpenZeppelin Contracts
- Hardhat Development Environment

### Backend
- Python 3.9+
- FastAPI
- SQLAlchemy
- Web3.py
- IPFS Client
- PostgreSQL

### Frontend
- React 18
- Web3.js
- MetaMask Integration
- Axios for API calls

## 📋 Prerequisites

- Node.js 16+ and npm
- Python 3.9+
- MetaMask Browser Extension
- Git

## ⚡ Quick Start

### 1. Clone and Setup
```bash
git clone <repository-url>
cd tokenized-audit-trail
```

### 2. Smart Contract Setup
```bash
cd smart-contracts
npm install
npx hardhat compile
npx hardhat test
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🧪 Testing

Run comprehensive tests:
```bash
# Smart contract tests
cd smart-contracts && npx hardhat test

# Backend tests
cd backend && python -m pytest

# Frontend tests
cd frontend && npm test
```

## 📚 Documentation

- [Smart Contract Documentation](./docs/smart-contracts.md)
- [API Documentation](./docs/api.md)
- [Frontend Guide](./docs/frontend.md)
- [Deployment Guide](./docs/deployment.md)

## 🔐 Security Features

- OpenZeppelin security standards
- Reentrancy protection
- Access control mechanisms
- Data integrity verification
- IPFS content addressing

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions, please create an issue in the repository.