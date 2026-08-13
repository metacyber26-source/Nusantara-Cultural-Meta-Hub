export default async function handler(req, res) {
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
      return res.status(500).json({ error: 'PI_API_KEY Missing' });
    }

    const piRes = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const data = await piRes.json();

    if (!piRes.ok) {
      console.error("Pi Testnet Completion Error:", data);
      return res.status(piRes.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
