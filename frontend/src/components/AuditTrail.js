import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';
import { 
  formatCurrency, 
  formatDate, 
  formatBlockchainHash, 
  getTransactionTypeIcon,
  copyToClipboard 
} from '../utils/helpers';
import { toast } from 'react-toastify';

const AuditTrail = ({ account, web3, smeData }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  const itemsPerPage = 10;

  useEffect(() => {
    if (account && smeData) {
      fetchAuditTrail();
    }
  }, [account, smeData, currentPage]);

  const fetchAuditTrail = async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * itemsPerPage;
      const response = await axios.get(
        `http://localhost:8001/api/audit-trail/${account}?limit=${itemsPerPage}&offset=${offset}`
      );

      setTransactions(response.data.transactions || []);
      setTotalTransactions(response.data.total_transactions || 0);

    } catch (error) {
      console.error('Error fetching audit trail:', error);
      setError('Failed to load audit trail. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTransaction = async (tokenId) => {
    try {
      const response = await axios.post(`http://localhost:8001/api/verify/${tokenId}`, {
        wallet_address: account
      });

      if (response.data.is_verified) {
        toast.success('Transaction verified successfully!');
      } else {
        toast.warning('Transaction verification failed.');
      }

      // Refresh the audit trail
      fetchAuditTrail();

    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify transaction.');
    }
  };

  const handleCopyHash = async (hash, type) => {
    const success = await copyToClipboard(hash);
    if (success) {
      toast.success(`${type} hash copied to clipboard!`);
    } else {
      toast.error('Failed to copy to clipboard.');
    }
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.token_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.transaction_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType) {
      filtered = filtered.filter(tx => tx.transaction_type === filterType);
    }

    // Apply status filter
    if (filterStatus) {
      filtered = filtered.filter(tx => tx.verification_status === filterStatus);
    }

    return filtered;
  };

  const totalPages = Math.ceil(totalTransactions / itemsPerPage);
  const filteredTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <LoadingSpinner />
          Loading audit trail...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="result error">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button className="btn" onClick={fetchAuditTrail}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🔍 Audit Trail</h2>
        </div>

        <p style={{ marginBottom: '2rem', color: 'var(--gray-600)' }}>
          Complete history of all blockchain-verified transactions for {smeData?.company_name}. 
          Each record is immutably stored and cryptographically verifiable.
        </p>

        {/* Filters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="search">Search</label>
            <input
              type="text"
              id="search"
              placeholder="Search by token ID, description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filterType">Transaction Type</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="PAYMENT">Payment</option>
              <option value="INVOICE">Invoice</option>
              <option value="EXPENSE">Expense</option>
              <option value="RECEIPT">Receipt</option>
              <option value="REFUND">Refund</option>
              <option value="CONTRACT">Contract</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="filterStatus">Status</label>
            <select
              id="filterStatus"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1rem',
          padding: '1rem',
          background: 'var(--gray-50)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <span>
            Showing {filteredTransactions.length} of {totalTransactions} transactions
          </span>
          <button className="btn btn-secondary" onClick={fetchAuditTrail}>
            🔄 Refresh
          </button>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            {transactions.length === 0 ? (
              <>
                <p>No transactions found.</p>
                <p>Upload your first transaction to create an audit trail!</p>
              </>
            ) : (
              <p>No transactions match your current filters.</p>
            )}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Token ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Blockchain</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td 
                      className="hash" 
                      title={tx.token_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleCopyHash(tx.token_id, 'Token ID')}
                    >
                      {tx.token_id}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        background: 'var(--gray-100)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {getTransactionTypeIcon(tx.transaction_type)}
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="amount">
                      {formatCurrency(tx.amount, tx.currency)}
                    </td>
                    <td>
                      <span className={`status-badge status-${tx.verification_status}`}>
                        {tx.verification_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {formatDate(tx.created_at)}
                    </td>
                    <td>
                      {tx.blockchain_verified ? (
                        <span 
                          style={{ color: 'var(--success-color)', cursor: 'pointer' }}
                          title={tx.blockchain_hash}
                          onClick={() => handleCopyHash(tx.blockchain_hash, 'Blockchain')}
                        >
                          ✅ Verified
                        </span>
                      ) : (
                        <span style={{ color: 'var(--gray-400)' }}>
                          ⏳ Pending
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => setSelectedTransaction(tx)}
                        >
                          👁️ View
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          onClick={() => handleVerifyTransaction(tx.token_id)}
                        >
                          🔍 Verify
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '1rem',
            marginTop: '2rem'
          }}>
            <button
              className="btn btn-secondary"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              ← Previous
            </button>
            
            <span style={{ fontSize: '0.875rem', color: 'var(--gray-600)' }}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              className="btn btn-secondary"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Transaction Details</h3>
              <button
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '1.5rem', 
                  cursor: 'pointer' 
                }}
                onClick={() => setSelectedTransaction(null)}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <strong>Token ID:</strong>
                <p style={{ 
                  fontFamily: 'Monaco, monospace', 
                  fontSize: '0.875rem', 
                  background: 'var(--gray-100)',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer' 
                }}
                onClick={() => handleCopyHash(selectedTransaction.token_id, 'Token ID')}
                >
                  {selectedTransaction.token_id}
                </p>
              </div>
              
              <div>
                <strong>Type:</strong>
                <p>{getTransactionTypeIcon(selectedTransaction.transaction_type)} {selectedTransaction.transaction_type}</p>
              </div>
              
              <div>
                <strong>Amount:</strong>
                <p>{formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}</p>
              </div>
              
              <div>
                <strong>Status:</strong>
                <p>
                  <span className={`status-badge status-${selectedTransaction.verification_status}`}>
                    {selectedTransaction.verification_status}
                  </span>
                </p>
              </div>
              
              <div>
                <strong>Date Created:</strong>
                <p>{formatDate(selectedTransaction.created_at)}</p>
              </div>
              
              {selectedTransaction.description && (
                <div>
                  <strong>Description:</strong>
                  <p>{selectedTransaction.description}</p>
                </div>
              )}
              
              {selectedTransaction.file_name && (
                <div>
                  <strong>File:</strong>
                  <p>{selectedTransaction.file_name} ({selectedTransaction.file_size} bytes)</p>
                </div>
              )}
              
              {selectedTransaction.blockchain_hash && (
                <div>
                  <strong>Blockchain Hash:</strong>
                  <p style={{ 
                    fontFamily: 'Monaco, monospace', 
                    fontSize: '0.875rem', 
                    background: 'var(--gray-100)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    wordBreak: 'break-all'
                  }}
                  onClick={() => handleCopyHash(selectedTransaction.blockchain_hash, 'Blockchain')}
                  >
                    {selectedTransaction.blockchain_hash}
                  </p>
                </div>
              )}
              
              {selectedTransaction.ipfs_hash && (
                <div>
                  <strong>IPFS Hash:</strong>
                  <p style={{ 
                    fontFamily: 'Monaco, monospace', 
                    fontSize: '0.875rem', 
                    background: 'var(--gray-100)',
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    wordBreak: 'break-all'
                  }}
                  onClick={() => handleCopyHash(selectedTransaction.ipfs_hash, 'IPFS')}
                  >
                    {selectedTransaction.ipfs_hash}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;