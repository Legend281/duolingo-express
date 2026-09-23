import React from 'react';
import { PackagePiece } from '../types/shipment';
import { Barcode } from './Barcode';
import './MultiPieceList.css';

interface MultiPieceListProps {
  pieces: PackagePiece[];
  className?: string;
}

export const MultiPieceList: React.FC<MultiPieceListProps> = ({
  pieces,
  className = '',
}) => {
  return (
    <div className={`dxp-pieces-card ${className}`}>
      <div className="dxp-pieces-header">
        <h3 className="dxp-pieces-title">Shipment Pieces</h3>
        <span className="dxp-pieces-count-badge">{pieces.length} PIECES</span>
      </div>

      <div className="dxp-pieces-grid">
        {pieces.map((piece) => (
          <div key={piece.id} className="dxp-piece-item">
            <div className="piece-item-top">
              <div className="piece-meta">
                <span className="piece-label">Piece {String(piece.pieceNumber).padStart(2, '0')}</span>
                <span className="piece-tracking-id">{piece.trackingNumber}</span>
              </div>
              <div className="piece-status-wrap">
                <span className="dxp-badge-in-transit-sm">IN TRANSIT</span>
                <span className="piece-location">
                  {typeof piece.currentLocation === 'string'
                    ? piece.currentLocation
                    : `${(piece.currentLocation as any)?.city || 'In Transit'}, ${(piece.currentLocation as any)?.state || ''}`}
                </span>
              </div>
            </div>

            {/* Piece Barcode */}
            <div className="piece-barcode-wrap">
              <Barcode
                value={piece.trackingNumber}
                height={38}
                width={1.4}
                fontSize={11}
                displayValue={false}
              />
            </div>

            {/* Piece Specs */}
            <div className="piece-specs">
              <span>{piece.weightLbs} lb</span>
              <span className="spec-dot">•</span>
              <span>{piece.dimensions.length} x {piece.dimensions.width} x {piece.dimensions.height} in</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
