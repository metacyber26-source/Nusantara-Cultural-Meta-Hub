// URL Domain Aktif Vercel Anda
const BASE_URL = "https://nusantara-cultural-meta-hub.vercel.app";

const SYSTEM_CONFIG = {
  REVENUE_SHARE: {
    CREATOR_PERCENT: 0.50,
    ORG_PERCENT: 0.30,
    DEV_PERCENT: 0.20
  }
};

let currentUser = null;
let isAuthenticating = false;

function updateStatus(text) {
  const statusEl = document.getElementById("app-status");
  if (statusEl) {
    statusEl.innerText = text;
  }
}

// Inisialisasi Pi Network SDK v2
function initPiSDK() {
  if (window.Pi) {
    try {
      Pi.init({ version: "2.0", sandbox: true });
      console.log("Pi SDK 2.0 Inisialisasi Berhasil");
      updateStatus("Pi SDK Siap. Siap bertransaksi.");
      authenticateUser();
    } catch (err) {
      console.error("Gagal Inisialisasi Pi SDK:", err);
      updateStatus("Gagal memuat Pi SDK.");
    }
  } else {
    console.warn("Pi SDK tidak terdeteksi. Buka melalui Pi Browser.");
    updateStatus("Buka aplikasi di dalam Pi Browser!");
  }
}

async function authenticateUser() {
  if (isAuthenticating || !window.Pi) return false;
  isAuthenticating = true;

  try {
    updateStatus("Mengarahkan Autentikasi...");
    const scopes = ['payments'];

    async function onIncompletePaymentFound(payment) {
      console.log("Menemukan transaksi gantung:", payment);
      if (payment && payment.identifier) {
        try {
          await fetch(`${BASE_URL}/api/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: payment.identifier,
              txid: (payment.transaction && payment.transaction.txid) ? payment.transaction.txid : "CANCELLED"
            })
          });
        } catch (e) {
          console.error("Error menghapus incomplete payment:", e);
        }
      }
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    updateStatus(`User: ${currentUser.username}`);
    console.log("Autentikasi Berhasil:", currentUser.username);
    isAuthenticating = false;
    return true;
  } catch (error) {
    console.error("Autentikasi Gagal:", error);
    updateStatus("Autentikasi Pi Gagal.");
    isAuthenticating = false;
    return false;
  }
}

async function processMetaversePayment(amount, creatorWallet, assetName) {
  const btnSewa = document.getElementById("btn-sewa-galeri");

  if (!window.Pi) {
    alert("Harap buka aplikasi ini langsung dari Pi Browser!");
    return;
  }

  if (!currentUser) {
    updateStatus("Mencoba login Pi...");
    const ok = await authenticateUser();
    if (!ok) {
      alert("Autentikasi Pi gagal. Pastikan Anda berada di Pi Browser.");
      return;
    }
  }

  try {
    if (btnSewa) btnSewa.disabled = true;
    updateStatus("Membuka Pop-up Pi Wallet...");

    const creatorShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.CREATOR_PERCENT;
    const orgShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.ORG_PERCENT;
    const devShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.DEV_PERCENT;

    const paymentData = {
      amount: Number(amount),
      memo: `Sewa: ${assetName}`,
      metadata: {
        asset: assetName,
        split: { creator: creatorShare, org: orgShare, dev: devShare }
      }
    };

    const callbacks = {
      onReadyForServerApproval: function(paymentId) {
        console.log("onReadyForServerApproval Payment ID:", paymentId);
        updateStatus("Memproses Persetujuan Server...");

        return fetch(`${BASE_URL}/api/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ paymentId: paymentId })
        })
        .then(res => {
          if (!res.ok) throw new Error("Approval backend ditolak");
          return res.json();
        })
        .then(data => {
          console.log("Approval sukses:", data);
          updateStatus("Persetujuan Berhasil. Konfirmasi di Wallet...");
        })
        .catch(err => {
          console.error("Approval Error:", err);
          updateStatus("Gagal Persetujuan Server!");
        });
      },

      onReadyForServerCompletion: function(paymentId, txid) {
        console.log("onReadyForServerCompletion ID:", paymentId, "TXID:", txid);
        updateStatus("Menyelesaikan Transaksi...");

        return fetch(`${BASE_URL}/api/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ paymentId: paymentId, txid: txid })
        })
        .then(res => res.json())
        .then(data => {
          updateStatus("Sewa Berhasil!");
          alert(`Transaksi Sukses! ${assetName} berhasil disewa.`);
        })
        .catch(err => {
          console.error("Completion Error:", err);
          updateStatus("Gagal Penyelesaian Transaksi!");
        })
        .finally(() => {
          if (btnSewa) btnSewa.disabled = false;
        });
      },

      onCancel: function(paymentId) {
        console.log("Pembayaran dibatalkan ID:", paymentId);
        updateStatus("Transaksi Dibatalkan.");
        if (btnSewa) btnSewa.disabled = false;
      },

      onError: function(error, payment) {
        console.error("Pi Payment Error:", error, payment);
        updateStatus("Eror Transaksi!");
        alert("Gagal memproses pembayaran: " + (error.message || "Timeout"));
        if (btnSewa) btnSewa.disabled = false;
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment Exception:", err);
    alert("Gagal memicu pembayaran: " + err.message);
    if (btnSewa) btnSewa.disabled = false;
    updateStatus("Siap bertransaksi.");
  }
}

// Inisialisasi Event Listener Tombol
document.addEventListener("DOMContentLoaded", () => {
  // Jalankan inisialisasi SDK
  setTimeout(initPiSDK, 500);

  const btnSewa = document.getElementById("btn-sewa-galeri");
  if (btnSewa) {
    const handleAction = (e) => {
      e.preventDefault();
      e.stopPropagation();
      processMetaversePayment(10, "G_WALLET_KREATOR_SAMPLE", "Galeri Wayang 3D");
    };

    // Mendukung klik maupun sentuhan layar HP
    btnSewa.addEventListener("click", handleAction);
  }
});
