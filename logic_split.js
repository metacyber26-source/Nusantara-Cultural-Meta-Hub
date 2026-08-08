// Inisialisasi Pi SDK
Pi.init({ version: "2.0", sandbox: true }); // Ubah sandbox ke false jika sudah Mainnet

// Fungsi Eksekusi Transaksi Otomatis
async function processMetaversePayment(amount, creatorWallet, assetName) {
  try {
    // Hitung Pembagian Profit
    const creatorShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.CREATOR_PERCENT;
    const orgShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.ORG_PERCENT;
    const devShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.DEV_PERCENT;

    console.log(`[System Split] Total: ${amount} Pi`);
    console.log(`-> Kreator (${assetName}): ${creatorShare} Pi`);
    console.log(`-> ICP2E Blitar Raya: ${orgShare} Pi`);
    console.log(`-> Server/Dev: ${devShare} Pi`);

    // Membuat Transaksi via Pi Payment SDK
    const payment = await Pi.createPayment({
      amount: amount,
      memo: `Sewa/Pembelian Aset: ${assetName} via Nusantara Meta-Hub`,
      metadata: { 
        asset: assetName,
        split: { creatorShare, orgShare, devShare }
      }
    }, {
      onReadyForServerApproval: function(paymentId) {
        console.log("Menunggu Verifikasi Transaksi ID:", paymentId);
      },
      onReadyForServerCompletion: function(paymentId, txid) {
        alert(`Transaksi Berhasil! Asset ${assetName} telah diaktifkan.`);
      },
      onCancel: function(paymentId) {
        console.log("Transaksi dibatalkan pengguna.");
      },
      onError: function(error, payment) {
        console.error("Gagal memproses transaksi Pi:", error);
      }
    });

  } catch (err) {
    alert("Gagal menghubungkan ke Pi Wallet: " + err.message);
  }
}
