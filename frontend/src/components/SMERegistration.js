import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import LoadingSpinner from './LoadingSpinner';
import { isValidEthereumAddress, isValidEmail } from '../utils/helpers';

const SMERegistration = ({ account, web3, onRegistrationSuccess }) => {
  const [loading, setLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm({
    defaultValues: {
      wallet_address: account
    }
  });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Validate wallet address matches connected account
      if (data.wallet_address.toLowerCase() !== account.toLowerCase()) {
        toast.error('Wallet address must match connected account');
        return;
      }

      const response = await axios.post('http://localhost:8001/api/sme/register', data);
      
      if (response.data) {
        toast.success('SME registered successfully!');
        onRegistrationSuccess(response.data);
        reset();
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.response?.status === 400) {
        toast.error(error.response.data.detail || 'Registration failed');
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card fade-in">
      <div className="card-header">
        <h2 className="card-title">📝 Register Your SME</h2>
      </div>
      
      <p style={{ marginBottom: '2rem', color: 'var(--gray-600)' }}>
        Register your Small and Medium Enterprise to start creating blockchain-based audit trails 
        for your transactions. All information is securely stored and linked to your wallet address.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="form">
        <div className="form-group">
          <label htmlFor="company_name">Company Name *</label>
          <input
            type="text"
            id="company_name"
            {...register('company_name', {
              required: 'Company name is required',
              minLength: {
                value: 2,
                message: 'Company name must be at least 2 characters long'
              }
            })}
            placeholder="Enter your company name"
          />
          {errors.company_name && (
            <small style={{ color: 'var(--danger-color)' }}>
              {errors.company_name.message}
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="wallet_address">Wallet Address *</label>
          <input
            type="text"
            id="wallet_address"
            {...register('wallet_address', {
              required: 'Wallet address is required',
              validate: (value) => 
                isValidEthereumAddress(value) || 'Invalid Ethereum address format'
            })}
            placeholder="0x..."
            style={{ fontFamily: 'Monaco, monospace', fontSize: '0.875rem' }}
            readOnly
          />
          {errors.wallet_address && (
            <small style={{ color: 'var(--danger-color)' }}>
              {errors.wallet_address.message}
            </small>
          )}
          <small>This is your connected MetaMask wallet address</small>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            {...register('email', {
              required: 'Email address is required',
              validate: (value) => 
                isValidEmail(value) || 'Invalid email address format'
            })}
            placeholder="company@example.com"
          />
          {errors.email && (
            <small style={{ color: 'var(--danger-color)' }}>
              {errors.email.message}
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            {...register('phone')}
            placeholder="+1 (555) 123-4567"
          />
        </div>

        <div className="form-group">
          <label htmlFor="registration_number">Registration Number</label>
          <input
            type="text"
            id="registration_number"
            {...register('registration_number')}
            placeholder="Business registration number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Business Address</label>
          <textarea
            id="address"
            {...register('address')}
            rows="3"
            placeholder="Enter your business address"
          />
        </div>

        <div className="form-group">
          <label htmlFor="subscription_tier">Subscription Tier</label>
          <select
            id="subscription_tier"
            {...register('subscription_tier')}
          >
            <option value="basic">Basic (Free)</option>
            <option value="premium">Premium</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <small>You can upgrade your subscription later</small>
        </div>

        <button 
          type="submit" 
          className="submit-btn"
          disabled={loading}
          style={{ width: '100%', marginTop: '1rem' }}
        >
          {loading ? (
            <>
              <LoadingSpinner size="small" color="white" />
              Registering SME...
            </>
          ) : (
            <>
              🚀 Register SME
            </>
          )}
        </button>
      </form>

      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: 'var(--gray-50)', 
        borderRadius: 'var(--radius-lg)',
        fontSize: '0.875rem',
        color: 'var(--gray-600)'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--gray-700)' }}>
          🔒 Privacy & Security
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          <li>Your data is encrypted and securely stored</li>
          <li>Only you can access your audit trail records</li>
          <li>Your wallet signature verifies your identity</li>
          <li>All transactions are recorded on the blockchain</li>
        </ul>
      </div>
    </div>
  );
};

export default SMERegistration;