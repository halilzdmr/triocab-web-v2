export type TransferStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Transfer {
  id: string;
  reservationId: string;
  salesforceId?: string;  // Actual Salesforce record ID
  longPickupAddress: string;
  longDropoffAddress: string;
  bookingReference: string;
  passengerName: string;
  passengerCount: number;
  contactPhone: string;
  origin: string;
  destination: string;
  date: string;
  pickupTime: string;
  flightNumber: string;
  vehicleType: string;
  status: TransferStatus;
  notes?: string;
  price?: string;
  createdAt: string;
  pickupLocation?: {
    latitude: number;
    longitude: number;
  };
  dropoffLocation?: {
    latitude: number;
    longitude: number;
  };
}