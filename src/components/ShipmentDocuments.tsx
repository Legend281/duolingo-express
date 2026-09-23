import React, { useState } from 'react';
import { FileText, Download, Eye, Lock, CheckCircle, X, Printer } from 'lucide-react';
import { ShipmentDocument, Shipment } from '../types/shipment';
import { Barcode } from './Barcode';
import './ShipmentDocuments.css';

interface ShipmentDocumentsProps {
  documents: ShipmentDocument[];
  shipment: Shipment;
  className?: string;
}

export const ShipmentDocuments: React.FC<ShipmentDocumentsProps> = ({
  documents,
  shipment,
  className = '',
}) => {
  const [selectedDoc, setSelectedDoc] = useState<ShipmentDocument | null>(null);

  const handleOpenDoc = (doc: ShipmentDocument) => {
    if (doc.status === 'AVAILABLE') {
      setSelectedDoc(doc);
    }
  };

  return (
    <div className={`dxp-docs-section ${className}`}>
      <div className="dxp-docs-header">
        <h3 className="dxp-docs-title">Shipment Documents</h3>
      </div>

      <div className="dxp-docs-grid">
        {documents.map((doc) => {
          const isAvailable = doc.status === 'AVAILABLE';

          return (
            <div
              key={doc.id}
              className={`dxp-doc-card ${isAvailable ? 'available' : 'restricted'}`}
            >
              <div className="doc-card-top">
                <div className="doc-icon-wrap">
                  <FileText size={20} />
                </div>
                <div className="doc-meta">
                  <h4 className="doc-name">{doc.title}</h4>
                  <div className="doc-status-row">
                    {isAvailable ? (
                      <span className="doc-status-available">Available</span>
                    ) : (
                      <span className="doc-status-restricted">Available after delivery</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="doc-card-bottom">
                {isAvailable ? (
                  <button
                    className="doc-action-btn"
                    onClick={() => handleOpenDoc(doc)}
                  >
                    <Eye size={14} />
                    <span>View / Download</span>
                  </button>
                ) : (
                  <span className="doc-action-locked">
                    <Lock size={13} />
                    <span>View</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Document Preview Modal */}
      {selectedDoc && (
        <div className="dxp-modal-overlay" onClick={() => setSelectedDoc(null)}>
          <div className="dxp-modal-paper" onClick={(e) => e.stopPropagation()}>
            <div className="dxp-modal-header">
              <div className="modal-title-wrap">
                <FileText size={20} className="text-blue" />
                <h3>{selectedDoc.title}</h3>
                <span className="modal-version-tag">{selectedDoc.version}</span>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedDoc(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Document Content Simulation */}
            <div className="dxp-modal-body">
              <div className="doc-official-header">
                <div className="doc-brand">
                  <h2>DUOLINGO EXPRESS</h2>
                  <p>Official Logistics Documentation</p>
                </div>
                <div className="doc-barcode-box">
                  <Barcode value={shipment.trackingNumber} height={36} width={1.3} fontSize={10} />
                </div>
              </div>

              <div className="doc-details-table">
                <div className="doc-row">
                  <span className="doc-field">Document:</span>
                  <span className="doc-val">{selectedDoc.title} ({selectedDoc.version})</span>
                </div>
                <div className="doc-row">
                  <span className="doc-field">Tracking Number:</span>
                  <span className="doc-val font-mono">{shipment.trackingNumber}</span>
                </div>
                <div className="doc-row">
                  <span className="doc-field">Issue Date:</span>
                  <span className="doc-val">{selectedDoc.date}</span>
                </div>
                <div className="doc-row">
                  <span className="doc-field">Service Level:</span>
                  <span className="doc-val">{shipment.service} Express</span>
                </div>
                <div className="doc-row">
                  <span className="doc-field">Origin:</span>
                  <span className="doc-val">{shipment.origin.city}, {shipment.origin.state} USA</span>
                </div>
                <div className="doc-row">
                  <span className="doc-field">Destination:</span>
                  <span className="doc-val">{shipment.destination.city}, {shipment.destination.state} USA</span>
                </div>
                <div className="doc-row">
                  <span className="doc-field">Pieces / Weight:</span>
                  <span className="doc-val">{shipment.totalPieces} pcs • {shipment.totalWeightLbs} lbs</span>
                </div>
              </div>

              <div className="doc-official-seal">
                <CheckCircle size={16} />
                <span>Generated by Duolingo Express Core Logistics Engine</span>
              </div>
            </div>

            <div className="dxp-modal-footer">
              <button className="dxp-btn-secondary" onClick={() => window.print()}>
                <Printer size={16} /> Print Document
              </button>
              <button className="dxp-btn-primary" onClick={() => setSelectedDoc(null)}>
                <Download size={16} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
