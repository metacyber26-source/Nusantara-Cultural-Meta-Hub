 // Konfigurasi Sistem Bagi Hasil (50% Peserta, 30% Organisasi, 20% Developer)
const SYSTEM_CONFIG = {
  REVENUE_SHARE: {
    CREATOR_PERCENT: 0.50,
    ORG_PERCENT: 0.30,
    DEV_PERCENT: 0.20
  }
};

// Inisialisasi Pi SDK Testnet / Sandbox
Pi.init({ version: "2.0", sandbox: true });

let currentUser = null;

// Fungsi Autentikasi Pengguna & Penanganan Pembayaran Gantung
async function authenticateUser() {
  try {
    const scopes = ['payments'];

    async function onIncompletePaymentFound(payment) {
      console.log("Incomplete payment found:", payment);
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
          console.log("Incomplete payment completed successfully.");
        } catch (err) {
          console.error("Failed to complete incomplete payment:", err);
        }
      }
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    console.log("Authenticated User:", currentUser.username);
    return true;
  } catch (error) {
    console.error("Authentication Error:", error);
    return false;
  }
}

// Fungsi Eksekusi Transaksi Pi
async function processMetaversePayment(amount, creatorWallet, assetName) {
  if (!currentUser) {
    const authenticated = await authenticateUser();
    if (!authenticated) {
      alert("Gagal melakukan autentikasi dengan Pi Network.");
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
        split: {
          creator: creatorShare,
          org: orgShare,
          dev: devShare
        }
      }
    };

    const callbacks = {
      onReadyForServerApproval: async function(paymentId) {
        console.log("onReadyForServerApproval triggered for paymentId:", paymentId);
        try {
          const res = await fetch('/api/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId })
          });
          
          if (!res.ok) {
            const errData = await res.json();
            console.error("Approval server error:", errData);
          } else {
            console.log("Approval successful from backend.");
          }
        } catch (e) {
          console.error("Approval fetch failed:", e);
        }
      },

      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("onReadyForServerCompletion triggered for paymentId:", paymentId, "txid:", txid);
        try {
          const res = await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId, txid: txid })
          });

          if (res.ok) {
            alert(`Transaksi Berhasil! Pembayaran untuk ${assetName} selesai.`);
          } else {
            console.error("Completion server error:", await res.json());
            alert("Transaksi berhasil di blockchain, namun gagal mencatat status akhir.");
          }
        } catch (e) {
          console.error("Completion fetch failed:", e);
        }
      },

      onCancel: function(paymentId) {
        console.log("Payment canceled by user. PaymentId:", paymentId);
      },

      onError: function(error, payment) {
        console.error("Payment error:", error, payment);
        alert("Terjadi kesalahan pada pembayaran: " + (error.message || "Unknown error"));
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment error:", err);
    alert("Gagal membuat pembayaran: " + err.message);
  }
}

// Inisialisasi otomatis saat dokumen selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  authenticateUser();

  // Event listener tombol Sewa Galeri
  const btnSewa = document.querySelector(".btn-sewa") || document.querySelector("button");
  if (btnSewa) {
    btnSewa.addEventListener("click", () => {
      processMetaversePayment(10, "creator_wallet_address", "Galeri & Lahan Budaya Virtual");
    });
  }
});
