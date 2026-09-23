import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { syncTimeBasedProgress } from '../progress.js';

export const trackRouter = Router();

// Splits a stored "City, ST" location string into separate fields — the DB only
// stores the combined string, but several frontend views render city/state separately.
function splitLocation(location: string): { city: string; state: string } {
  const parts = (location || '').split(',').map((s: string) => s.trim());
  return { city: parts[0] || '', state: parts[1] || '' };
}

// Tracking events store a single pre-formatted "timestamp" string (e.g.
// "August 20, 2026 · 4:35 PM CT") rather than separate date/time columns. The public
// tracking page renders `displayDate` / `displayTime` directly with no fallback for them,
// so leaving them undefined rendered every event's timestamp as a blank "—" to customers.
function splitEventTimestamp(raw: string): { displayDate: string; displayTime: string; timezone?: string } {
  const str = (raw || '').trim();
  if (!str) return { displayDate: '', displayTime: '' };

  const tzMatch = str.match(/\b(ET|CT|MT|PT|UTC|GMT)\b\s*$/);
  const timezone = tzMatch ? tzMatch[1] : undefined;

  const timeMatch = str.match(/\d{1,2}:\d{2}\s*[AaPp][Mm]/);
  if (timeMatch) {
    const timeIdx = str.indexOf(timeMatch[0]);
    const displayDate = str.slice(0, timeIdx).replace(/[·\-–—]+\s*$/, '').trim() || str;
    const displayTime = str.slice(timeIdx).trim();
    return { displayDate, displayTime, timezone };
  }

  return { displayDate: str, displayTime: '', timezone };
}

// Helper to mask name (e.g. "Daniel" -> "D*****")
function maskName(name: string): string {
  if (!name) return 'Customer';
  const parts = name.split(' ');
  return parts.map(p => p.length > 1 ? `${p[0]}${'*'.repeat(Math.min(p.length - 1, 5))}` : p).join(' ');
}

// Helper to mask phone (e.g. "(310) 555-0892" -> "(310) •••-0892")
function maskPhone(phone: string): string {
  if (!phone) return '•••-•••-••••';
  return phone.replace(/\d{3}-\d{4}$/, '•••-••••').replace(/\d{3}\)/, '•••)');
}

// GET /api/track/:trackingNumber (Public tracking with PII protection)
trackRouter.get('/:trackingNumber', (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    const row = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking) as any;

    if (!row) {
      return res.status(404).json({ success: false, error: `No active shipment found with identifier "${tracking}".` });
    }

    // Advance progress based on real elapsed time before responding, so it moves forward
    // whether or not an admin session is open (persists back to the DB inside this call).
    row.progress_percent = syncTimeBasedProgress(row);

    // Get Settings for PII masking policy
    const settingsRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('general') as any;
    const settings = settingsRow ? JSON.parse(settingsRow.value_json) : { piiMaskingEnabled: true, cloakInternalNotes: true };

    const piecesStmt = db.prepare('SELECT * FROM shipment_pieces WHERE parent_tracking = ? ORDER BY piece_number ASC');
    const pieces = piecesStmt.all(tracking).map((p: any) => ({
      id: p.id,
      trackingNumber: p.tracking_number,
      pieceNumber: p.piece_number,
      totalPieces: p.total_pieces,
      status: p.status,
      statusText: p.status_text,
      currentLocation: p.current_location,
      weightLbs: p.weight_lbs,
      dimensions: JSON.parse(p.dimensions_json || '{}')
    }));

    const eventsStmt = db.prepare('SELECT * FROM tracking_events WHERE shipment_tracking = ? ORDER BY sort_order ASC, timestamp ASC');
    const events = eventsStmt.all(tracking).map((e: any) => ({
      id: e.id,
      status: e.status,
      title: e.title,
      location: e.location,
      ...splitLocation(e.location),
      ...splitEventTimestamp(e.timestamp),
      facility: e.facility,
      timestamp: e.timestamp,
      description: e.description,
      // Cloak internal operator notes if enabled
      operatorNotes: settings.cloakInternalNotes ? undefined : e.operator_notes,
      delayFlag: Boolean(e.delay_flag),
      completed: Boolean(e.completed),
      current: Boolean(e.current_flag)
    }));

    let sender = JSON.parse(row.sender_json || '{}');
    let recipient = JSON.parse(row.recipient_json || '{}');

    // Apply PII masking if enabled
    if (settings.piiMaskingEnabled) {
      sender = {
        name: maskName(sender.name),
        company: sender.company || undefined,
        city: row.origin_city,
        state: row.origin_state,
        phone: maskPhone(sender.phone)
      };
      recipient = {
        name: maskName(recipient.name),
        company: recipient.company || undefined,
        city: row.destination_city,
        state: row.destination_state,
        phone: maskPhone(recipient.phone)
      };
    }

    const publicShipment = {
      trackingNumber: row.tracking_number,
      barcodeCode: row.barcode_code,
      status: row.status,
      statusText: row.status_text,
      progressPercent: row.progress_percent,
      lastUpdated: row.last_updated,
      createdAt: row.created_at,
      createdAtTs: row.created_at_ts || undefined,
      estimatedDelivery: {
        date: row.estimated_delivery_date,
        timeWindow: settings.showEstimatedTime ? row.estimated_delivery_time : 'End of Day'
      },
      service: row.service,
      shipmentType: row.shipment_type,
      cargoDescription: row.cargo_description,
      cargoCategory: row.cargo_category || (row.shipment_type === 'Vehicle' ? 'Automotive & Parts' : 'General Freight'),
      vehicleDetails: row.vehicle_json ? JSON.parse(row.vehicle_json) : undefined,
      petDetails: row.pet_json ? JSON.parse(row.pet_json) : undefined,
      palletDetails: row.pallet_json ? JSON.parse(row.pallet_json) : undefined,
      containerDetails: row.container_json ? JSON.parse(row.container_json) : undefined,
      freightDetails: row.freight_json ? JSON.parse(row.freight_json) : undefined,
      documentDetails: row.document_json ? JSON.parse(row.document_json) : undefined,
      references: row.references_json ? JSON.parse(row.references_json) : undefined,
      photos: row.photos_json ? JSON.parse(row.photos_json) : undefined,
      totalWeightLbs: row.total_weight_lbs,
      totalPieces: row.total_pieces,
      origin: {
        city: row.origin_city,
        state: row.origin_state,
        lat: row.origin_lat,
        lng: row.origin_lng
      },
      destination: {
        city: row.destination_city,
        state: row.destination_state,
        lat: row.destination_lat,
        lng: row.destination_lng
      },
      currentLocation: {
        city: row.current_location_city,
        state: row.current_location_state,
        lat: row.current_location_lat,
        lng: row.current_location_lng,
        facility: row.current_facility
      },
      sender,
      recipient,
      dimensions: JSON.parse(row.dimensions_json || '{}'),
      handlingRequirements: row.handling_requirements_json ? JSON.parse(row.handling_requirements_json) : undefined,
      pieces,
      events,
      timeline: events,
      documents: [
        {
          id: `doc-bol-${row.tracking_number}`,
          title: 'Official Bill of Lading (BOL)',
          type: 'CONFIRMATION',
          status: 'AVAILABLE',
          version: '1.0',
          date: row.created_at || 'Today',
          fileSize: '124 KB'
        },
        {
          id: `doc-lbl-${row.tracking_number}`,
          title: 'Master Shipping Label (Code 128)',
          type: 'SHIPPING_LABEL',
          status: 'AVAILABLE',
          version: '1.0',
          date: row.created_at || 'Today',
          fileSize: '95 KB'
        },
        {
          id: `doc-inv-${row.tracking_number}`,
          title: 'Commercial Freight Invoice',
          type: 'INVOICE',
          status: 'AVAILABLE',
          version: '1.0',
          date: row.created_at || 'Today',
          fileSize: '110 KB'
        },
        {
          id: `doc-pod-${row.tracking_number}`,
          title: 'Official Proof of Delivery (Signed POD)',
          type: 'PROOF_OF_DELIVERY',
          status: row.status === 'DELIVERED' ? 'AVAILABLE' : 'AVAILABLE_AFTER_DELIVERY',
          version: '1.0',
          date: row.status === 'DELIVERED' ? (row.last_updated || 'Delivered') : 'Upon Delivery',
          fileSize: row.status === 'DELIVERED' ? '142 KB' : 'Pending'
        }
      ]
    };

    res.json({ success: true, data: publicShipment });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
