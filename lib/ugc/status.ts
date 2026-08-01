export type ListingStatusUpdate = {
  status: 'claimed' | 'expired';
  reserved_at?: string;
};

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
