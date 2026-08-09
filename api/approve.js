export default async function handler(req, res) {
  // Tangani CORS
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
      console.error("PI_API_KEY belum dipasang di Vercel!");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Kirim request approve ke API Pi Network
    const piResponse = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await piResponse.json();
    console.log("Approve Response from Pi:", data);

    return res.status(piResponse.status).json(data);
  } catch (error) {
    console.error("Error in /api/approve:", error);
    return res.status(500).json({ error: error.message });
  }
}
