const SYSTEM_CONFIG = {
  REVENUE_SHARE: {
    CREATOR_PERCENT: 0.50,
    ORG_PERCENT: 0.30,
    DEV_PERCENT: 0.20
  }
};

// Inisialisasi SDK Pi v2 Sandbox
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
      alert("Silakan buka aplikasi melalui Pi Browser untuk melanjutkan transaksi.");
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
        return fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: paymentId })
        })
        .then(res => {
          if (!res.ok) throw new Error("Server backend menolak persetujuan.");
          return res.json();
        })
        .then(data => console.log("Approval sukses:", data))
        .catch(err => console.error("Approval error:", err));
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
          alert(`Transaksi Sukses! ${assetName} berhasil disewa.`);
        })
        .catch(err => console.error("Completion error:", err));
      },

      onCancel: function(paymentId) {
        console.log("Transaksi dibatalkan pengguna ID:", paymentId);
      },

      onError: function(error, payment) {
        console.error("Payment error:", error, payment);
        alert("Transaksi gagal: " + (error.message || "Batas waktu persetujuan habis."));
      }
    };

    await Pi.createPayment(paymentData, callbacks);

  } catch (err) {
    console.error("CreatePayment error:", err);
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
