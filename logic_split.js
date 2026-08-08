// Inisialisasi Pi SDK
Pi.init({ version: "2.0", sandbox: true });

// Simpan data otentikasi user
let currentUser = null;

// Fungsi Autentikasi Pengguna + Minta Scope Payments
async function authenticateUser() {
  try {
    const scopes = ['payments']; // Wajib meminta scope 'payments'
    
    function onIncompletePaymentFound(payment) {
      console.log("Transaksi tertunda ditemukan:", payment);
      // Di sini bisa ditambahkan penanganan transaksi gantung jika ada
    }

    const auth = await Pi.authenticate(scopes, onIncompletePaymentFound);
    currentUser = auth.user;
    console.log("Autentikasi Berhasil! User:", currentUser.username);
    return true;
  } catch (error) {
    console.error("Gagal Autentikasi Pi:", error);
    alert("Gagal terhubung ke Pi Network: " + error.message);
    return false;
  }
}

// Fungsi Eksekusi Transaksi Otomatis
async function processMetaversePayment(amount, creatorWallet, assetName) {
  // Pastikan pengguna sudah di-autentikasi dan mendapat scope 'payments'
  if (!currentUser) {
    const authenticated = await authenticateUser();
    if (!authenticated) return;
  }

  try {
    // Hitung Pembagian Profit
    const creatorShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.CREATOR_PERCENT;
    const orgShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.ORG_PERCENT;
    const devShare = amount * SYSTEM_CONFIG.REVENUE_SHARE.DEV_PERCENT;

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
        alert("Terjadi kesalahan transaksi: " + error.message);
      }
    });

  } catch (err) {
    alert("Gagal memproses pembayaran: " + err.message);
  }
}

// Otomatis jalankan autentikasi saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  authenticateUser();
});
