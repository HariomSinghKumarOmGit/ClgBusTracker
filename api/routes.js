// api/routes.js
// Vercel Serverless Function: Transit Routes

const transitRoutes = [
  {
    id: "ROUTE-38",
    name: "Route 38: Glade Express",
    code: "38",
    description: "Southbound to Glade via 15th, 22nd Ave, Central Park and Glade Terminal",
    direction: "➔ Southbound to Glade",
    start_point: "North Gateway",
    end_point: "Glade Central Terminal",
    distance_km: 18.4,
    duration_mins: 42,
    is_active: true,
    vehicle_plate: "DL 1P B 3838",
    color: "#1d4ed8",
    polyline: [
      [28.5350, 77.1980],
      [28.5312, 77.2020],
      [28.5280, 77.2060], // 15th & Market (User stop)
      [28.5255, 77.2095],
      [28.5230, 77.2135], // 22nd Ave
      [28.5200, 77.2170],
      [28.5165, 77.2215], // Central Park
      [28.5130, 77.2260], // Memorial Hospital
      [28.5080, 77.2320],
      [28.5040, 77.2380]  // Glade South Terminal
    ],
    stops: [
      {
        id: "STOP-38-01",
        route_id: "ROUTE-38",
        sequence_order: 1,
        name: "15th & Market St",
        description: "Primary transfer hub (Your Stop 😎)",
        latitude: 28.5280,
        longitude: 77.2060,
        scheduled_time: "08:15 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-38-02",
        route_id: "ROUTE-38",
        sequence_order: 2,
        name: "22nd Avenue",
        description: "Commercial District & Metro Gate 2",
        latitude: 28.5230,
        longitude: 77.2135,
        scheduled_time: "08:23 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-38-03",
        route_id: "ROUTE-38",
        sequence_order: 3,
        name: "Glade Central Park",
        description: "Recreation grounds & North Library",
        latitude: 28.5165,
        longitude: 77.2215,
        scheduled_time: "08:32 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-38-04",
        route_id: "ROUTE-38",
        sequence_order: 4,
        name: "Memorial Hospital",
        description: "Health sciences campus & emergency center",
        latitude: 28.5130,
        longitude: 77.2260,
        scheduled_time: "08:38 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-38-05",
        route_id: "ROUTE-38",
        sequence_order: 5,
        name: "Glade South Terminal",
        description: "Final Interchange & Regional Rail",
        latitude: 28.5040,
        longitude: 77.2380,
        scheduled_time: "08:45 AM",
        is_terminal: true,
        status: "upcoming"
      }
    ]
  },
  {
    id: "ROUTE-21",
    name: "Route 21: Victory Monument → Siam Square",
    code: "21",
    description: "Bangkok Metropolitan Transit Authority Express 21",
    direction: "➔ Southbound to Siam Square",
    start_point: "Victory Monument (อนุสาวรีย์ชัยสมรภูมิ)",
    end_point: "Siam Square (สยามสแควร์)",
    distance_km: 12.8,
    duration_mins: 35,
    is_active: true,
    vehicle_plate: "16-1270 5-70016",
    color: "#2563eb",
    polyline: [
      [28.5420, 77.1920],
      [28.5380, 77.1950],
      [28.5320, 77.1990],
      [28.5280, 77.2060],
      [28.5240, 77.2100],
      [28.5190, 77.2150]
    ],
    stops: [
      {
        id: "STOP-21-01",
        route_id: "ROUTE-21",
        sequence_order: 1,
        name: "อนุสาวรีย์ชัยสมรภูมิ (เกาะพญาไท)",
        description: "Victory Monument Phaya Thai Island",
        latitude: 28.5420,
        longitude: 77.1920,
        scheduled_time: "08:00 AM",
        is_terminal: false,
        status: "passed"
      },
      {
        id: "STOP-21-02",
        route_id: "ROUTE-21",
        sequence_order: 2,
        name: "สยามสแควร์ (Siam Square)",
        description: "Siam Center & BTS interchange",
        latitude: 28.5380,
        longitude: 77.1950,
        scheduled_time: "08:12 AM",
        is_terminal: false,
        status: "current"
      },
      {
        id: "STOP-21-03",
        route_id: "ROUTE-21",
        sequence_order: 3,
        name: "โอสถศาลา (Osotsala)",
        description: "Faculty of Pharmaceutical Sciences",
        latitude: 28.5320,
        longitude: 77.1990,
        scheduled_time: "08:18 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-21-04",
        route_id: "ROUTE-21",
        sequence_order: 4,
        name: "โรงเรียนเตรียมอุดมศึกษา",
        description: "Triam Udom Suksa School",
        latitude: 28.5280,
        longitude: 77.2060,
        scheduled_time: "08:24 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-21-05",
        route_id: "ROUTE-21",
        sequence_order: 5,
        name: "จุฬาฯ (สายพระบรมรูป)",
        description: "Chulalongkorn University Main Gate",
        latitude: 28.5190,
        longitude: 77.2150,
        scheduled_time: "08:35 AM",
        is_terminal: true,
        status: "upcoming"
      }
    ]
  },
  {
    id: "ROUTE-140",
    name: "Route 140: Express Intercity",
    code: "140",
    description: "Rapid express transit across arterial highways",
    direction: "➔ Eastbound Express",
    start_point: "North Gateway",
    end_point: "East Terminal",
    distance_km: 24.2,
    duration_mins: 45,
    is_active: true,
    vehicle_plate: "DL 1P B 1401",
    color: "#0284c7",
    polyline: [
      [28.5450, 77.1850],
      [28.5380, 77.1980],
      [28.5280, 77.2060],
      [28.5150, 77.2280],
      [28.5000, 77.2450]
    ],
    stops: [
      {
        id: "STOP-140-01",
        route_id: "ROUTE-140",
        sequence_order: 1,
        name: "Express Gateway",
        latitude: 28.5450,
        longitude: 77.1850,
        scheduled_time: "08:05 AM",
        is_terminal: false,
        status: "passed"
      },
      {
        id: "STOP-140-02",
        route_id: "ROUTE-140",
        sequence_order: 2,
        name: "15th Transfer Point",
        latitude: 28.5280,
        longitude: 77.2060,
        scheduled_time: "08:20 AM",
        is_terminal: false,
        status: "upcoming"
      },
      {
        id: "STOP-140-03",
        route_id: "ROUTE-140",
        sequence_order: 3,
        name: "East Terminal Interchange",
        latitude: 28.5000,
        longitude: 77.2450,
        scheduled_time: "08:45 AM",
        is_terminal: true,
        status: "upcoming"
      }
    ]
  }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (id) {
    const route = transitRoutes.find(r => r.id === id || r.code === id);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    return res.status(200).json(route);
  }

  return res.status(200).json(transitRoutes);
}
