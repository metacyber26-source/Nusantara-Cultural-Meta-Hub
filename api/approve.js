// File: api/approve.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { paymentId } = req.body;
  const apiKey = process.env.PI_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: PI_API_KEY belum terpasang di Vercel Environment Variables!");
    return res.status(500).json({ error: "Server API Key missing" });
  }

  try {
    console.log(`Memproses approval untuk paymentId: ${paymentId}`);

    // Panggil API Pi Network Testnet
    const piResponse = await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await piResponse.json();

    if (!piResponse.ok) {
      console.error("Gagal Approve ke Pi Server:", data);
      return res.status(piResponse.status).json(data);
    }

    console.log("Berhasil Approve ke Pi Server:", data);
    return res.status(200).json(data);

  } catch (error) {
    console.error("Internal Error saat Approve:", error);
    return res.status(500).json({ error: error.message });
  }
}
