import React, { useEffect, useState } from 'react';
import { Check, Package } from 'lucide-react';
import './TrackingLoadingScreen.css';

interface TrackingLoadingScreenProps {
  query: string;
}

// Each step ticks off in turn while the lookup runs (App keeps this screen up for at least
// MIN_LOADING_MS, long enough for the whole sequence to play).
const STEPS = [
  'Verifying tracking number',
  'Contacting carrier network',
  'Loading route & milestones',
];
const STEP_MS = 480;

/** Full-screen takeover shown while a tracking / quote search resolves — no header, footer or page behind it. */
export const TrackingLoadingScreen: React.FC<TrackingLoadingScreenProps> = ({ query }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = STEPS.map((_, i) => window.setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)));
    // Nothing behind this screen should scroll while it is up.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      timers.forEach(clearTimeout);
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="dxp-track-loader" role="status" aria-live="polite" aria-busy="true">
      <div className="tl-glow" aria-hidden="true" />
      <div className="tl-grid" aria-hidden="true" />

      <img
        src="/logo-for-footer-or-any-area-having-thesame-color-as-the-footer.png"
        alt="Duolingo Express"
        className="tl-logo"
      />

      <div className="tl-center">
        {/* Animated route: a parcel travelling along an arc between two hubs */}
        <svg className="tl-route" viewBox="0 0 320 120" aria-hidden="true">
          <defs>
            <linearGradient id="tlRouteGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <path id="tlArc" d="M20 100 Q160 -20 300 100" className="tl-arc-base" />
          <path d="M20 100 Q160 -20 300 100" className="tl-arc-live" stroke="url(#tlRouteGrad)" />
          <circle cx="20" cy="100" r="7" className="tl-hub tl-hub-a" />
          <circle cx="300" cy="100" r="7" className="tl-hub tl-hub-b" />
          <circle cx="20" cy="100" r="7" className="tl-hub-ping" />
          <circle cx="300" cy="100" r="7" className="tl-hub-ping tl-hub-ping-b" />
          <g className="tl-mover">
            <circle r="15" className="tl-mover-halo" />
            <circle r="10" className="tl-mover-dot" />
            <animateMotion dur="1.6s" repeatCount="indefinite" rotate="0" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1">
              <mpath href="#tlArc" />
            </animateMotion>
          </g>
        </svg>
        <div className="tl-package-badge" aria-hidden="true">
          <Package size={18} />
        </div>

        <h1 className="tl-title">Locating your shipment</h1>
        {query && <div className="tl-query">{query.toUpperCase()}</div>}

        <ul className="tl-steps">
          {STEPS.map((label, i) => {
            const state = step > i ? 'done' : step === i ? 'active' : 'pending';
            return (
              <li key={label} className={`tl-step ${state}`}>
                <span className="tl-step-mark">
                  {state === 'done' ? <Check size={13} strokeWidth={3} /> : <span className="tl-step-dot" />}
                </span>
                <span>{label}</span>
              </li>
            );
          })}
        </ul>

        <div className="tl-progress" aria-hidden="true">
          <div className="tl-progress-fill" />
        </div>
      </div>

      <p className="tl-foot">Road &amp; air freight · tracked worldwide</p>
    </div>
  );
};
