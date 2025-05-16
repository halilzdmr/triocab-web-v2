export type TransferStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Transfer {
  id: string;
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
}