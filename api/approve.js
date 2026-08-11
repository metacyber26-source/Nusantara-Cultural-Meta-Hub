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
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId required' });
    }

    const API_KEY = process.env.PI_API_KEY;
    if (!API_KEY) {
      console.error("PI_API_KEY is missing on Vercel environment variables.");
      return res.status(500).json({ error: 'API Key Not Configured' });
    }

    // Mengirim permintaan persetujuan ke Pi Testnet API
    const response = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Pi API Approval Failed:", data);
      return res.status(response.status).json(data);
    }

    // Mengembalikan sukses ke Pi SDK
    return res.status(200).json(data);

  } catch (error) {
    console.error("Internal Approval Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
