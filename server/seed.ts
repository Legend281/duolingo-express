import { db } from './db.js';

export function seedDatabaseIfEmpty() {
  // Must check whether the table is genuinely empty, not merely whether this one flagship
  // record exists — the earlier version checked only for 'DXP-2026-7K2M9QRX', which meant
  // deleting that specific demo shipment (and leaving any other real shipments in place)
  // caused it to be silently reinserted on every server restart, making that one delete look
  // like it "didn't take" even though the DELETE itself worked correctly.
  const { count } = db.prepare('SELECT COUNT(*) as count FROM shipments').get() as { count: number };
  if (count > 0) {
    return; // Database already has real data — never reseed over it.
  }

  console.log('[DB] Seeding flagship shipment DXP-2026-7K2M9QRX, quotes, and documents...');

  const insertShipment = db.prepare(`
    INSERT OR IGNORE INTO shipments (
      tracking_number, barcode_code, status, status_text, progress_percent,
      last_updated, created_at, estimated_delivery_date, estimated_delivery_time,
      service, shipment_type, cargo_description, total_weight_lbs, total_pieces,
      declared_value, origin_city, origin_state, origin_lat, origin_lng,
      destination_city, destination_state, destination_lat, destination_lng,
      current_location_city, current_location_state, current_location_lat, current_location_lng,
      current_facility, sender_json, recipient_json, dimensions_json,
      vehicle_json, references_json, cargo_category, photos_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const insertPiece = db.prepare(`
    INSERT OR IGNORE INTO shipment_pieces (
      id, tracking_number, parent_tracking, piece_number, total_pieces,
      status, status_text, current_location, weight_lbs, dimensions_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertEvent = db.prepare(`
    INSERT OR IGNORE INTO tracking_events (
      id, shipment_tracking, status, title, location, facility,
      timestamp, description, operator_notes, delay_flag, completed, current_flag, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQuote = db.prepare(`
    INSERT OR IGNORE INTO quote_requests (
      id, created_at, status, customer_name, customer_email, customer_phone,
      company, origin_json, destination_json, service, shipment_type,
      cargo_description, weight_lbs, pieces, dimensions_json, declared_value,
      special_instructions, pricing_json, internal_notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDoc = db.prepare(`
    INSERT OR IGNORE INTO documents (
      id, doc_type, title, shipment_tracking,
      sender_name, sender_company, sender_address, sender_city, sender_state, sender_zip, sender_phone,
      recipient_name, recipient_company, recipient_address, recipient_city, recipient_state, recipient_zip, recipient_phone,
      cargo_description, shipment_type, service, weight_lbs, pieces, dimensions,
      declared_value, charges_json, bol_carrier, bol_trailer_number, bol_seal_number,
      bol_special_instructions, created_date, status, version, file_size
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  // Atomic seed — node:sqlite has no db.transaction() helper, so BEGIN/COMMIT/ROLLBACK
  // are managed explicitly around the call to runSeed() below.
  const runSeed = () => {
    // 1. PRIMARY SHIPMENT: Randy's Tacoma (DXP-2026-7K2M9QRX)
    insertShipment.run(
      'DXP-2026-7K2M9QRX',
      'DXP-2026-7K2M9QRX',
      'IN_TRANSIT',
      'IN TRANSIT',
      68,
      'Aug 20, 2026 · 4:35 PM CT',
      '2026-08-19',
      'Wednesday, August 22',
      'by end of day',
      'Express',
      'Parcel',
      'Toyota Tacoma Bumper',
      45.0,
      1,
      1850.00,
      'New York',
      'NY',
      40.7128,
      -74.0060,
      'Los Angeles',
      'CA',
      34.0522,
      -118.2437,
      'Chicago',
      'IL',
      41.8781,
      -87.6298,
      'Chicago Regional Sort Facility',
      JSON.stringify({
        name: 'Randy',
        company: 'Apex Auto Design & Fabrication',
        addressLine: '123 Main Street, Suite 400',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '+1 (212) 555-0198',
        email: 'randy@apexautodesign.com'
      }),
      JSON.stringify({
        name: 'Daniel',
        company: 'West Coast Offroad Outfitters',
        addressLine: '456 Sunset Boulevard',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90028',
        country: 'USA',
        phone: '+1 (310) 555-0144',
        email: 'daniel@wcoffroad.com',
        instructions: 'Direct signature required upon delivery.'
      }),
      JSON.stringify({ length: 72, width: 24, height: 18 }),
      JSON.stringify({
        make: 'Toyota',
        model: 'Tacoma',
        year: 2024,
        vin: '4T1BK1EB7RU128940',
        color: 'Army Green',
        condition: 'Mint / Factory Packaged',
        licensePlate: 'TRK-8842',
        keysIncluded: true,
        operable: true,
        inspectionNotes: 'Full reinforced steel bumper consignment with mounting hardware.'
      }),
      JSON.stringify({ customerReference: 'PO-45821', orderNumber: 'ORD-84921', invoiceNumber: 'INV-2026-892' }),
      'Automotive & Parts',
      JSON.stringify([
        'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
      ])
    );

    insertPiece.run(
      'p1',
      'DXP-2026-7K2M9QRX-01',
      'DXP-2026-7K2M9QRX',
      1,
      1,
      'IN_TRANSIT',
      'IN TRANSIT',
      'Chicago, IL',
      45.0,
      JSON.stringify({ length: 72, width: 24, height: 18 })
    );

    const primaryEvents = [
      {
        id: 'ev-1',
        title: 'Shipment Received',
        facility: 'Manhattan Origin Terminal',
        location: 'New York, NY',
        timestamp: 'August 19, 2026 · 11:42 AM ET',
        description: 'Shipment received into the Duolingo Express network.',
        sort_order: 1,
        completed: 1,
        current: 0
      },
      {
        id: 'ev-2',
        title: 'Processing at Facility',
        facility: 'New York Gateway Sort Center',
        location: 'New York, NY',
        timestamp: 'August 19, 2026 · 2:10 PM ET',
        description: 'Shipment processed and prepared for linehaul departure.',
        sort_order: 2,
        completed: 1,
        current: 0
      },
      {
        id: 'ev-3',
        title: 'Departed Facility',
        facility: 'New York Outbound Gateway',
        location: 'New York, NY',
        timestamp: 'August 20, 2026 · 8:15 AM ET',
        description: 'Shipment departed our New York location.',
        sort_order: 3,
        completed: 1,
        current: 0
      },
      {
        id: 'ev-4',
        title: 'Arrived at Facility',
        facility: 'Chicago Regional Sort Facility',
        location: 'Chicago, IL',
        timestamp: 'August 20, 2026 · 4:35 PM CT',
        description: 'Your shipment has arrived at our Chicago location and is continuing toward its destination.',
        sort_order: 4,
        completed: 1,
        current: 1
      }
    ];

    for (const evt of primaryEvents) {
      insertEvent.run(
        evt.id,
        'DXP-2026-7K2M9QRX',
        'IN_TRANSIT',
        evt.title,
        evt.location,
        evt.facility,
        evt.timestamp,
        evt.description,
        'Verified physical RFID facility scan.',
        0,
        evt.completed,
        evt.current,
        evt.sort_order
      );
    }

    // 2. DELIVERED SHIPMENT (DXP-2026-8M4P2LQA)
    insertShipment.run(
      'DXP-2026-8M4P2LQA',
      'DXP-2026-8M4P2LQA',
      'DELIVERED',
      'DELIVERED',
      100,
      'August 14, 2026 · 2:15 PM PT',
      '2026-08-11',
      'August 14, 2026',
      'Delivered at 2:15 PM',
      'Priority Linehaul',
      'Parcel',
      'Avionics Navigation Transponder Unit',
      28.5,
      1,
      4200.00,
      'Boston',
      'MA',
      42.3601,
      -71.0589,
      'San Francisco',
      'CA',
      37.7749,
      -122.4194,
      'San Francisco',
      'CA',
      37.7749,
      -122.4194,
      'Delivered to Front Desk',
      JSON.stringify({ name: 'AeroTech Systems', city: 'Boston', state: 'MA' }),
      JSON.stringify({ name: 'Pacific Avionics Labs', city: 'San Francisco', state: 'CA' }),
      JSON.stringify({ length: 24, width: 18, height: 12 }),
      null,
      JSON.stringify({ customerReference: 'AV-99120' }),
      'Industrial & Aerospace',
      null
    );

    insertEvent.run(
      'ev-del-1',
      'DXP-2026-8M4P2LQA',
      'DELIVERED',
      'Delivered to Recipient',
      'San Francisco, CA',
      'Bay Area Delivery Center',
      'August 14, 2026 · 2:15 PM PT',
      'Consignment successfully delivered and signed for by M. Johnson.',
      'Proof of delivery stored.',
      0, 1, 1, 1
    );

    // 3. DELAYED SHIPMENT (DXP-2026-3J7N6KRB)
    insertShipment.run(
      'DXP-2026-3J7N6KRB',
      'DXP-2026-3J7N6KRB',
      'DELAYED',
      'DELAYED',
      55,
      'August 17, 2026 · 11:30 AM CT',
      '2026-08-15',
      'Thursday, August 20',
      'Revised Schedule',
      'Standard',
      'Parcel',
      'Industrial Automation Sensors',
      34.0,
      1,
      1200.00,
      'Chicago',
      'IL',
      41.8781,
      -87.6298,
      'Dallas',
      'TX',
      32.7767,
      -96.7970,
      'Dallas',
      'TX',
      32.7767,
      -96.7970,
      'Dallas Gateway Hub',
      JSON.stringify({ name: 'Midwest Tech', city: 'Chicago', state: 'IL' }),
      JSON.stringify({ name: 'Lone Star Distribution', city: 'Dallas', state: 'TX' }),
      JSON.stringify({ length: 30, width: 20, height: 15 }),
      null,
      null,
      'General Freight',
      null
    );

    // 4. Sample Quote Requests
    insertQuote.run(
      'Q-2026-8491',
      '2026-08-20T14:30:00Z',
      'NEW',
      'Marcus Vance',
      'm.vance@vanguardlogistics.com',
      '+1 (312) 555-0819',
      'Vanguard Automotive Logistics',
      JSON.stringify({ city: 'Detroit', state: 'MI', postalCode: '48201' }),
      JSON.stringify({ city: 'Atlanta', state: 'GA', postalCode: '30301' }),
      'Priority Freight',
      'Vehicle',
      '2x Prototype EV Battery Powertrains',
      1250,
      2,
      JSON.stringify({ length: 96, width: 48, height: 36 }),
      45000,
      'Requires temperature monitored flatbed trailer with 24/7 telematics.',
      JSON.stringify({
        baseRate: 1850,
        fuelSurcharge: 157.25,
        accessorials: 200,
        total: 2207.25,
        estimatedTransitDays: 2,
        validUntil: '2026-09-03'
      }),
      'Customer requested expedited booking pending rate confirmation.'
    );

    insertQuote.run(
      'Q-2026-8492',
      '2026-08-21T09:15:00Z',
      'RATE_PUBLISHED',
      'Elena Rostova',
      'e.rostova@apexflight.aero',
      '+1 (206) 555-0143',
      'Apex Flight Systems',
      JSON.stringify({ city: 'Seattle', state: 'WA', postalCode: '98101' }),
      JSON.stringify({ city: 'Miami', state: 'FL', postalCode: '33101' }),
      'Air Express',
      'Parcel',
      'Hydraulic Actuator Calibration Rig',
      85,
      1,
      JSON.stringify({ length: 36, width: 24, height: 24 }),
      12000,
      'Fragile sensitive avionics.',
      JSON.stringify({
        baseRate: 640,
        fuelSurcharge: 54.40,
        accessorials: 75,
        total: 769.40,
        estimatedTransitDays: 1,
        validUntil: '2026-09-04'
      }),
      'Quote issued via customer portal.'
    );

    // 5. Sample Official Document
    insertDoc.run(
      'doc-bol-7k2m9qrx',
      'BOL',
      'Auto Transport Bill of Lading & Inspection',
      'DXP-2026-7K2M9QRX',
      'Randy',
      'Apex Auto Design',
      '123 Main Street, Suite 400',
      'New York',
      'NY',
      '10001',
      '+1 (212) 555-0198',
      'Daniel',
      'West Coast Offroad',
      '456 Sunset Boulevard',
      'Los Angeles',
      'CA',
      '90028',
      '+1 (310) 555-0144',
      'Toyota Tacoma Bumper Consignment',
      'Parcel',
      'Express',
      45.0,
      1,
      '72 × 24 × 18 in',
      1850.0,
      JSON.stringify({ baseRate: 320, insurance: 45, fuelSurcharge: 28.5, total: 393.5 }),
      'Duolingo Express Dedicated Linehaul LLC',
      'TL-4982',
      'SEAL #DXP-2M9QRX-SEC',
      'Must inspect mounting brackets upon dock arrival. Store upright.',
      'Aug 19, 2026',
      'GENERATED',
      1,
      '1.4 MB'
    );
  };

  db.exec('BEGIN');
  try {
    runSeed();
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log('[DB] Seeding completed successfully.');
}
