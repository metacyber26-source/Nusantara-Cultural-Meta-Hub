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
      console.log("Transaksi tertunda ditemukan:", payment);
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
          console.log("Transaksi tertunda berhasil diselesaikan.");
        } catch (err) {
          console.error("Gagal menyelesaikannya:", err);
        }
      }
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    console.log("Autentikasi Berhasil:", currentUser.username);
    return true;
  } catch (error) {
    console.error("Autentikasi Error:", error);
    return false;
  }
}

// Fungsi Eksekusi Transaksi Pi
async function processMetaversePayment(amount, creatorWallet, assetName) {
  if (!currentUser) {
    const authenticated = await authenticateUser();
    if (!authenticated) {
      alert("Gagal terhubung dengan akun Pi Network Anda.");
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
        console.log("Meminta approval ke backend untuk paymentId:", paymentId);
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
            console.log("Approval sukses.");
          }
        } catch (e) {
          console.error("Approval fetch error:", e);
        }
      },

      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("Meminta completion ke backend untuk paymentId:", paymentId, "txid:", txid);
        try {
          const res = await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId, txid: txid })
          });

          if (res.ok) {
            alert(`Transaksi Berhasil! Pembayaran ${assetName} selesai.`);
          } else {
            alert("Transaksi selesai di blockchain!");
          }
        } catch (e) {
          console.error("Completion fetch error:", e);
        }
      },

      onCancel: function(paymentId) {
        console.log("Pembayaran dibatalkan pengguna ID:", paymentId);
      },

      onError: function(error, payment) {
        console.error("Payment error:", error, payment);
        alert("Terjadi kesalahan: " + (error.message || "Unknown error"));
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment error:", err);
    alert("Gagal memproses transaksi: " + err.message);
  }
}

// Menghubungkan tombol secara eksklusif saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  authenticateUser();

  const btnSewa = document.getElementById("btn-sewa-galeri");
  if (btnSewa) {
    btnSewa.addEventListener("click", () => {
      processMetaversePayment(10, "G_WALLET_KREATOR_SAMPLE", "Galeri Wayang 3D");
    });
  }
});
