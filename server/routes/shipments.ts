import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import { syncTimeBasedProgress } from '../progress.js';
import { requireAdminAuth } from '../middleware/auth.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

export const shipmentsRouter = Router();

// Splits a stored "City, ST" location string into separate fields — the DB only
// stores the combined string, but several frontend views render city/state separately.
function splitLocation(location: string): { city: string; state: string } {
  const parts = (location || '').split(',').map((s: string) => s.trim());
  return { city: parts[0] || '', state: parts[1] || '' };
}

// Tracking events store a single pre-formatted "timestamp" string (e.g.
// "August 20, 2026 · 4:35 PM CT" or "Aug 19, 2026 4:35 PM") rather than separate date/time
// columns. The frontend timeline renders `displayDate` / `displayTime` directly and has no
// fallback for them — leaving them undefined rendered every persisted event's timestamp as a
// blank "—". This splits the stored string back into those fields instead.
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

// Helper to format shipment row from DB to JSON model
function formatShipment(row: any) {
  if (!row) return null;

  // Advance progress based on real elapsed time before formatting, so it moves forward
  // whether or not an admin session is open (persists back to the DB inside this call).
  row.progress_percent = syncTimeBasedProgress(row);

  const piecesStmt = db.prepare('SELECT * FROM shipment_pieces WHERE parent_tracking = ? ORDER BY piece_number ASC');
  const pieces = piecesStmt.all(row.tracking_number).map((p: any) => ({
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
  const events = eventsStmt.all(row.tracking_number).map((e: any) => ({
    id: e.id,
    status: e.status,
    eventStatus: e.status,
    title: e.title,
    location: e.location,
    ...splitLocation(e.location),
    ...splitEventTimestamp(e.timestamp),
    facility: e.facility,
    timestamp: e.timestamp,
    description: e.description,
    operatorNotes: e.operator_notes,
    internalNote: e.operator_notes || undefined,
    recordedBy: e.recorded_by || undefined,
    correctionAudit: e.correction_audit_json ? JSON.parse(e.correction_audit_json) : undefined,
    delayFlag: Boolean(e.delay_flag),
    completed: Boolean(e.completed),
    current: Boolean(e.current_flag)
  }));

  return {
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
      timeWindow: row.estimated_delivery_time
    },
    service: row.service,
    shipmentType: row.shipment_type,
    cargoDescription: row.cargo_description,
    totalWeightLbs: row.total_weight_lbs,
    totalPieces: row.total_pieces,
    declaredValue: row.declared_value,
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
    sender: JSON.parse(row.sender_json || '{}'),
    recipient: JSON.parse(row.recipient_json || '{}'),
    dimensions: JSON.parse(row.dimensions_json || '{}'),
    vehicleDetails: row.vehicle_json ? JSON.parse(row.vehicle_json) : undefined,
    petDetails: row.pet_json ? JSON.parse(row.pet_json) : undefined,
    palletDetails: row.pallet_json ? JSON.parse(row.pallet_json) : undefined,
    containerDetails: row.container_json ? JSON.parse(row.container_json) : undefined,
    freightDetails: row.freight_json ? JSON.parse(row.freight_json) : undefined,
    documentDetails: row.document_json ? JSON.parse(row.document_json) : undefined,
    references: row.references_json ? JSON.parse(row.references_json) : undefined,
    cargoCategory: row.cargo_category || (row.shipment_type === 'Vehicle' ? 'Automotive & Parts' : 'General Freight'),
    photos: row.photos_json ? JSON.parse(row.photos_json) : undefined,
    handlingRequirements: row.handling_requirements_json ? JSON.parse(row.handling_requirements_json) : undefined,
    pickupWindow: row.pickup_window || undefined,
    internalPricingNote: row.internal_pricing_note || undefined,
    pieces,
    events
  };
}

// GET /api/shipments (All consignments with optional search & filter) — admin only, unmasked
shipmentsRouter.get('/', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const { search, status } = req.query;
    let query = 'SELECT * FROM shipments';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status && status !== 'ALL') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      const term = `%${String(search).toLowerCase().trim()}%`;
      conditions.push(`(
        LOWER(tracking_number) LIKE ? OR
        LOWER(cargo_description) LIKE ? OR
        LOWER(origin_city) LIKE ? OR
        LOWER(destination_city) LIKE ?
      )`);
      params.push(term, term, term, term);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at_ts DESC';

    const rows = db.prepare(query).all(...params);
    const shipments = rows.map(formatShipment);
    res.json({ success: true, count: shipments.length, data: shipments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/shipments/:trackingNumber — admin only, unmasked (public lookups use /api/track/:id)
shipmentsRouter.get('/:trackingNumber', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    let row = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking) as any;

    if (!row && (tracking.includes('7KZM9QRX') || tracking.includes('7K2M9QRX') || tracking === 'DXP-SAMPLE')) {
      row = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get('DXP-2026-7K2M9QRX') as any;
    }

    if (!row) {
      return res.status(404).json({ success: false, error: `Shipment ${tracking} not found` });
    }

    res.json({ success: true, data: formatShipment(row) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/shipments (Create new consignment) — deliberately NOT gated: this is the same
// endpoint the public booking flow (ShipPage.tsx -> api.submitPublicShipment) posts to, not
// just the admin's CreateShipmentView. Rate-limited instead, since nothing else stops this
// being scripted/spammed without a session requirement to fall back on.
shipmentsRouter.post('/', publicWriteLimiter, (req: Request, res: Response) => {
  try {
    const s = req.body;
    let trackingNumber = s.trackingNumber;
    if (trackingNumber) {
      // The client (CreateShipmentView) generates its own tracking number up front and
      // shows it to the admin before this request is even sent — if it happens to collide
      // with an existing one (vanishingly rare, but possible), fail with a clean, specific
      // error instead of letting a raw SQLite UNIQUE constraint violation surface as an
      // opaque 500.
      const collision = db.prepare('SELECT 1 FROM shipments WHERE tracking_number = ?').get(trackingNumber);
      if (collision) {
        return res.status(409).json({ success: false, error: `Tracking number ${trackingNumber} is already in use. Please retry — a new number will be generated.` });
      }
    } else {
      trackingNumber = `DXP-2026-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    }
    const barcodeCode = `*${trackingNumber}*`;
    const createdAt = s.createdAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const lastUpdated = 'Just now';

    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        tracking_number, barcode_code, status, status_text, progress_percent,
        last_updated, created_at, estimated_delivery_date, estimated_delivery_time,
        service, shipment_type, cargo_description, total_weight_lbs, total_pieces,
        declared_value, origin_city, origin_state, origin_lat, origin_lng,
        destination_city, destination_state, destination_lat, destination_lng,
        current_location_city, current_location_state, current_location_lat, current_location_lng,
        current_facility, sender_json, recipient_json, dimensions_json,
        vehicle_json, pet_json, pallet_json, container_json, freight_json, document_json,
        references_json, cargo_category, photos_json,
        handling_requirements_json, pickup_window, internal_pricing_note,
        progress_updated_at_ts, created_at_ts
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    insertShipment.run(
      trackingNumber,
      barcodeCode,
      s.status || 'RECEIVED',
      s.statusText || 'Consignment Registered',
      s.progressPercent || 15,
      lastUpdated,
      createdAt,
      s.estimatedDelivery?.date || s.estimatedDelivery || 'August 24, 2026',
      s.estimatedDelivery?.timeWindow || s.estimatedDeliveryDetail || 'by 5:00 PM',
      s.service || 'Standard',
      s.shipmentType || 'Parcel',
      s.cargoDescription || 'Consignment Cargo',
      s.totalWeightLbs || 10,
      s.totalPieces || 1,
      s.declaredValue || 0,
      s.origin?.city || 'New York',
      s.origin?.state || 'NY',
      s.origin?.lat || 40.7128,
      s.origin?.lng || -74.006,
      s.destination?.city || 'Los Angeles',
      s.destination?.state || 'CA',
      s.destination?.lat || 34.0522,
      s.destination?.lng || -118.2437,
      s.currentLocation?.city || s.origin?.city || 'New York',
      s.currentLocation?.state || s.origin?.state || 'NY',
      s.currentLocation?.lat || s.origin?.lat || 40.7128,
      s.currentLocation?.lng || s.origin?.lng || -74.006,
      s.currentFacility || s.currentLocation?.facility || 'Intake Terminal',
      JSON.stringify(s.sender || {}),
      JSON.stringify(s.recipient || {}),
      JSON.stringify(s.dimensions || { length: 12, width: 12, height: 12 }),
      s.vehicleDetails ? JSON.stringify(s.vehicleDetails) : null,
      s.petDetails ? JSON.stringify(s.petDetails) : null,
      s.palletDetails ? JSON.stringify(s.palletDetails) : null,
      s.containerDetails ? JSON.stringify(s.containerDetails) : null,
      s.freightDetails ? JSON.stringify(s.freightDetails) : null,
      s.documentDetails ? JSON.stringify(s.documentDetails) : null,
      s.references ? JSON.stringify(s.references) : null,
      s.cargoCategory || (s.shipmentType === 'Vehicle' ? 'Automotive & Parts' : 'General Freight'),
      s.photos || s.vehicleDetails?.photos ? JSON.stringify(s.photos || s.vehicleDetails?.photos) : null,
      s.handlingRequirements ? JSON.stringify(s.handlingRequirements) : null,
      s.pickupWindow || null,
      s.internalPricingNote || null,
      Date.now(),
      // created_at_ts: always server-authoritative (never trust a client-supplied value —
      // that's exactly how "Today" as a literal string ended up in the display column and
      // broke sorting) so newest-first ordering is always reliably correct.
      Date.now()
    );

    // Insert Pieces
    const insertPiece = db.prepare(`
      INSERT INTO shipment_pieces (
        id, tracking_number, parent_tracking, piece_number, total_pieces,
        status, status_text, current_location, weight_lbs, dimensions_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const pieces = (s.pieces && s.pieces.length > 0) ? s.pieces : [
      {
        id: '01',
        trackingNumber: `${trackingNumber}-01`,
        pieceNumber: 1,
        totalPieces: 1,
        status: s.status || 'RECEIVED',
        statusText: 'Consignment Staged',
        currentLocation: `${s.origin?.city || 'New York'}, ${s.origin?.state || 'NY'}`,
        weightLbs: s.totalWeightLbs || 10,
        dimensions: s.dimensions || { length: 12, width: 12, height: 12 }
      }
    ];

    for (const p of pieces) {
      const pieceNum = p.pieceNumber || 1;
      const pieceId = `${trackingNumber}-P${pieceNum}`;
      insertPiece.run(
        pieceId,
        p.trackingNumber || `${trackingNumber}-${String(pieceNum).padStart(2, '0')}`,
        trackingNumber,
        pieceNum,
        p.totalPieces || pieces.length,
        p.status || s.status || 'RECEIVED',
        p.statusText || 'Scanned & Registered',
        p.currentLocation || `${s.origin?.city || 'New York'}, ${s.origin?.state || 'NY'}`,
        p.weightLbs || (s.totalWeightLbs ? s.totalWeightLbs / pieces.length : 10),
        JSON.stringify(p.dimensions || s.dimensions || {})
      );
    }

    // Insert Initial Event
    const insertEvent = db.prepare(`
      INSERT INTO tracking_events (
        id, shipment_tracking, status, title, location, facility,
        timestamp, description, operator_notes, delay_flag, completed, current_flag, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      `e-${Date.now()}`,
      trackingNumber,
      s.status || 'RECEIVED',
      'Consignment Registered & Barcode Issued',
      `${s.origin?.city || 'New York'}, ${s.origin?.state || 'NY'}`,
      s.currentLocation?.facility || 'Intake Gateway',
      `${createdAt} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      'Shipment received into the Duolingo Express national sort network. Linear Code 128 barcode assigned.',
      'Initial entry scan.',
      0, 1, 1, 1
    );

    const createdRow = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(trackingNumber);
    res.status(201).json({ success: true, data: formatShipment(createdRow) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/shipments/:trackingNumber/status (Quick update)
shipmentsRouter.patch('/:trackingNumber/status', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    const newStatus = req.body.newStatus || req.body.status;
    const { location, facility, notes, progressPercent, statusText: statusTextOverride, lat, lng, eventTitle, skipEventCreation } = req.body;

    const row = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    if (!row) {
      return res.status(404).json({ success: false, error: `Shipment ${tracking} not found` });
    }

    // Default progress/statusText per status, used only when the caller doesn't already
    // know a better value. The Operations Control modal computes a richer statusText
    // (with hold/delay reason, hub name, etc.) and its own progress via planningEngine.ts —
    // when it sends those, honor them instead of clobbering them with these generic defaults.
    let progress = 15;
    let statusText = 'Consignment Registered';
    if (newStatus === 'PROCESSED') { progress = 35; statusText = 'Processed at Sorting Gateway'; }
    else if (newStatus === 'IN_TRANSIT') { progress = 60; statusText = 'In Transit — Linehaul Route'; }
    else if (newStatus === 'AT_FACILITY') { progress = 65; statusText = 'At Facility'; }
    else if (newStatus === 'OUT_FOR_DELIVERY') { progress = 85; statusText = 'Out for Final Delivery'; }
    else if (newStatus === 'DELIVERED') { progress = 100; statusText = 'Delivered & Signed'; }
    else if (newStatus === 'ON_HOLD') { statusText = 'On Hold'; progress = (row as any).progress_percent; }
    else if (newStatus === 'DELAYED') { statusText = 'Transit Delayed'; progress = (row as any).progress_percent; }
    else if (newStatus === 'EXCEPTION') { progress = 50; statusText = 'Transit Exception / Delay'; }
    else if (newStatus === 'DEPARTED_FACILITY') { progress = 45; statusText = 'Departed Facility'; }
    else if (newStatus === 'CREATED') { progress = 5; statusText = 'Shipment Created'; }

    if (typeof progressPercent === 'number' && !isNaN(progressPercent)) {
      progress = Math.max(0, Math.min(100, progressPercent));
    }
    if (typeof statusTextOverride === 'string' && statusTextOverride.trim()) {
      statusText = statusTextOverride.trim();
    }

    // Parse location
    const [city, state] = (location || 'Transit Hub').split(',').map((s: string) => s.trim());

    // Update shipment. progress_updated_at_ts resets to now so the real-time auto-advance
    // (syncTimeBasedProgress) restarts its clock from this admin-set value instead of
    // compounding on top of whatever stale timestamp was last recorded.
    //
    // current_location_lat/lng previously had NO update path at all outside of shipment
    // creation — every status change since then only touched the city/state TEXT columns,
    // so "current location" coordinates silently froze at whatever they were on day one
    // while the city/state label kept changing. That's how a shipment marked "At Facility:
    // Denver, CO" ended up still carrying its origin's exact coordinates, and the tracking
    // map (which does its own separate percentage-based placement) compounded the problem.
    // Only overwrite them when the caller actually supplies real numbers, so a plain
    // city/state-only update (e.g. from Tracking Events, which doesn't resolve coordinates
    // yet — see Phase 2) doesn't blow away a previously-correct pair with NULL.
    const hasCoords = typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
    db.prepare(`
      UPDATE shipments SET
        status = ?,
        status_text = ?,
        progress_percent = ?,
        last_updated = 'Just now',
        current_location_city = COALESCE(?, current_location_city),
        current_location_state = COALESCE(?, current_location_state),
        current_location_lat = COALESCE(?, current_location_lat),
        current_location_lng = COALESCE(?, current_location_lng),
        current_facility = COALESCE(?, current_facility),
        progress_updated_at_ts = ?
      WHERE tracking_number = ?
    `).run(
      newStatus, statusText, progress,
      city || null, state || null,
      hasCoords ? lat : null, hasCoords ? lng : null,
      facility || null, Date.now(), tracking
    );

    // Some callers (e.g. Tracking Events' "Record Event" form) already persisted a real,
    // specific event for this exact action via a separate POST /events call before hitting
    // this route just to sync status/progress/location — inserting another one here made
    // every such action create two near-identical rows. skipEventCreation lets that caller
    // opt out of a second insert entirely.
    if (!skipEventCreation) {
      // Clear old current_flag in events
      db.prepare('UPDATE tracking_events SET current_flag = 0 WHERE shipment_tracking = ?').run(tracking);

      // Count existing events for sort_order
      const eventCount = (db.prepare('SELECT COUNT(*) as count FROM tracking_events WHERE shipment_tracking = ?').get(tracking) as any).count;

      // Add new event — eventTitle carries a specific, action-built description (e.g.
      // Operations Control's "Physical checkpoint scan confirmed at Rocky Mountain Gateway")
      // when the caller has one; otherwise falls back to the generic status label exactly as
      // before, so callers that never had a richer title (like Tracking Events, which always
      // skips this block) are unaffected.
      db.prepare(`
        INSERT INTO tracking_events (
          id, shipment_tracking, status, title, location, facility,
          timestamp, description, operator_notes, delay_flag, completed, current_flag, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `e-${Date.now()}`,
        tracking,
        newStatus,
        eventTitle || statusText,
        location || 'Regional Transit Gateway',
        facility || 'Duolingo Express Facility',
        `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        notes || `Status transitioned to ${newStatus}.`,
        notes || null,
        newStatus === 'EXCEPTION' ? 1 : 0,
        1, 1, eventCount + 1
      );
    }

    const updatedRow = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    res.json({ success: true, data: formatShipment(updatedRow) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/shipments/:trackingNumber/events (Add tracking event)
shipmentsRouter.post('/:trackingNumber/events', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    const e = req.body;

    const row = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    if (!row) {
      return res.status(404).json({ success: false, error: `Shipment ${tracking} not found` });
    }

    db.prepare('UPDATE tracking_events SET current_flag = 0 WHERE shipment_tracking = ?').run(tracking);

    const eventCount = (db.prepare('SELECT COUNT(*) as count FROM tracking_events WHERE shipment_tracking = ?').get(tracking) as any).count;

    // Prefer the caller's own displayDate/displayTime (e.g. TrackingEventsView's Add Event
    // form, which lets the admin pick an exact date/time) recombined into the single stored
    // display string, over a raw e.timestamp — which is sometimes an ISO string that would
    // otherwise get stored verbatim and fail to split back into a readable date/time on read.
    const storedTimestamp = (e.displayDate && e.displayTime)
      ? `${e.displayDate} · ${e.displayTime}`
      : (e.timestamp && !/^\d{4}-\d{2}-\d{2}T/.test(e.timestamp)
          ? e.timestamp
          : `${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`);

    const eventLocation = e.location || (e.city && e.state ? `${e.city}, ${e.state}` : (e.city || 'Sorting Facility'));

    db.prepare(`
      INSERT INTO tracking_events (
        id, shipment_tracking, status, title, location, facility,
        timestamp, description, operator_notes, delay_flag, completed, current_flag, sort_order,
        recorded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      e.id || `e-${Date.now()}`,
      tracking,
      e.status || e.eventStatus || 'IN_TRANSIT',
      e.title || 'Checkpoint Scan Verified',
      eventLocation,
      e.facility || 'Gateway Hub',
      storedTimestamp,
      e.description || 'Barcode scanned and verified.',
      e.internalNote || e.operatorNotes || null,
      e.delayFlag ? 1 : 0,
      1, 1, eventCount + 1,
      e.recordedBy || null
    );

    // Also update shipment status if provided
    if (e.status) {
      db.prepare(`
        UPDATE shipments SET
          status = ?,
          status_text = ?,
          last_updated = 'Just now',
          current_facility = COALESCE(?, current_facility)
        WHERE tracking_number = ?
      `).run(e.status, e.title || e.status, e.facility || null, tracking);
    }

    const updatedRow = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    res.status(201).json({ success: true, data: formatShipment(updatedRow) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/shipments/:trackingNumber/events/:eventId (Correct an existing tracking event)
//
// The "Edit / Correct Tracking Event" modal previously only mutated the shipment object
// directly in local React state with no backend call at all — the correction looked saved
// but vanished on the next refetch. This persists the correction and records what changed.
shipmentsRouter.patch('/:trackingNumber/events/:eventId', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    const { eventId } = req.params as { eventId: string };
    const e = req.body || {};

    const eventRow: any = db.prepare('SELECT * FROM tracking_events WHERE id = ? AND shipment_tracking = ?').get(eventId, tracking);
    if (!eventRow) {
      return res.status(404).json({ success: false, error: `Tracking event ${eventId} not found on shipment ${tracking}` });
    }

    const newLocation = (e.city || e.state)
      ? `${e.city || eventRow.location.split(',')[0]?.trim() || ''}, ${e.state || eventRow.location.split(',')[1]?.trim() || ''}`
      : eventRow.location;
    const newTimestamp = (e.displayDate && e.displayTime)
      ? `${e.displayDate} · ${e.displayTime}`
      : eventRow.timestamp;

    db.prepare(`
      UPDATE tracking_events SET
        location = ?,
        timestamp = ?,
        description = COALESCE(?, description),
        correction_audit_json = ?
      WHERE id = ? AND shipment_tracking = ?
    `).run(
      newLocation,
      newTimestamp,
      e.description || null,
      e.correctionAudit ? JSON.stringify(e.correctionAudit) : eventRow.correction_audit_json,
      eventId,
      tracking
    );

    // If this was the shipment's current/latest event, reflect the correction on the
    // shipment's own currentLocation/lastUpdated too, same as the original (broken) client
    // behavior intended.
    if (eventRow.current_flag) {
      const [city, state] = newLocation.split(',').map((s: string) => s.trim());
      db.prepare(`
        UPDATE shipments SET
          current_location_city = COALESCE(?, current_location_city),
          current_location_state = COALESCE(?, current_location_state),
          last_updated = ?
        WHERE tracking_number = ?
      `).run(city || null, state || null, newTimestamp, tracking);
    }

    const updatedRow = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    res.json({ success: true, data: formatShipment(updatedRow) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/shipments/:trackingNumber (Full update)
shipmentsRouter.put('/:trackingNumber', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    const s = req.body;

    const row = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    if (!row) {
      return res.status(404).json({ success: false, error: `Shipment ${tracking} not found` });
    }

    // estimatedDelivery arrives either as the formatted { date, timeWindow } shape this API
    // returns, or as a plain string (the Edit Shipment modal flattens it to just the date) —
    // handle both without blowing away the time window when only the date was edited.
    const estDeliveryDate = typeof s.estimatedDelivery === 'string'
      ? s.estimatedDelivery
      : (s.estimatedDelivery?.date ?? null);
    const estDeliveryTime = typeof s.estimatedDelivery === 'object'
      ? (s.estimatedDelivery?.timeWindow ?? null)
      : (s.estimatedDeliveryDetail ?? null);

    db.prepare(`
      UPDATE shipments SET
        status = COALESCE(?, status),
        status_text = COALESCE(?, status_text),
        progress_percent = COALESCE(?, progress_percent),
        service = COALESCE(?, service),
        shipment_type = COALESCE(?, shipment_type),
        cargo_description = COALESCE(?, cargo_description),
        total_weight_lbs = COALESCE(?, total_weight_lbs),
        total_pieces = COALESCE(?, total_pieces),
        estimated_delivery_date = COALESCE(?, estimated_delivery_date),
        estimated_delivery_time = COALESCE(?, estimated_delivery_time),
        origin_city = COALESCE(?, origin_city),
        origin_state = COALESCE(?, origin_state),
        origin_lat = COALESCE(?, origin_lat),
        origin_lng = COALESCE(?, origin_lng),
        destination_city = COALESCE(?, destination_city),
        destination_state = COALESCE(?, destination_state),
        destination_lat = COALESCE(?, destination_lat),
        destination_lng = COALESCE(?, destination_lng),
        sender_json = COALESCE(?, sender_json),
        recipient_json = COALESCE(?, recipient_json),
        last_updated = 'Just now',
        current_location_city = COALESCE(?, current_location_city),
        current_location_state = COALESCE(?, current_location_state),
        current_location_lat = COALESCE(?, current_location_lat),
        current_location_lng = COALESCE(?, current_location_lng),
        current_facility = COALESCE(?, current_facility),
        progress_updated_at_ts = COALESCE(?, progress_updated_at_ts),
        vehicle_json = COALESCE(?, vehicle_json),
        pet_json = COALESCE(?, pet_json),
        pallet_json = COALESCE(?, pallet_json),
        container_json = COALESCE(?, container_json),
        freight_json = COALESCE(?, freight_json),
        document_json = COALESCE(?, document_json)
      WHERE tracking_number = ?
    `).run(
      s.status || null,
      s.statusText || null,
      s.progressPercent !== undefined ? s.progressPercent : null,
      s.service || null,
      s.shipmentType || null,
      s.cargoDescription || null,
      s.totalWeightLbs !== undefined ? s.totalWeightLbs : null,
      s.totalPieces !== undefined ? s.totalPieces : null,
      estDeliveryDate,
      estDeliveryTime,
      typeof s.origin === 'object' ? (s.origin?.city ?? null) : null,
      typeof s.origin === 'object' ? (s.origin?.state ?? null) : null,
      typeof s.origin === 'object' ? (s.origin?.lat ?? null) : null,
      typeof s.origin === 'object' ? (s.origin?.lng ?? null) : null,
      typeof s.destination === 'object' ? (s.destination?.city ?? null) : null,
      typeof s.destination === 'object' ? (s.destination?.state ?? null) : null,
      typeof s.destination === 'object' ? (s.destination?.lat ?? null) : null,
      typeof s.destination === 'object' ? (s.destination?.lng ?? null) : null,
      s.sender ? JSON.stringify(s.sender) : null,
      s.recipient ? JSON.stringify(s.recipient) : null,
      s.currentLocation ? (typeof s.currentLocation === 'string' ? s.currentLocation.split(',')[0].trim() : s.currentLocation.city) : null,
      s.currentLocation ? (typeof s.currentLocation === 'string' ? s.currentLocation.split(',')[1]?.trim() : s.currentLocation.state) : null,
      (typeof s.currentLocation === 'object' && typeof s.currentLocation?.lat === 'number') ? s.currentLocation.lat : null,
      (typeof s.currentLocation === 'object' && typeof s.currentLocation?.lng === 'number') ? s.currentLocation.lng : null,
      s.currentFacility || null,
      // Only reset the auto-advance clock when this call actually changes progress —
      // otherwise leave it alone so an unrelated field update doesn't restart the clock.
      s.progressPercent !== undefined ? Date.now() : null,
      s.vehicleDetails ? JSON.stringify(s.vehicleDetails) : null,
      s.petDetails ? JSON.stringify(s.petDetails) : null,
      s.palletDetails ? JSON.stringify(s.palletDetails) : null,
      s.containerDetails ? JSON.stringify(s.containerDetails) : null,
      s.freightDetails ? JSON.stringify(s.freightDetails) : null,
      s.documentDetails ? JSON.stringify(s.documentDetails) : null,
      tracking
    );

    const updatedRow = db.prepare('SELECT * FROM shipments WHERE tracking_number = ?').get(tracking);
    res.json({ success: true, data: formatShipment(updatedRow) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/shipments/:trackingNumber
shipmentsRouter.delete('/:trackingNumber', requireAdminAuth, (req: Request, res: Response) => {
  try {
    const tracking = (req.params.trackingNumber as string).trim().toUpperCase();
    db.prepare('DELETE FROM shipment_pieces WHERE parent_tracking = ?').run(tracking);
    db.prepare('DELETE FROM tracking_events WHERE shipment_tracking = ?').run(tracking);
    // Documents (BOL, labels, receipts, invoices, etc.) have no FK/cascade on shipment_tracking
    // — without this they survived a shipment delete and Document Center kept listing them
    // against a tracking number that 404s everywhere else in the app.
    db.prepare('DELETE FROM documents WHERE shipment_tracking = ?').run(tracking);
    db.prepare('DELETE FROM shipments WHERE tracking_number = ?').run(tracking);
    res.json({ success: true, message: `Shipment ${tracking} deleted successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
