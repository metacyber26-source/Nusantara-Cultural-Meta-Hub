export default async function handler(req, res) {
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
      return res.status(400).json({ error: 'paymentId dan txid wajib diisi' });
    }

    const API_KEY = process.env.PI_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: 'Server key not configured' });
    }

    const piRes = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const result = await piRes.json();
    return res.status(piRes.status).json(result);

  } catch (err) {
    console.error("Error complete:", err);
    return res.status(500).json({ error: err.message });
  }
}
