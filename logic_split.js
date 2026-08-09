Pi.init({ version: "2.0", sandbox: true });

let currentUser = null;

async function authenticateUser() {
  try {
    const scopes = ['payments'];
    
    async function onIncompletePaymentFound(payment) {
      console.log("Mencoba menyelesaikan transaksi tertunda:", payment.identifier);
      if (payment.transaction) {
        await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: payment.identifier, txid: payment.transaction.txid })
        });
      }
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    return true;
  } catch (error) {
    console.error("Autentikasi gagal:", error);
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

    await Pi.createPayment({
      amount: amount,
      memo: `Sewa/Pembelian Aset: ${assetName} via Nusantara Meta-Hub`,
      metadata: { asset: assetName, split: { creatorShare, orgShare, devShare } }
    }, {
      onReadyForServerApproval: async function(paymentId) {
        console.log("Mengirim persetujuan ke server backend...");
        await fetch('/api/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId })
        });
      },
      onReadyForServerCompletion: async function(paymentId, txid) {
        console.log("Menyelesaikan transaksi di server backend...");
        await fetch('/api/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId, txid })
        });
        alert(`Transaksi Berhasil! Asset ${assetName} telah diaktifkan.`);
      },
      onCancel: function(paymentId) {
        console.log("Dibatalkan pengguna.");
      },
      onError: function(error) {
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
