import { Shipment, ShipmentStatus, HealthStatus, TrackingEvent, ShipmentDocument } from './shipment';

export type QuoteRequestStatus = 
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'QUOTE_PUBLISHED'
  | 'RATE_PUBLISHED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'CONVERTED';

export interface QuoteRequestPiece {
  id: string; // e.g. Piece 01
  description: string;
  weightLbs: number;
  dimensions: string;
}

export interface QuoteRequestPricing {
  baseShipping: number;
  oversizeHandling: number;
  specialHandling: number;
  finalPrice: number;
  validUntil: string; // e.g. "September 2, 2026"
  publishedAt?: string;
  publishedBy?: string;
}

export interface QuoteRequest {
  id: string; // e.g. QR-2026-00124
  submittedDate: string; // e.g. "Aug 19, 2026"
  status: QuoteRequestStatus;
  
  // Requester / Sender
  requesterName: string; // Randy
  requesterEmail: string;
  requesterPhone: string;
  requesterCompany?: string;
  requesterAddress?: string;

  // Recipient
  recipientName: string; // Daniel
  recipientPhone?: string;
  recipientEmail?: string;
  recipientAddress?: string;

  // Route
  originCity: string; // New York
  originState: string; // NY
  originZip?: string; // 10001
  destCity: string; // Los Angeles
  destState: string; // CA
  destZip?: string; // 90071

  // Cargo
  cargoDescription: string; // Toyota Tacoma Bumper
  cargoType: string; // Automotive part / Parcel
  quantity: number;
  totalWeightLbs: number;
  dimensions: string; // 72 × 24 × 18 in
  pieces?: QuoteRequestPiece[];

  // Service & Requirements
  requestedService: string; // Standard
  specialRequirements?: string; // Handle with care. Do not stack.

  // Internal Admin Area
  internalNotes?: string;
  pricing?: QuoteRequestPricing;
  convertedShipmentId?: string; // Linked shipment e.g. DXP-2026-7K2M9QRX
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminUser: string;
  action: string;
  targetType: 'SHIPMENT' | 'QUOTE' | 'DOCUMENT' | 'SETTINGS';
  targetId: string;
  details: string;
}

export type DocumentType = 'SHIPPING_LABEL' | 'RECEIPT' | 'INVOICE' | 'BOL' | 'INSURANCE';
export type DocumentStatus = 'GENERATED' | 'UPDATED' | 'CANCELLED';

export interface DocumentVersion {
  version: number;
  createdDate: string;
  generatedBy: string;
  notes?: string;
}

export interface AdminDocument {
  id: string; // e.g. LBL-2026-00881, REC-2026-00481, INV-2026-00321, BOL-2026-00184
  docType: DocumentType;
  title: string;
  shipmentTracking: string; // e.g. DXP-2026-7K2M9QRX or DXP-2026-9QRX
  
  // Parties
  senderName: string;
  senderCompany?: string;
  senderAddress?: string;
  senderCity: string;
  senderState: string;
  senderZip?: string;
  senderPhone?: string;
  senderEmail?: string;

  recipientName: string;
  recipientCompany?: string;
  recipientAddress?: string;
  recipientCity: string;
  recipientState: string;
  recipientZip?: string;
  recipientPhone?: string;
  recipientEmail?: string;

  // Cargo Specs
  cargoDescription: string;
  shipmentType: string;
  service: string;
  weightLbs: number;
  pieces: number;
  dimensions?: string;
  declaredValue?: number;

  // Pricing / Financial (for Invoice & Receipt)
  charges?: {
    baseAmount: number;
    oversizeFee?: number;
    specialHandlingFee?: number;
    fuelSurcharge?: number;
    tax?: number;
    totalAmount: number;
    paymentStatus: 'PAID' | 'PENDING';
    paidDate?: string;
    paymentMethod?: string;
  };

  // Bill of Lading Specifics
  bolCarrier?: string;
  bolTrailerNumber?: string;
  bolSealNumber?: string;
  bolSpecialInstructions?: string;

  // Cargo Insurance Certificate Specifics
  insurerName?: string;
  policyNumber?: string;
  coverageType?: string;
  deductible?: number;
  premiumAmount?: number;

  // Metadata & Lifecycle
  createdDate: string;
  status: DocumentStatus;
  version: number;
  versionHistory?: DocumentVersion[];
  fileSize?: string;
}

export interface AdminNotification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'QUOTE' | 'DELAY' | 'EXCEPTION' | 'SYSTEM';
  read: boolean;
  targetId?: string;
}

export interface AdminSettings {
  companyName?: string;
  supportPhone?: string;
  dispatchEmail?: string;
  headquartersAddress?: string;
  dotNumber?: string;
  autoPublishQuotes: boolean;
  defaultFuelSurchargeRate: number; // e.g. 0.085
  piiMaskingEnabled: boolean;
  activeDispatchesCount: number;
  hubSortStatus: { [key: string]: 'NORMAL' | 'HIGH_VOLUME' | 'DELAYED' };
  signatureStampUrl?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  // Public tracking & privacy — mapVisibility/cloakInternalNotes/showEstimatedTime are read
  // server-side by /api/track/:trackingNumber to decide what real customers actually see.
  mapVisibility?: 'CITY' | 'EXACT' | 'HIDDEN';
  cloakInternalNotes?: boolean;
  showEstimatedTime?: boolean;
  // Tariff & pricing defaults
  quoteValidityDays?: number;
  oversizeLengthThreshold?: number;
  // Barcode & document automation
  autoGenLabel?: boolean;
  autoGenReceipt?: boolean;
}
