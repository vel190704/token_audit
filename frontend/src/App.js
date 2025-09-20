import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import detectEthereumProvider from '@metamask/detect-provider';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Import components
import Dashboard from './components/Dashboard';
import TransactionUpload from './components/TransactionUpload';
import AuditTrail from './components/AuditTrail';
import SMERegistration from './components/SMERegistration';
import LoadingSpinner from './components/LoadingSpinner';

// Import utilities
import { shortenAddress } from './utils/helpers';

function App() {
  // State management
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [smeData, setSmeData] = useState(null);
  const [networkError, setNetworkError] = useState(null);

  // Initialize Web3 and MetaMask connection
  useEffect(() => {
    initializeWeb3();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);
    }

    return () => {
      // Cleanup event listeners
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, []);

  const initializeWeb3 = async () => {
    try {
      setIsLoading(true);
      
      // Check for Ethereum provider
      const provider = await detectEthereumProvider();
      
      if (!provider) {
        toast.error('MetaMask not detected. Please install MetaMask to continue.');
        setIsLoading(false);
        return;
      }

      // Initialize Web3
      const web3Instance = new Web3(provider);
      setWeb3(web3Instance);

      // Get network information
      const networkId = await web3Instance.eth.net.getId();
      setChainId(networkId);

      // Check if already connected
      const accounts = await web3Instance.eth.getAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setIsConnected(true);
        
        // Check if SME is registered
        await checkSMERegistration(accounts[0]);
        
        toast.success('Wallet connected successfully!');
      }

      // Validate network
      validateNetwork(networkId);
      
    } catch (error) {
      console.error('Error initializing Web3:', error);
      toast.error('Failed to initialize Web3. Please refresh and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateNetwork = (networkId) => {
    // Define supported networks
    const supportedNetworks = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      1337: 'Local Development'
    };

    if (!supportedNetworks[networkId]) {
      setNetworkError(`Unsupported network. Please switch to one of: ${Object.values(supportedNetworks).join(', ')}`);
    } else {
      setNetworkError(null);
    }
  };

  const connectWallet = async () => {
    if (!web3) {
      toast.error('Web3 not initialized. Please refresh the page.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      const accounts = await web3.eth.getAccounts();
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      setAccount(accounts[0]);
      setIsConnected(true);
      
      // Check SME registration
      await checkSMERegistration(accounts[0]);
      
      toast.success('Wallet connected successfully!');
      
    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      if (error.code === 4001) {
        toast.error('Connection rejected by user.');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const checkSMERegistration = async (walletAddress) => {
    try {
      const response = await fetch(`http://localhost:8000/api/sme/${walletAddress}/stats`);
      if (response.ok) {
        const data = await response.json();
        setSmeData(data);
      } else if (response.status === 404) {
        // SME not registered
        setSmeData(null);
        if (currentView !== 'register') {
          toast.info('Please register your SME to start using the audit trail.');
        }
      }
    } catch (error) {
      console.error('Error checking SME registration:', error);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // User disconnected
      setAccount('');
      setIsConnected(false);
      setSmeData(null);
      toast.info('Wallet disconnected.');
    } else if (accounts[0] !== account) {
      // User switched accounts
      setAccount(accounts[0]);
      checkSMERegistration(accounts[0]);
      toast.info('Account switched.');
    }
  };

  const handleChainChanged = (chainId) => {
    // Convert hex to decimal
    const networkId = parseInt(chainId, 16);
    setChainId(networkId);
    validateNetwork(networkId);
    toast.info('Network changed. Please refresh if you encounter issues.');
  };

  const handleDisconnect = () => {
    setAccount('');
    setIsConnected(false);
    setSmeData(null);
    toast.info('Wallet disconnected.');
  };

  const renderCurrentView = () => {
    if (!isConnected) {
      return (
        <div className="connect-prompt fade-in">
          <h2>🏢 Welcome to SME Audit Trail</h2>
          <p>
            Create transparent, immutable, and verifiable transaction records 
            using blockchain technology. Connect your MetaMask wallet to get started.
          </p>
          
          {networkError && (
            <div className="result error">
              <h3>⚠️ Network Error</h3>
              <p>{networkError}</p>
            </div>
          )}
          
          <button 
            className="connect-btn-large" 
            onClick={connectWallet}
            disabled={isLoading || networkError}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="small" />
                Connecting...
              </>
            ) : (
              <>
                🦊 Connect MetaMask
              </>
            )}
          </button>
          
          <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: 'var(--gray-500)' }}>
            <p>
              Don't have MetaMask? 
              <a 
                href="https://metamask.io/download/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ marginLeft: '0.5rem' }}
              >
                Download here
              </a>
            </p>
          </div>
        </div>
      );
    }

    // Show registration if SME not registered
    if (!smeData && currentView !== 'register') {
      return (
        <SMERegistration 
          account={account} 
          web3={web3} 
          onRegistrationSuccess={(data) => {
            setSmeData(data);
            setCurrentView('dashboard');
            toast.success('SME registered successfully!');
          }}
        />
      );
    }

    // Render based on current view
    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard 
            account={account} 
            web3={web3} 
            smeData={smeData}
            onDataUpdate={() => checkSMERegistration(account)}
          />
        );
      case 'upload':
        return (
          <TransactionUpload 
            account={account} 
            web3={web3} 
            smeData={smeData}
            onUploadSuccess={() => {
              checkSMERegistration(account);
              toast.success('Transaction uploaded successfully!');
            }}
          />
        );
      case 'audit':
        return (
          <AuditTrail 
            account={account} 
            web3={web3} 
            smeData={smeData}
          />
        );
      case 'register':
        return (
          <SMERegistration 
            account={account} 
            web3={web3} 
            onRegistrationSuccess={(data) => {
              setSmeData(data);
              setCurrentView('dashboard');
              toast.success('SME registered successfully!');
            }}
          />
        );
      default:
        return (
          <Dashboard 
            account={account} 
            web3={web3} 
            smeData={smeData}
            onDataUpdate={() => checkSMERegistration(account)}
          />
        );
    }
  };

  const getViewTitle = () => {
    const titles = {
      dashboard: '📊 Dashboard',
      upload: '📤 Upload Transaction',
      audit: '🔍 Audit Trail',
      register: '📝 Register SME'
    };
    return titles[currentView] || titles.dashboard;
  };

  if (isLoading && !isConnected) {
    return (
      <div className="App">
        <div className="loading">
          <LoadingSpinner />
          Initializing application...
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>🏢 SME Audit Trail</h1>
        
        {isConnected && (
          <nav className="nav-menu">
            <button 
              className={currentView === 'dashboard' ? 'active' : ''}
              onClick={() => setCurrentView('dashboard')}
            >
              📊 Dashboard
            </button>
            
            {smeData && (
              <>
                <button 
                  className={currentView === 'upload' ? 'active' : ''}
                  onClick={() => setCurrentView('upload')}
                >
                  📤 Upload
                </button>
                <button 
                  className={currentView === 'audit' ? 'active' : ''}
                  onClick={() => setCurrentView('audit')}
                >
                  🔍 Audit Trail
                </button>
              </>
            )}
            
            <button 
              className={currentView === 'register' ? 'active' : ''}
              onClick={() => setCurrentView('register')}
            >
              📝 {smeData ? 'Re-register' : 'Register'}
            </button>
          </nav>
        )}

        <div className="wallet-section">
          {isConnected ? (
            <div className="wallet-info">
              <span>🟢 Connected</span>
              <span className="account">
                {shortenAddress(account)}
              </span>
              {smeData && (
                <span style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  {smeData.company_name}
                </span>
              )}
            </div>
          ) : (
            <button 
              className="connect-btn" 
              onClick={connectWallet}
              disabled={isLoading}
            >
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        {networkError && (
          <div className="result error">
            <h3>⚠️ Network Error</h3>
            <p>{networkError}</p>
          </div>
        )}
        
        {renderCurrentView()}
      </main>

      {/* Toast notifications */}
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}

export default App;