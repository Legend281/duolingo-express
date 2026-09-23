import React from 'react';
import { Truck, Radar } from 'lucide-react';
import './TrackingLoadingScreen.css';

interface TrackingLoadingScreenProps {
  query: string;
}

export const TrackingLoadingScreen: React.FC<TrackingLoadingScreenProps> = ({ query }) => {
  return (
    <section className="dxp-tracking-loading-shell">
      <div className="tracking-loading-card">
        <div className="tracking-loading-radar">
          <div className="tl-radar-ring tl-ring-1" />
          <div className="tl-radar-ring tl-ring-2" />
          <div className="tl-radar-icon-badge">
            <Truck size={26} />
          </div>
        </div>

        <h2 className="tracking-loading-title">Locating Your Shipment</h2>
        <p className="tracking-loading-sub">
          Querying live carrier network for
          {query ? <span className="tl-query-code font-mono"> {query}</span> : ' your consignment'}
          …
        </p>

        <div className="tracking-loading-bar-track">
          <div className="tracking-loading-bar-fill" />
        </div>

        <div className="tracking-loading-steps">
          <span className="tl-step active">
            <Radar size={12} />
            Verifying tracking ID
          </span>
        </div>
      </div>
    </section>
  );
};
