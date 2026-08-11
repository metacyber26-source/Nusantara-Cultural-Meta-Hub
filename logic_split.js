const SYSTEM_CONFIG = {
  REVENUE_SHARE: {
    CREATOR_PERCENT: 0.50,
    ORG_PERCENT: 0.30,
    DEV_PERCENT: 0.20
  }
};

// Inisialisasi Pi SDK v2 Sandbox
Pi.init({ version: "2.0", sandbox: true });

let currentUser = null;

async function authenticateUser() {
  try {
    const scopes = ['payments'];

    async function onIncompletePaymentFound(payment) {
      console.log("Menemukan pembayaran belum selesai:", payment);
      if (payment.transaction && payment.transaction.txid) {
        try {
          await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: payment.identifier,
              txid: payment.transaction.txid
            })
          });
        } catch (err) {
          console.error("Gagal menyelesaikan pembayaran lama:", err);
        }
      }
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    console.log("Autentikasi Sukses:", currentUser.username);
    return true;
  } catch (error) {
    console.error("Autentikasi Gagal:", error);
    return false;
  }
}

async function processMetaversePayment(amount, creatorWallet, assetName) {
  if (!currentUser) {
    const authenticated = await authenticateUser();
    if (!authenticated) {
      alert("Gagal terhubung ke jaringan Pi Network.");
      return;
    }
  }

  try {
    const creatorShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.CREATOR_PERCENT;
    const orgShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.ORG_PERCENT;
    const devShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.DEV_PERCENT;

    const paymentData = {
      amount: amount,
      memo: `Sewa/Pembelian Aset: ${assetName} via Meta-Hub ICP2E`,
      metadata: {
        asset: assetName,
        split: { creator: creatorShare, org: orgShare, dev: devShare }
      }
    };

    const callbacks = {
      onReadyForServerApproval: async function(paymentId) {
        console.log("Menyetujui transaksi melalui server backend...", paymentId);
        try {
          const res = await fetch('/api/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId })
          });
          
          const result = await res.json();
          if (!res.ok) {
            console.error("Server backend gagal menyetujui:", result);
          } else {
            console.log("Transaksi berhasil disetujui server:", result);
          }
        } catch (e) {
          console.error("Gagal menghubungi /api/approve:", e);
        }
      },

      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("Menyelesaikan transaksi di backend...", paymentId, txid);
        try {
          const res = await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId, txid: txid })
          });

          if (res.ok) {
            alert(`Sewa Berhasil! Aset ${assetName} kini dapat digunakan.`);
          }
        } catch (e) {
          console.error("Gagal menghubungi /api/complete:", e);
        }
      },

      onCancel: function(paymentId) {
        console.log("Pembayaran dibatalkan oleh pengguna.");
      },

      onError: function(error, payment) {
        console.error("Terjadi kesalahan pada transaksi:", error);
        alert("Error transaksi: " + (error.message || "Gagal memproses pembayaran"));
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("Gagal membuat transaksi:", err);
    alert("Gagal memicu pembayaran: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  authenticateUser();

  const btnSewa = document.getElementById("btn-sewa-galeri");
  if (btnSewa) {
    btnSewa.addEventListener("click", () => {
      processMetaversePayment(10, "G_WALLET_KREATOR_SAMPLE", "Galeri Wayang 3D");
    });
  }
});
