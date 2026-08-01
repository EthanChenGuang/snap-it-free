export type ListingStatus = 'active' | 'claimed' | 'expired' | 'hidden';

export type ListingStatusUpdate = {
  status: 'claimed' | 'expired';
  reserved_at?: string;
};

export function canReserve(status: ListingStatus): boolean {
  return status === 'active';
}

export function canDeliver(status: ListingStatus): boolean {
  return status === 'active' || status === 'claimed';
}

export function mapReservedTransition(now = new Date()): ListingStatusUpdate {
  return {
    status: 'claimed',
    reserved_at: now.toISOString(),
  };
}

export function mapDeliveredTransition(): ListingStatusUpdate {
  return {
    status: 'expired',
  };
}
