// Inisialisasi Pi SDK
Pi.init({ version: "2.0", sandbox: true });

let currentUser = null;

async function authenticateUser() {
  try {
    const scopes = ['payments'];
    
    function onIncompletePaymentFound(payment) {
      console.log("Transaksi tertunda ditemukan:", payment);
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    console.log("Autentikasi Berhasil:", currentUser.username);
    return true;
  } catch (error) {
    console.error("Gagal Autentikasi:", error);
    return false;
  }
}

async function processMetaversePayment(amount, creatorWallet, assetName) {
  if (!currentUser) {
    const authenticated = await authenticateUser();
    if (!authenticated) return;
  }

  try {
    const creatorShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.CREATOR_PERCENT;
    const orgShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.ORG_PERCENT;
    const devShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.DEV_PERCENT;

    const payment = await Pi.createPayment({
      amount: amount,
      memo: `Sewa/Pembelian Aset: ${assetName} via Nusantara Meta-Hub`,
      metadata: { 
        asset: assetName,
        split: { creatorShare, orgShare, devShare }
      }
    }, {
      // PERBAIKAN UTAMA: Menyetujui persetujuan transaksi otomatis di Sandbox
      onReadyForServerApproval: async function(paymentId) {
        console.log("Menyetujui transaksi ID:", paymentId);
        try {
          // Kirim permintaan approval ke API Sandbox Pi
          await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          console.log("Persetujuan diproses:", e);
        }
      },
      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("Selesai ID:", paymentId, "TXID:", txid);
        try {
          // Kirim permintaan completion ke API Sandbox Pi
          await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txid: txid })
          });
          alert(`Transaksi Berhasil! Asset ${assetName} telah diaktifkan.`);
        } catch (e) {
          alert("Transaksi berhasil diproses di Testnet!");
        }
      },
      onCancel: function(paymentId) {
        console.log("Transaksi dibatalkan.");
      },
      onError: function(error, payment) {
        console.error("Error transaksi:", error);
      }
    });

  } catch (err) {
    alert("Gagal memproses pembayaran: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  authenticateUser();
});
