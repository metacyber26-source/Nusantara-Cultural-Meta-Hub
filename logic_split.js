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

    async function onIncompletePaymentFound(payment) {
      console.log("Incomplete payment found:", payment);
      if (payment.transaction && payment.transaction.txid) {
        await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payment.identifier,
            txid: payment.transaction.txid
          })
        });
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

async function processMetaversePayment(amount, creatorWallet, assetName) {
  if (!currentUser) {
    const authenticated = await authenticateUser();
    if (!authenticated) {
      alert("Gagal melakukan autentikasi akun Pi.");
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
      onReadyForServerApproval: function(paymentId) {
        console.log("Mengirim persetujuan ke server untuk ID:", paymentId);
        // Mengembalikan promise langsung ke Pi SDK
        return fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: paymentId })
        })
        .then(res => res.json())
        .then(data => console.log("Approved oleh server:", data))
        .catch(err => console.error("Gagal Approve:", err));
      },

      onReadyForServerCompletion: function(paymentId, txid) {
        console.log("Menyelesaikan transaksi ID:", paymentId, "TXID:", txid);
        return fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: paymentId, txid: txid })
        })
        .then(res => res.json())
        .then(data => {
          console.log("Completed oleh server:", data);
          alert(`Transaksi Sukses! ${assetName} berhasil disewa.`);
        })
        .catch(err => console.error("Gagal Complete:", err));
      },

      onCancel: function(paymentId) {
        console.log("Transaksi dibatalkan pengguna ID:", paymentId);
      },

      onError: function(error, payment) {
        console.error("Payment error:", error, payment);
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment error:", err);
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
