// api/network-info.js
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const host = req.headers.host || 'localhost';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const clientUrl = `${protocol}://${host}`;

  return res.status(200).json({
    local_ip: host.split(':')[0],
    server_port: 443,
    client_url: clientUrl,
    qr_code: ''
  });
}
