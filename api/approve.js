export default async function handler(req, res) {
  // Izinkan CORS untuk Pi Browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId wajib diisi' });
    }

    const API_KEY = process.env.PI_API_KEY;
    if (!API_KEY) {
      console.error("PI_API_KEY belum terpasang di Vercel");
      return res.status(500).json({ error: 'Server key not configured' });
    }

    // Tembak langsung API Sandbox Pi Network
    const piRes = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await piRes.json();
    return res.status(piRes.status).json(result);

  } catch (err) {
    console.error("Error approve:", err);
    return res.status(500).json({ error: err.message });
  }
}
