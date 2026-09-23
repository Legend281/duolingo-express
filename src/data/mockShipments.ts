import { Shipment } from '../types/shipment';

export const PRIMARY_SHIPMENT: Shipment = {
  trackingNumber: 'DXP-2026-7K2M9QRX',
  status: 'IN_TRANSIT',
  statusText: 'IN TRANSIT',
  statusMessage: 'Your shipment has arrived at our Chicago location and is continuing toward its destination.',
  // This mock record is only ever shown as a placeholder for the instant before the real
  // backend fetch resolves. Without a progressPercent here, the tracking page had nothing
  // to display but a wall-clock estimate that pins near 94% — giving every fresh page load
  // a jarring flash of "94%" that then snaps down to the real value a moment later.
  progressPercent: 60,
  health: 'ON_TRACK',
  healthExplanation: 'Your shipment is progressing normally on the interstate linehaul corridor.',
  shipmentType: 'Parcel',
  cargoDescription: 'Toyota Tacoma Bumper',
  cargoCategory: 'Automotive & Parts',
  service: 'Express',
  shipmentDate: 'August 19, 2026',
  estimatedDelivery: 'Wednesday, August 22',
  estimatedDeliveryDetail: 'by end of day',
  currentLocation: 'Chicago, IL',
  currentFacility: 'Chicago Regional Sort Facility',
  lastUpdated: 'Aug 20, 2026 · 4:35 PM CT',
  nextStep: 'Linehaul dispatch to Los Angeles Hub',
  nextStepLocation: 'Los Angeles, CA',
  
  origin: {
    city: 'New York',
    state: 'NY',
    country: 'USA',
  },
  destination: {
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
  },

  sender: {
    name: 'Randy',
    company: 'Apex Auto Design & Fabrication',
    addressLine: '123 Main Street, Suite 400',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    phone: '+1 (212) 555-0198',
    maskedPhone: '+1 (212) 555-0198',
    email: 'randy@apexautodesign.com',
  },
  recipient: {
    name: 'Daniel',
    company: 'West Coast Offroad Outfitters',
    addressLine: '456 Sunset Boulevard',
    city: 'Los Angeles',
    state: 'CA',
    postalCode: '90028',
    country: 'USA',
    phone: '+1 (310) 555-0144',
    maskedPhone: '+1 (310) 555-0144',
    email: 'daniel@wcoffroad.com',
    instructions: 'Direct signature required upon delivery.',
  },

  totalWeightLbs: 45.0,
  totalPieces: 1,
  dimensions: {
    length: 72,
    width: 24,
    height: 18,
  },

  references: {
    customerReference: 'PO-45821',
    orderNumber: 'ORD-84921',
    invoiceNumber: 'INV-2026-892',
  },

  routeCheckpoints: [
    {
      id: 'origin',
      name: 'New York',
      state: 'NY',
      type: 'origin',
      statusLabel: 'Origin',
      dateLabel: 'Aug 19, 9:15 AM ET',
      lat: 40.7128,
      lng: -74.0060,
      svgCoords: { x: 745, y: 155 },
    },
    {
      id: 'cp-chicago',
      name: 'Chicago',
      state: 'IL',
      type: 'current',
      statusLabel: 'Current Location',
      dateLabel: 'Aug 20, 4:35 PM CT',
      lat: 41.8781,
      lng: -87.6298,
      svgCoords: { x: 575, y: 160 },
    },
    {
      id: 'destination',
      name: 'Los Angeles',
      state: 'CA',
      type: 'destination',
      statusLabel: 'Destination',
      dateLabel: 'Est. Aug 22',
      lat: 34.0522,
      lng: -118.2437,
      svgCoords: { x: 130, y: 260 },
    },
  ],

  passportStages: [
    {
      id: 'created',
      label: 'Shipment Created',
      sublabel: 'Aug 19',
      status: 'completed',
    },
    {
      id: 'in-transit',
      label: 'In Transit',
      sublabel: 'Aug 20',
      status: 'completed',
    },
    {
      id: 'current',
      label: 'Arrived Chicago',
      sublabel: 'Chicago, IL',
      status: 'current',
    },
    {
      id: 'next',
      label: 'Los Angeles Hub',
      sublabel: 'Los Angeles, CA',
      status: 'upcoming',
    },
    {
      id: 'delivery',
      label: 'Final Delivery',
      sublabel: 'Pending Signature',
      status: 'upcoming',
    },
  ],

  pieces: [
    {
      id: 'p1',
      pieceNumber: 1,
      totalPieces: 1,
      trackingNumber: 'DXP-2026-7K2M9QRX-01',
      status: 'IN_TRANSIT',
      statusText: 'IN TRANSIT',
      currentLocation: 'Chicago, IL',
      weightLbs: 45.0,
      dimensions: {
        length: 72,
        width: 24,
        height: 18,
      },
    },
  ],

  timeline: [
    {
      id: 'ev-5',
      timestamp: '2026-08-20T21:35:00Z',
      timezone: 'CT',
      displayDate: 'August 20, 2026',
      displayTime: '4:35 PM CT',
      title: 'Arrived at Facility',
      eventStatus: 'ARRIVED',
      facility: 'Chicago Regional Sort Facility',
      city: 'Chicago',
      state: 'IL',
      description: 'Your shipment has arrived at our Chicago location and is continuing toward its destination.',
      internalNote: 'Shipment arrived after scheduled departure. Processing for next available movement.',
      recordedBy: 'Super Admin',
      operatorId: 'Super Admin',
      isCurrent: true,
      isCompleted: true,
    },
    {
      id: 'ev-4',
      timestamp: '2026-08-20T12:15:00Z',
      timezone: 'ET',
      displayDate: 'August 20, 2026',
      displayTime: '8:15 AM ET',
      title: 'Departed Facility',
      eventStatus: 'DEPARTED',
      facility: 'New York Outbound Gateway',
      city: 'New York',
      state: 'NY',
      description: 'Shipment departed our New York location.',
      internalNote: 'Loaded onto priority linehaul container LH-NYC-ORD-92.',
      recordedBy: 'Super Admin',
      operatorId: 'Super Admin',
      isCompleted: true,
    },
    {
      id: 'ev-3',
      timestamp: '2026-08-19T18:10:00Z',
      timezone: 'ET',
      displayDate: 'August 19, 2026',
      displayTime: '2:10 PM ET',
      title: 'Processing at Facility',
      eventStatus: 'PROCESSING',
      facility: 'New York Gateway Sort Center',
      city: 'New York',
      state: 'NY',
      description: 'Shipment processed and prepared for linehaul departure.',
      internalNote: 'Oversized bumper dimension verification complete (72x24x18 in).',
      recordedBy: 'Super Admin',
      operatorId: 'Super Admin',
      isCompleted: true,
    },
    {
      id: 'ev-2',
      timestamp: '2026-08-19T15:42:00Z',
      timezone: 'ET',
      displayDate: 'August 19, 2026',
      displayTime: '11:42 AM ET',
      title: 'Shipment Received',
      eventStatus: 'RECEIVED',
      facility: 'Manhattan Origin Terminal',
      city: 'New York',
      state: 'NY',
      description: 'Shipment received into the Duolingo Express network.',
      internalNote: 'Received from sender Randy. Factory packaging intact.',
      recordedBy: 'Super Admin',
      operatorId: 'Super Admin',
      isCompleted: true,
    },
    {
      id: 'ev-1',
      timestamp: '2026-08-19T13:15:00Z',
      timezone: 'ET',
      displayDate: 'August 19, 2026',
      displayTime: '9:15 AM ET',
      title: 'Shipment Created',
      eventStatus: 'SHIPMENT_CREATED',
      facility: 'New York Gateway Facility',
      city: 'New York',
      state: 'NY',
      description: 'Shipment waybill registered and physical barcode generated.',
      internalNote: 'Consignment created by Super Admin.',
      recordedBy: 'Super Admin',
      operatorId: 'Super Admin',
      isCompleted: true,
    },
  ],

  documents: [
    {
      id: 'doc-1',
      title: 'Shipping Receipt',
      type: 'RECEIPT',
      status: 'AVAILABLE',
      version: 'v1.0',
      date: 'Aug 15, 2026',
      fileSize: '142 KB',
    },
    {
      id: 'doc-2',
      title: 'Shipping Label',
      type: 'SHIPPING_LABEL',
      status: 'AVAILABLE',
      version: 'v1.0',
      date: 'Aug 15, 2026',
      fileSize: '88 KB',
    },
    {
      id: 'doc-3',
      title: 'Invoice',
      type: 'INVOICE',
      status: 'AVAILABLE',
      version: 'v1.0',
      date: 'Aug 15, 2026',
      fileSize: '210 KB',
    },
    {
      id: 'doc-4',
      title: 'Proof of Delivery',
      type: 'PROOF_OF_DELIVERY',
      status: 'AVAILABLE_AFTER_DELIVERY',
      version: 'v1.0',
      date: 'Pending Delivery',
    },
    {
      id: 'doc-5',
      title: 'Shipment Confirmation',
      type: 'CONFIRMATION',
      status: 'AVAILABLE',
      version: 'v1.0',
      date: 'Aug 15, 2026',
      fileSize: '115 KB',
    },
  ],
};

export const MOCK_SHIPMENTS: Record<string, Shipment> = {
  'DXP-2026-7K2M9QRX': PRIMARY_SHIPMENT,
  'DXP-7K2M9QRX': PRIMARY_SHIPMENT, // short alias
  'DXP-2026-7KZM9QRX': PRIMARY_SHIPMENT, // mockup variant alias
  'DXP-7KZM9QRX': PRIMARY_SHIPMENT,
  'DXP-8M4P2LQA': {
    ...PRIMARY_SHIPMENT,
    trackingNumber: 'DXP-2026-8M4P2LQA',
    status: 'DELIVERED',
    statusText: 'DELIVERED',
    statusMessage: 'Shipment was delivered successfully in San Francisco, CA on August 14, 2026.',
    health: 'ON_TRACK',
    healthExplanation: 'Delivered on schedule with signature on file.',
    origin: {
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      lat: 42.3601,
      lng: -71.0589,
      facility: 'New England Metro Hub'
    } as any,
    destination: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      lat: 37.7749,
      lng: -122.4194,
      facility: 'Bay Area Intermodal Hub'
    } as any,
    currentLocation: 'San Francisco, CA',
    currentFacility: 'Delivered to Front Desk',
    lastUpdated: 'August 14, 2026 · 2:15 PM PT',
    nextStep: 'Completed',
    nextStepLocation: 'Archived',
    proofOfDelivery: {
      deliveredAt: 'August 14, 2026 · 2:15 PM PT',
      signedBy: 'M. Johnson',
      deliveryNotes: 'Received at front lobby desk.',
    },
  },
  'DXP-3J7N6KRB': {
    ...PRIMARY_SHIPMENT,
    trackingNumber: 'DXP-2026-3J7N6KRB',
    status: 'DELAYED',
    statusText: 'DELAYED',
    statusMessage: 'Shipment experienced a weather-related transportation delay in Dallas, TX.',
    health: 'POTENTIAL_DELAY',
    healthExplanation: 'Severe weather advisory. Revised ETA in effect.',
    origin: {
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      lat: 41.8781,
      lng: -87.6298,
      facility: 'Chicago Regional Sort Facility'
    } as any,
    destination: {
      city: 'Dallas',
      state: 'TX',
      country: 'USA',
      lat: 32.7767,
      lng: -96.7970,
      facility: 'Dallas Freight Intermodal Hub'
    } as any,
    currentLocation: 'Dallas, TX',
    currentFacility: 'Dallas Gateway Hub',
    lastUpdated: 'August 17, 2026 · 11:30 AM CT',
    estimatedDelivery: 'Thursday, August 20',
    exception: {
      type: 'WEATHER_DELAY',
      title: 'Severe Weather Delay',
      description: 'Severe weather conditions in the Dallas metropolitan area delayed linehaul transport. Shipment is secure and rescheduled for next departure window.',
      actionRequired: false,
      date: 'August 17, 2026',
    },
  },
  'DXP-2026-5P6T2LNM': {
    ...PRIMARY_SHIPMENT,
    trackingNumber: 'DXP-2026-5P6T2LNM',
    status: 'AT_FACILITY',
    statusText: 'AT FACILITY',
    statusMessage: 'Shipment processed and staged at Denver Regional Gateway Hub.',
    health: 'ON_TRACK',
    healthExplanation: 'Staged for scheduled linehaul departure toward Rocky Mountain corridor.',
    origin: {
      city: 'Atlanta',
      state: 'GA',
      country: 'USA',
      lat: 33.7490,
      lng: -84.3880,
      facility: 'Atlanta Gateway Center'
    } as any,
    destination: {
      city: 'Denver',
      state: 'CO',
      country: 'USA',
      lat: 39.7392,
      lng: -104.9903,
      facility: 'Rocky Mountain Gateway'
    } as any,
    currentLocation: 'Denver, CO',
    currentFacility: 'Denver Regional Gateway',
    lastUpdated: 'Aug 20, 2026 · 8:15 AM MT',
  },
  'DXP-2026-U2JMH7WU': {
    ...PRIMARY_SHIPMENT,
    trackingNumber: 'DXP-2026-U2JMH7WU',
    status: 'IN_TRANSIT',
    statusText: 'IN LINEHAUL TRANSIT',
    statusMessage: 'Vehicle in active linehaul transit along verified interstate corridor.',
    health: 'ON_TRACK',
    progressPercent: 38,
    origin: {
      city: 'Miami',
      state: 'FL',
      country: 'USA',
      lat: 25.7617,
      lng: -80.1918,
      facility: 'South Florida Air/Sea Hub'
    } as any,
    destination: {
      city: 'Seattle',
      state: 'WA',
      country: 'USA',
      lat: 47.6062,
      lng: -122.3321,
      facility: 'Puget Sound Gateway'
    } as any,
    currentLocation: 'Nashville, TN',
    currentFacility: 'Music City Linehaul Center',
    lastUpdated: 'Just now',
  },
};

export function getShipmentByTrackingNumber(trackingNumber: string): Shipment | null {
  const clean = trackingNumber.trim().toUpperCase();
  if (MOCK_SHIPMENTS[clean]) {
    return MOCK_SHIPMENTS[clean];
  }
  // If user searched a variation like 7K2M9QRX without prefix
  for (const key of Object.keys(MOCK_SHIPMENTS)) {
    if (key.includes(clean) || clean.includes(key)) {
      return MOCK_SHIPMENTS[key];
    }
  }
  return null;
}
