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
    const { paymentId, txid } = req.body;
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'paymentId and txid are required' });
    }

    const API_KEY = process.env.PI_API_KEY;
    if (!API_KEY) {
      console.error("PI_API_KEY belum dipasang di Vercel!");
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Kirim request complete ke API Pi Network
    const piResponse = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid: txid })
    });

    const data = await piResponse.json();
    console.log("Complete Response from Pi:", data);

    return res.status(piResponse.status).json(data);
  } catch (error) {
    console.error("Error in /api/complete:", error);
    return res.status(500).json({ error: error.message });
  }
}
