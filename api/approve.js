export default async function handler(req, res) {
  // Menangani masalah Cross-Origin (CORS) dari Pi Browser
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
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'paymentId is required' });
    }

    const API_KEY = process.env.PI_API_KEY;
    if (!API_KEY) {
      console.error("PI_API_KEY Missing on Vercel Environment Variables");
      return res.status(500).json({ error: 'PI_API_KEY Missing' });
    }

    // Tembak Server Pi Testnet
    const piRes = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${API_KEY.trim()}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await piRes.json();

    if (!piRes.ok) {
      console.error("Pi Testnet Approval Error:", data);
      return res.status(piRes.status).json(data);
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Internal Server Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
