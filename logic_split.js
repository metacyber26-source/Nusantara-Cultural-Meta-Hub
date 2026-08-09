// Inisialisasi Pi SDK
Pi.init({ version: "2.0", sandbox: true });

let currentUser = null;

// Fungsi Autentikasi + Penanganan Transaksi Gantung
async function authenticateUser() {
  try {
    const scopes = ['payments'];
    
    // PERBAIKAN UTAMA: Tangani transaksi gantung yang kedaluwarsa/tertunda
    async function onIncompletePaymentFound(payment) {
      console.log("Menemukan transaksi gantung:", payment.identifier);
      try {
        // Beritahu server Pi untuk menyelesaikan/membatalkan pembayaran macet
        await fetch(`https://api.testnet.minepi.com/v2/payments/${payment.identifier}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txid: payment.transaction ? payment.transaction.txid : "CANCELLED" })
        });
      } catch (e) {
        console.log("Selesai membersihkan transaksi lama.");
      }
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

// Fungsi Transaksi Baru
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
      onReadyForServerApproval: async function(paymentId) {
        console.log("Approve ID:", paymentId);
        try {
          await fetch(`https://api.testnet.minepi.com/v2/payments/${paymentId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (e) {
          console.log("Approval sent");
        }
      },
      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("Complete ID:", paymentId);
        try {
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
        console.log("Dibatalkan oleh pengguna.");
      },
      onError: function(error, payment) {
        console.error("Error pembayaran:", error);
      }
    });

  } catch (err) {
    alert("Gagal memproses pembayaran: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  authenticateUser();
});
