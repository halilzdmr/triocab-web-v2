import { Transfer, TransferStatus } from '../types';

const destinations = [
  'Bodrum Center',
  'Turgutreis',
  'Yalikavak',
  'Gumbet',
  'Bitez',
  'Torba',
  'Bodrum Airport',
  'Bodrum Marina',
  'Turkbuku',
  'Gumusluk',
];

const vehicleTypes = [
  'Standard',
  'Luxury',
  'Executive',
  'People Carrier',
  'Large People Carrier',
  'Executive People Carrier',
  'Minibus',
  'Electric Standard',
  'Electric Luxury',
  'Sedan',
  'Stationwagon',
  'SUV',
  'Minivan',
  'Business Limousine',
  'Business Sedan',
  'Stretch Limousine',
  'Touring Car',
  'Standard Electric Car',
  'Exclusive Minivan',
  'Luxury Sedan',
  'High End Electric Car',
  'Shuttle',
  'Economy Sedan',
  'Helicopter',
  'Van',
  'Bus',
  'MPV',
  'Coach',
  'Speedy Shuttle',
  'Event Shuttle',
  'Direct Shuttle',
  'First Class'
];

// Generate a random time in 24-hour format
const randomTime = (): string => {
  const hours = Math.floor(Math.random() * 24).toString().padStart(2, '0');
  const minutes = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Generate a random date within a specific range
const randomDate = (startDate: Date, endDate: Date): string => {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const randomTime = start + Math.random() * (end - start);
  const date = new Date(randomTime);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Generate a random flight number
const randomFlightNumber = (): string => {
  const airlines = ['TK', 'PC', 'XQ', 'BA', 'LH', 'AF', 'SU', 'EK'];
  const airline = airlines[Math.floor(Math.random() * airlines.length)];
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `${airline}${number}`;
};

// Generate a random phone number
const randomPhone = (): string => {
  return `+90 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`;
};

// Generate a random booking reference
const randomBookingRef = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let ref = '';
  for (let i = 0; i < 2; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  ref += Math.floor(Math.random() * 9000) + 1000;
  return ref;
};

// Generate random names
const randomName = (): string => {
  const firstNames = [
    'James', 'Emma', 'Liam', 'Olivia', 'William', 'Sophia', 
    'Alexander', 'Isabella', 'Michael', 'Charlotte', 'Ethan', 'Amelia', 
    'Daniel', 'Mia', 'Matthew', 'Harper', 'Aiden', 'Evelyn', 'Henry'
  ];
  
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 
    'Davis', 'Garcia', 'Rodriguez', 'Wilson', 'Martinez', 'Anderson', 
    'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson'
  ];
  
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
};

// Generate random status with weighted distribution
const randomStatus = (date: Date): TransferStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const transferDate = new Date(date);
  transferDate.setHours(0, 0, 0, 0);

  if (transferDate < today) {
    // Past transfers are more likely to be completed
    return Math.random() > 0.2 ? 'completed' : 'cancelled';
  } else if (transferDate.getTime() === today.getTime()) {
    // Today's transfers are mostly pending or confirmed
    const rand = Math.random();
    if (rand < 0.5) return 'confirmed';
    if (rand < 0.8) return 'pending';
    return 'cancelled';
  } else {
    // Future transfers are mostly pending
    const rand = Math.random();
    if (rand < 0.7) return 'pending';
    if (rand < 0.9) return 'confirmed';
    return 'cancelled';
  }
};

// Generate a list of random transfers
export const generateMockTransfers = (count: number): Transfer[] => {
  const transfers: Transfer[] = [];
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Ensure we have some transfers for today and tomorrow
  const todayCount = Math.floor(count * 0.4); // 40% today
  const tomorrowCount = Math.floor(count * 0.4); // 40% tomorrow
  const otherCount = count - todayCount - tomorrowCount; // Remaining for other dates
  
  // Generate transfers for today
  for (let i = 0; i < todayCount; i++) {
    const transferDate = today;
    const status = randomStatus(transferDate);
    
    transfers.push(generateTransfer(transferDate, status));
  }
  
  // Generate transfers for tomorrow
  for (let i = 0; i < tomorrowCount; i++) {
    const transferDate = tomorrow;
    const status = randomStatus(transferDate);
    
    transfers.push(generateTransfer(transferDate, status));
  }
  
  // Generate remaining transfers for other dates
  for (let i = 0; i < otherCount; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + Math.floor(Math.random() * 14) + 2);
    const status = randomStatus(futureDate);
    
    transfers.push(generateTransfer(futureDate, status));
  }
  
  return transfers.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Helper function to generate a single transfer
const generateTransfer = (date: Date, status: TransferStatus): Transfer => {
  const originIndex = Math.floor(Math.random() * destinations.length);
  let destinationIndex = Math.floor(Math.random() * destinations.length);
  
  // Ensure origin and destination are different
  while (destinationIndex === originIndex) {
    destinationIndex = Math.floor(Math.random() * destinations.length);
  }
  
  // Calculate created date (a few days before the transfer date)
  const createdDate = new Date(date);
  createdDate.setDate(date.getDate() - Math.floor(Math.random() * 14) - 1);
  
  return {
    id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    bookingReference: randomBookingRef(),
    passengerName: randomName(),
    passengerCount: Math.floor(Math.random() * 6) + 1,
    contactPhone: randomPhone(),
    origin: destinations[originIndex],
    longDropoffAddress:'N/A',
    longPickupAddress:'N/A',
    destination: destinations[destinationIndex],
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    pickupTime: randomTime(),
    flightNumber: randomFlightNumber(),
    vehicleType: vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)],
    status,
    notes: Math.random() > 0.7 ? 'Customer requested child seat. VIP service package included.' : '',
    createdAt: createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    price: (Math.random() * 200 + 50).toFixed(2).toString()
  };
};

// Initial transfer data
export const mockTransfers = generateMockTransfers(25);