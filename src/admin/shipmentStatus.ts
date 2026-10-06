// One definition of what each shipment status means on admin screens. The dashboard used to
// keep its own 4-way mapping: anything that wasn't IN_TRANSIT / OUT_FOR_DELIVERY / DELIVERED /
// HELD / EXCEPTION was printed as "Received" — so shipments at a facility, departed, delayed,
// on hold (the real status is ON_HOLD, not HELD) or still awaiting pickup all looked like
// they hadn't moved, and the In Transit / Holds counters skipped them.

export type StatusTone = 'transit' | 'delivered' | 'hold' | 'waiting' | 'origin' | 'out' | 'closed';

const STATUS_INFO: Record<string, { label: string; tone: StatusTone }> = {
  CREATED: { label: 'Booked', tone: 'waiting' },
  BOOKED: { label: 'Booked', tone: 'waiting' },
  AWAITING_PICKUP: { label: 'Awaiting Pickup', tone: 'waiting' },
  RECEIVED: { label: 'Received at Origin', tone: 'origin' },
  PROCESSING: { label: 'Processing', tone: 'transit' },
  IN_TRANSIT: { label: 'In Transit', tone: 'transit' },
  AT_FACILITY: { label: 'At Facility', tone: 'transit' },
  DEPARTED_FACILITY: { label: 'Departed Facility', tone: 'transit' },
  DESTINATION_PROCESSING: { label: 'At Destination Hub', tone: 'transit' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', tone: 'out' },
  DELIVERY_ATTEMPTED: { label: 'Delivery Attempted', tone: 'hold' },
  DELIVERED: { label: 'Delivered', tone: 'delivered' },
  DELAYED: { label: 'Delayed', tone: 'hold' },
  EXCEPTION: { label: 'Exception', tone: 'hold' },
  HELD: { label: 'On Hold', tone: 'hold' },
  ON_HOLD: { label: 'On Hold', tone: 'hold' },
  RETURNED: { label: 'Returned', tone: 'closed' },
  CANCELLED: { label: 'Cancelled', tone: 'closed' },
};

export function statusInfo(status?: string | null): { label: string; tone: StatusTone } {
  const key = String(status || '').toUpperCase();
  return STATUS_INFO[key] || { label: key ? key.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase()) : 'Unknown', tone: 'origin' };
}

/** Physically moving between origin and destination (including at hubs on the way). */
export function isMoving(status?: string | null): boolean {
  const tone = statusInfo(status).tone;
  return tone === 'transit' || tone === 'out';
}

export function isHoldOrException(s: { status?: string | null; delayNotice?: { hasDelay?: boolean } | null }): boolean {
  return statusInfo(s.status).tone === 'hold' || Boolean(s.delayNotice?.hasDelay);
}

export function isAwaitingPickup(status?: string | null): boolean {
  return statusInfo(status).tone === 'waiting';
}

export function isOpen(status?: string | null): boolean {
  const tone = statusInfo(status).tone;
  return tone !== 'delivered' && tone !== 'closed';
}

/** Past its delivery deadline and still not delivered. */
export function isOverdue(s: { status?: string | null; estimatedDelivery?: any; estimatedDeliveryTs?: string }): boolean {
  if (!isOpen(s.status)) return false;
  const ts = s.estimatedDeliveryTs || (typeof s.estimatedDelivery === 'object' ? s.estimatedDelivery?.timestamp : undefined);
  const t = ts ? Date.parse(ts) : NaN;
  return !isNaN(t) && t < Date.now();
}

/** Chip CSS modifier + dot colour, using the chip styles both tables already have. */
export function chipStyle(tone: StatusTone): { chip: string; dot: string } {
  switch (tone) {
    case 'transit': return { chip: 'in-transit', dot: 'blue' };
    case 'out': return { chip: 'out-delivery', dot: 'orange' };
    case 'delivered': return { chip: 'delivered', dot: 'green' };
    case 'hold': return { chip: 'delayed', dot: 'red' };
    case 'waiting': return { chip: 'waiting', dot: 'amber' };
    case 'closed': return { chip: 'arrived', dot: 'slate' };
    default: return { chip: 'arrived', dot: 'teal' };
  }
}

/** Placeholder names an older version saved when a city couldn't be found. */
export function hasPlaceholderLocation(s: any): boolean {
  const names = [s?.origin?.city, s?.destination?.city, s?.sender?.city, s?.recipient?.city]
    .map(v => String(v || '').trim().toLowerCase());
  return names.some(n => n === 'origin city' || n === 'destination city' || n === 'origin' || n === 'destination');
}
