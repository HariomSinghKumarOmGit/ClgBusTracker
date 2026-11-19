// api/auth/admin-login.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pin } = req.body || {};
  if (pin === 'admin123') {
    return res.status(200).json({
      role: 'admin',
      authenticated: true
    });
  }

  return res.status(401).json({ error: 'Invalid Admin PIN' });
}
