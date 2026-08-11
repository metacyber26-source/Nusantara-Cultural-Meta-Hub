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
      return res.status(400).json({ error: 'paymentId is required' });
    }

    const API_KEY = process.env.PI_API_KEY;
    if (!API_KEY) {
      console.error("EROR BERSAMA: PI_API_KEY tidak ditemukan di Environment Variables Vercel!");
      return res.status(500).json({ error: 'PI_API_KEY is not configured on Vercel' });
    }

    console.log(`Mengirim request approve untuk Payment ID: ${paymentId}`);

    // Request approve ke Pi Network Sandbox API
    const piResponse = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await piResponse.json();
    console.log("Respon dari Pi Network API:", data);

    return res.status(piResponse.status).json(data);
  } catch (error) {
    console.error("Gagal memproses /api/approve:", error);
    return res.status(500).json({ error: error.message });
  }
}
