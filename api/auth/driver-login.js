// api/auth/driver-login.js
const defaultDrivers = [
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
  }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pin } = req.body || {};
  const driver = defaultDrivers.find(d => d.pin === pin);
  if (driver || pin === '1234') {
    return res.status(200).json({
      role: 'driver',
      driver: driver || defaultDrivers[0]
    });
  }

  return res.status(401).json({ error: 'Invalid Driver PIN' });
}
