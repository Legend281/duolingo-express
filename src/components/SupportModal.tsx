import React, { useState } from 'react';
import { Headphones, X, CheckCircle, Send, AlertCircle } from 'lucide-react';
import './SupportModal.css';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTrackingNumber?: string;
  defaultIssueType?: string;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  initialTrackingNumber = '',
  defaultIssueType = 'General Inquiry',
}) => {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [issueType, setIssueType] = useState(defaultIssueType);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2800);
  };

  return (
    <div className="dxp-support-overlay" onClick={onClose}>
      <div className="dxp-support-card" onClick={(e) => e.stopPropagation()}>
        <div className="dxp-support-header">
          <div className="support-header-left">
            <div className="support-icon-pill">
              <Headphones size={18} />
            </div>
            <div>
              <h3>Get Shipment Support</h3>
              <p>Direct assistance from Duolingo Express operations</p>
            </div>
          </div>
          <button className="support-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div className="dxp-support-success">
            <CheckCircle size={44} className="text-emerald" />
            <h4>Support Request Received</h4>
            <p>
              Your ticket <strong>#DXP-SPT-{Math.floor(10000 + Math.random() * 90000)}</strong> has been opened for tracking number <strong>{trackingNumber || 'General'}</strong>.
            </p>
            <span className="support-timeframe">Our operations specialist will respond within 2 business hours.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="dxp-support-form">
            <div className="form-group">
              <label>Tracking Number (Auto-Associated)</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. DXP-2026-7K2M9QRX"
                className="dxp-input font-mono"
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label>Issue Category</label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="dxp-input"
                >
                  <option value="General Inquiry">General Tracking Inquiry</option>
                  <option value="Delay Inquiry">Delay / ETA Reschedule</option>
                  <option value="Address Correction">Address or Delivery Instructions</option>
                  <option value="Delivery Exception">Delivery Issue / Attempt Failed</option>
                  <option value="Document Request">Missing Documents / Proof of Delivery</option>
                </select>
              </div>

              <div className="form-group">
                <label>Your Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Michael Johnson"
                  className="dxp-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Contact Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="dxp-input"
              />
            </div>

            <div className="form-group">
              <label>Describe the shipment issue</label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe any questions or notes regarding your shipment movement..."
                className="dxp-input"
              />
            </div>

            <div className="support-form-actions">
              <button type="button" className="dxp-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="dxp-btn-primary">
                <Send size={15} /> Submit Support Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
