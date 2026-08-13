const BASE_URL = "https://nusantara-cultural-meta-hub.vercel.app";

const SYSTEM_CONFIG = {
  REVENUE_SHARE: {
    CREATOR_PERCENT: 0.50,
    ORG_PERCENT: 0.30,
    DEV_PERCENT: 0.20
  }
};

// Inisialisasi Pi SDK v2 Sandbox
if (window.Pi) {
  Pi.init({ version: "2.0", sandbox: true });
}

let currentUser = null;

async function authenticateUser() {
  try {
    const scopes = ['payments'];

    async function onIncompletePaymentFound(payment) {
      console.log("Ditemukan pembayaran gantung:", payment);
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
          console.error("Gagal klirkan incomplete payment:", e);
        }
      }
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    console.log("Autentikasi Berhasil:", currentUser.username);
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
      alert("Silakan buka aplikasi dari dalam Pi Browser.");
      return;
    }
  }

  try {
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
        console.log("Approval dipicu untuk Payment ID:", paymentId);
        
        // Panggil backend Vercel menggunakan URL ABSOLUT LENGKAP
        return fetch(`${BASE_URL}/api/approve`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ paymentId: paymentId })
        })
        .then(res => {
          if (!res.ok) {
            throw new Error("Server menolak approval");
          }
          return res.json();
        })
        .then(data => {
          console.log("Approval server berhasil:", data);
        })
        .catch(err => {
          console.error("Approval Error:", err);
        });
      },

      onReadyForServerCompletion: function(paymentId, txid) {
        console.log("Completion dipicu untuk Payment ID:", paymentId, "TXID:", txid);
        
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
          alert(`Pembayaran Berhasil! ${assetName} sukses disewa.`);
        })
        .catch(err => {
          console.error("Completion Error:", err);
        });
      },

      onCancel: function(paymentId) {
        console.log("Pembayaran dibatalkan:", paymentId);
      },

      onError: function(error, payment) {
        console.error("Pi Payment Error:", error, payment);
        alert("Gagal memproses pembayaran: " + (error.message || "Timeout"));
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment Exception:", err);
    alert("Gagal memicu payment: " + err.message);
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
