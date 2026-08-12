const SYSTEM_CONFIG = {
  REVENUE_SHARE: {
    CREATOR_PERCENT: 0.50,
    ORG_PERCENT: 0.30,
    DEV_PERCENT: 0.20
  }
};

// Inisialisasi SDK Pi Sandbox
Pi.init({ version: "2.0", sandbox: true });

let currentUser = null;

async function authenticateUser() {
  try {
    const scopes = ['payments'];

    // Menangani transaksi gantung agar tidak mengunci pembayaran baru
    async function onIncompletePaymentFound(payment) {
      console.log("Incomplete payment ditemukan:", payment);
      if (payment.identifier) {
        try {
          await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentId: payment.identifier,
              txid: payment.transaction ? payment.transaction.txid : "CANCEL_OR_EXPIRED"
            })
          });
        } catch (err) {
          console.error("Gagal membersihkan incomplete payment:", err);
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
      alert("Autentikasi Pi Network gagal.");
      return;
    }
  }

  try {
    const creatorShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.CREATOR_PERCENT;
    const orgShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.ORG_PERCENT;
    const devShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.DEV_PERCENT;

    const paymentData = {
      amount: amount,
      memo: `Sewa: ${assetName}`,
      metadata: {
        asset: assetName,
        split: { creator: creatorShare, org: orgShare, dev: devShare }
      }
    };

    const callbacks = {
      onReadyForServerApproval: async function(paymentId) {
        console.log("Approval dipicu untuk paymentId:", paymentId);
        try {
          const response = await fetch('/api/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId })
          });

          if (!response.ok) {
            const errData = await response.json();
            console.error("Approval Backend Error:", errData);
          } else {
            console.log("Approval Backend Berhasil");
          }
        } catch (err) {
          console.error("Fetch Approval Error:", err);
        }
      },

      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("Completion dipicu untuk paymentId:", paymentId, "txid:", txid);
        try {
          const response = await fetch('/api/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId: paymentId, txid: txid })
          });

          if (response.ok) {
            alert(`Transaksi Berhasil! ${assetName} sukses disewa.`);
          }
        } catch (err) {
          console.error("Fetch Completion Error:", err);
        }
      },

      onCancel: function(paymentId) {
        console.log("Pembayaran dibatalkan oleh pengguna ID:", paymentId);
      },

      onError: function(error, payment) {
        console.error("Payment Error:", error, payment);
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment Error:", err);
    alert("Gagal memproses transaksi: " + err.message);
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
