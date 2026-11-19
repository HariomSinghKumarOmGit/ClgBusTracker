// api/drivers.js
// Vercel Serverless Function: Driver Details API
// Stores and retrieves driver details on Vercel backend

let inMemoryDrivers = [
  {
    id: "DRV-3801",
    name: "Rajesh Kumar",
    phone: "+91 98112 34567",
    license_no: "DL-042022-7891",
    assigned_bus_id: "BUS-38",
    bus_plate: "DL 1P B 3838",
    bus_number: "Bus 38",
    rating: 4.9,
    status: "ON_DUTY",
    experience_years: 8,
    avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    emergency_contact: "+91 98112 34500 (Spouse)",
    blood_group: "O+",
    shift: "Morning Express (06:00 - 14:00)",
    pin: "1234"
  },
  {
    id: "DRV-2101",
    name: "Somchai Prasert",
    phone: "+66 81 234 5678",
    license_no: "TH-9821-4412",
    assigned_bus_id: "BUS-21",
    bus_plate: "16-1270 5-70016",
    bus_number: "Bus 21",
    rating: 4.85,
    status: "ON_DUTY",
    experience_years: 11,
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    emergency_contact: "+66 81 234 9999 (Family)",
    blood_group: "B+",
    shift: "Day Shift (07:00 - 15:30)",
    pin: "2121"
  },
  {
    id: "DRV-1401",
    name: "Michael Chen",
    phone: "+91 98711 99882",
    license_no: "DL-112021-3320",
    assigned_bus_id: "BUS-140",
    bus_plate: "DL 1P B 1401",
    bus_number: "Bus 140",
    rating: 4.92,
    status: "ON_DUTY",
    experience_years: 6,
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    emergency_contact: "+91 98711 00000",
    blood_group: "A+",
    shift: "Evening Transit (14:00 - 22:00)",
    pin: "1400"
  },
  {
    id: "DRV-0101",
    name: "Vikram Malhotra",
    phone: "+91 98450 12345",
    license_no: "DL-092019-5561",
    assigned_bus_id: "BUS-01",
    bus_plate: "DL 1P B 4022",
    bus_number: "Bus 01",
    rating: 4.78,
    status: "OFF_DUTY",
    experience_years: 5,
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    emergency_contact: "+91 98450 99999",
    blood_group: "AB+",
    shift: "Night Standby",
    pin: "4022"
  }
];

export default function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Fetch all driver details stored on Vercel
  if (req.method === 'GET') {
    return res.status(200).json(inMemoryDrivers);
  }

  // POST: Add new driver to Vercel store
  if (req.method === 'POST') {
    const { name, phone, license_no, bus_number, bus_plate, shift, blood_group, emergency_contact } = req.body || {};
    if (!name || !phone) {
      return res.status(400).json({ error: 'Driver name and phone are required' });
    }
    const newDriver = {
      id: `DRV-${Date.now().toString(36).toUpperCase()}`,
      name,
      phone,
      license_no: license_no || 'DL-PENDING',
      assigned_bus_id: `BUS-${Math.floor(Math.random() * 900 + 100)}`,
      bus_plate: bus_plate || 'DL 1P B 9999',
      bus_number: bus_number || 'Bus Transit',
      rating: 5.0,
      status: 'ON_DUTY',
      experience_years: 2,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      emergency_contact: emergency_contact || phone,
      blood_group: blood_group || 'O+',
      shift: shift || 'General Shift'
    };
    inMemoryDrivers.push(newDriver);
    return res.status(201).json(newDriver);
  }

  // PUT: Update driver details
  if (req.method === 'PUT') {
    const { id } = req.query;
    const body = req.body || {};
    const driverId = id || body.id;
    const index = inMemoryDrivers.findIndex(d => d.id === driverId);
    if (index === -1) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    inMemoryDrivers[index] = { ...inMemoryDrivers[index], ...body };
    return res.status(200).json(inMemoryDrivers[index]);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
