import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LoadingSpinner from './LoadingSpinner';

const Dashboard = ({ account, web3, smeData, onDataUpdate }) => {
  const [stats, setStats] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (account && smeData) {
      fetchDashboardData();
    }
  }, [account, smeData]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch SME statistics
      const statsResponse = await axios.get(
        `http://localhost:8001/api/dashboard/${account}`,
        { timeout: 10000 }
      );
      
      // Ensure we have default values for all required properties
      const statsData = {
        total_transactions: 0,
        total_amount: 0.0,
        verified_transactions: 0,
        pending_transactions: 0,
        recent_transactions: [],
        company_name: 'Your SME',
        ...statsResponse.data
      };
      
      setStats(statsData);

      // Fetch recent transactions (limited to 5 for dashboard)
      const auditResponse = await axios.get(`http://localhost:8001/api/audit-trail/${account}?limit=5`);
      setRecentTransactions(auditResponse.data.transactions || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again.');
      
      // Set default data to prevent undefined errors
      setStats({
        total_transactions: 0,
        total_amount: 0.0,
        verified_transactions: 0,
        pending_transactions: 0,
        recent_transactions: [],
        company_name: 'Your SME'
      });
      setRecentTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'var(--success-color)';
      case 'pending': return 'var(--warning-color)';
      case 'failed': return 'var(--danger-color)';
      default: return 'var(--gray-400)';
    }
  };

  const getTransactionTypeData = () => {
    if (!recentTransactions.length) return [];

    const typeCount = recentTransactions.reduce((acc, tx) => {
      acc[tx.transaction_type] = (acc[tx.transaction_type] || 0) + 1;
      return acc;
    }, {});

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return Object.entries(typeCount).map(([type, count], index) => ({
      name: type,
      value: count,
      color: colors[index % colors.length]
    }));
  };

  const getMonthlyData = () => {
    if (!recentTransactions.length) return [];

    const monthlyData = recentTransactions.reduce((acc, tx) => {
      const month = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short' });
      acc[month] = (acc[month] || 0) + parseFloat(tx.amount);
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount: Math.round(amount * 100) / 100
    }));
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <LoadingSpinner />
          Loading dashboard...
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
          <button className="btn" onClick={fetchDashboardData}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!smeData) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📊 Dashboard</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h3>Welcome to SME Audit Trail</h3>
          <p>Please register your SME to start using the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">📊 Dashboard</h2>
        </div>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h3>Welcome back, {smeData.company_name}! 👋</h3>
          <p style={{ color: 'var(--gray-600)', marginBottom: 0 }}>
            Here's an overview of your audit trail activity.
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Total Transactions</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                {stats?.total_transactions || 0}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Verified</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                {stats?.verified_transactions || 0}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Pending</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                {stats?.pending_transactions || 0}
              </p>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              color: 'white',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center'
            }}>
              <h4 style={{ color: 'white', margin: '0 0 0.5rem 0' }}>Verification Rate</h4>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
                {stats?.total_transactions > 0 ? Math.round((stats?.verified_transactions || 0) / stats.total_transactions * 100) : 0}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Charts */}
      {recentTransactions.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
          {/* Transaction Types Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📈 Transaction Types</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={getTransactionTypeData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getTransactionTypeData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Volume Chart */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">💰 Transaction Volume</h3>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                <Bar dataKey="amount" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🕒 Recent Transactions</h3>
        </div>
        
        {recentTransactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--gray-500)' }}>
            <p>No transactions found.</p>
            <p>Upload your first transaction to get started!</p>
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
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id}>
                    <td className="hash" title={tx.token_id}>
                      {tx.token_id}
                    </td>
                    <td>
                      <span style={{
                        background: 'var(--gray-100)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td className="amount">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td>
                      <span 
                        className={`status-badge status-${tx.verification_status}`}
                      >
                        {tx.verification_status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {formatDate(tx.created_at)}
                    </td>
                    <td>
                      {tx.blockchain_verified ? (
                        <span style={{ color: 'var(--success-color)' }}>✅</span>
                      ) : (
                        <span style={{ color: 'var(--gray-400)' }}>⏳</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'center',
        marginTop: '2rem'
      }}>
        <button 
          className="btn"
          onClick={onDataUpdate}
        >
          🔄 Refresh Data
        </button>
      </div>
    </div>
  );
};

export default Dashboard;