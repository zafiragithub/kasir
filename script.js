// ==========================================
// --- STATE APLIKASI & ELEMEN DOM UTAMA ---
// ==========================================
const NAMA_TOKO = "TOKO BOS"; 
let daftarProduk = [];
let keranjang = [];
let totalBelanja = 0;

const tanggalHariIni = document.getElementById('tanggal-hari-ini');
const displayCustomer = document.getElementById('display-customer');
const searchInput = document.getElementById('cari-produk');
const searchDropdown = document.getElementById('search-dropdown');
const cartTableBody = document.getElementById('cart-table-body');
const totalPriceBig = document.getElementById('total-price-big');

const namaInput = document.getElementById('nama-pembeli');
const bayarInput = document.getElementById('uang-bayar');
const kembaliEl = document.getElementById('uang-kembali');
const btnCheckout = document.getElementById('btn-checkout');

const modalProduk = document.getElementById('modal-tambah-produk');
const btnTambahProduk = document.getElementById('btn-tambah-produk');
const btnSimpanProduk = document.getElementById('btn-simpan-produk');

const modal = document.getElementById('struk-modal');
const strukPreview = document.getElementById('struk-preview');
let dataStrukAktif = null;

tanggalHariIni.innerText = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });


// ==========================================
// --- FUNGSI TOAST NOTIFICATION ---
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.className = `toast-msg toast-${type}`;
    toast.innerHTML = `<span style="margin-right: 10px; font-size: 18px;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => { if(toast.parentElement) toast.remove(); }, 3000);
}

// ==========================================
// --- FUNGSI CUSTOM MODAL (GANTI PROMPT/CONFIRM) ---
// ==========================================
const customModal = document.getElementById('custom-modal');
const customModalTitle = document.getElementById('custom-modal-title');
const customModalInput = document.getElementById('custom-modal-input');
const customInputWrapper = document.getElementById('custom-input-wrapper');
const btnScanCustom = document.getElementById('btn-scan-custom');
const btnCustomOk = document.getElementById('btn-custom-ok');
const btnCustomCancel = document.getElementById('btn-custom-cancel');
let customModalCallback = null;

function showConfirm(message, callback) {
    customModalTitle.innerText = message;
    customInputWrapper.style.display = 'none';
    customModalCallback = callback;
    bukaCustomModal();
}

// PERBAIKAN: Parameter showCamera ditambahkan
function showPrompt(message, defaultValue, callback, showCamera = false) {
    customModalTitle.innerText = message;
    customInputWrapper.style.display = 'flex';
    customModalInput.value = defaultValue || '';
    
    // Tampilkan tombol kamera khusus menu Cek Harga
    btnScanCustom.style.display = showCamera ? 'block' : 'none';
    
    customModalCallback = callback;
    bukaCustomModal();
    setTimeout(() => { customModalInput.focus(); customModalInput.select(); }, 100);
}

function bukaCustomModal() {
    customModal.style.display = 'flex';
    setTimeout(() => customModal.style.opacity = '1', 10);
}

function tutupCustomModal() {
    customModal.style.opacity = '0';
    setTimeout(() => customModal.style.display = 'none', 300);
}

btnCustomCancel.addEventListener('click', () => {
    tutupCustomModal();
    if (customModalCallback) customModalCallback(null);
});

btnCustomOk.addEventListener('click', () => {
    tutupCustomModal();
    let result = customInputWrapper.style.display === 'flex' ? customModalInput.value : true;
    if (customModalCallback) customModalCallback(result);
});

customModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); btnCustomOk.click(); }
});


// ==========================================
// --- 1. AMBIL DATA PRODUK DARI SERVER ---
// ==========================================
async function fetchProduk() {
    try {
        searchInput.placeholder = "Memuat data dari server...";
        const response = await fetch('/api');
        const result = await response.json();
        if (result.status === 'success') {
            daftarProduk = result.data;
            searchInput.placeholder = "Ketik nama atau kode item (Scan Barcode)...";
            searchInput.focus();
        }
    } catch (error) {
        showToast("Koneksi data gagal. Refresh halaman.", "error");
        searchInput.placeholder = "Koneksi data gagal.";
    }
}


// ==========================================
// --- 2. PENCARIAN & DROPDOWN (KASIR) ---
// ==========================================
searchInput.addEventListener('input', (e) => {
    const kataKunci = e.target.value.toLowerCase().trim();
    if (!kataKunci) { searchDropdown.style.display = 'none'; return; }

    const hasil = daftarProduk.filter(p => 
        String(p.nama_produk).toLowerCase().includes(kataKunci) || 
        String(p.id_produk).toLowerCase().includes(kataKunci)
    );

    searchDropdown.innerHTML = '';
    if (hasil.length === 0) {
        searchDropdown.innerHTML = '<div class="dropdown-item" style="color:#ef4444;">Tidak ditemukan</div>';
    } else {
        hasil.slice(0, 10).forEach(produk => {
            const div = document.createElement('div');
            div.className = 'dropdown-item smooth-transition';
            div.innerHTML = `<b>${produk.id_produk}</b> - ${produk.nama_produk} <span style="float:right; color:#ef4444;">Rp ${produk.harga.toLocaleString('id-ID')}</span>`;
            
            div.addEventListener('click', () => {
                tambahKeKeranjang(produk);
                searchInput.value = ''; 
                searchDropdown.style.display = 'none';
                searchInput.focus(); 
            });
            searchDropdown.appendChild(div);
        });
    }
    searchDropdown.style.display = 'block';
});

document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
    }
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const kataKunci = e.target.value.toLowerCase().trim();
        if (!kataKunci) return;

        const cari = daftarProduk.find(p => String(p.id_produk).toLowerCase() === kataKunci);

        if (cari) {
            tambahKeKeranjang(cari);
            searchInput.value = ''; 
            searchDropdown.style.display = 'none';
        } else {
            showToast("Produk tidak ditemukan di database!", "error");
        }
    }
});


// ==========================================
// --- 3. LOGIKA KERANJANG BELANJA ---
// ==========================================
function tambahKeKeranjang(produk) {
    const itemAda = keranjang.find(item => item.id_produk === produk.id_produk);
    if (itemAda) { 
        itemAda.qty += 1; 
    } else { 
        keranjang.push({ ...produk, qty: 1, diskon: 0 }); 
    }
    renderKeranjang();
}

window.ubahQty = function(index, delta) {
    keranjang[index].qty += delta;
    if (keranjang[index].qty <= 0) keranjang.splice(index, 1);
    renderKeranjang();
};

window.hapusItem = function(index) {
    keranjang.splice(index, 1);
    renderKeranjang();
};

function renderKeranjang() {
    cartTableBody.innerHTML = '';
    totalBelanja = 0;

    if (keranjang.length === 0) {
        cartTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">Belum ada item ditambahkan</td></tr>';
    } else {
        keranjang.forEach((item, index) => {
            let diskonPerItem = item.diskon || 0;
            let hargaSetelahDiskon = item.harga - diskonPerItem;
            const subtotal = hargaSetelahDiskon * item.qty;
            totalBelanja += subtotal;
            
            let labelDiskon = diskonPerItem > 0 ? `<br><small style="color:#ef4444; font-weight:normal;">Disc: -Rp ${diskonPerItem.toLocaleString('id-ID')}</small>` : '';
            let hargaCoret = diskonPerItem > 0 ? `<del style="color:#9ca3af; font-size:12px;">${item.harga.toLocaleString('id-ID')}</del><br>` : '';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:center;">${index + 1}</td>
                <td>${item.id_produk}</td>
                <td style="font-weight:bold;">${item.nama_produk}${labelDiskon}</td>
                <td>
                    <button onclick="ubahQty(${index}, -1)" style="padding:2px 6px; cursor:pointer;">-</button>
                    <span style="display:inline-block; width:20px; text-align:center; font-weight:bold;">${item.qty}</span>
                    <button onclick="ubahQty(${index}, 1)" style="padding:2px 6px; cursor:pointer;">+</button>
                </td>
                <td>${hargaCoret}${hargaSetelahDiskon.toLocaleString('id-ID')}</td>
                <td>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold;">${subtotal.toLocaleString('id-ID')}</span>
                        <button onclick="hapusItem(${index})" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:16px;">✖</button>
                    </div>
                </td>
            `;
            cartTableBody.appendChild(tr);
        });
    }
    totalPriceBig.innerText = `Rp. ${totalBelanja.toLocaleString('id-ID')}`;
    hitungKembalian();
}


// ==========================================
// --- 4. KALKULATOR KEMBALIAN ---
// ==========================================
function hitungKembalian() {
    const bayar = parseInt(bayarInput.value) || 0;
    const kembalian = bayar - totalBelanja;
    if (kembalian >= 0 && totalBelanja > 0) {
        kembaliEl.innerText = `Rp. ${kembalian.toLocaleString('id-ID')}`;
        kembaliEl.style.color = '#10b981';
    } else {
        kembaliEl.innerText = `Rp. 0`;
        kembaliEl.style.color = '#ef4444';
    }
}
bayarInput.addEventListener('input', hitungKembalian);

namaInput.addEventListener('input', (e) => {
    displayCustomer.innerText = e.target.value || "CASH / UMUM";
});


// ==========================================
// --- 5. CHECKOUT (TRANSAKSI KASIR) ---
// ==========================================
async function prosesPembayaran() {
    const bayar = parseInt(bayarInput.value) || 0;
    const kembalian = bayar - totalBelanja;

    if (keranjang.length === 0) return showToast("Keranjang masih kosong!", "error");
    if (totalBelanja > 0 && bayar < totalBelanja) return showToast("Uang bayar kurang!", "error");

    btnCheckout.disabled = true;
    btnCheckout.innerText = "MEMPROSES...";
    btnCheckout.style.backgroundColor = "#9ca3af";

    const dataTransaksi = {
        id_transaksi: "TRX-" + Date.now(),
        nama_meja: namaInput.value || "CASH / UMUM",
        daftar_pesanan: JSON.stringify(keranjang),
        total_harga: totalBelanja,
        uang_bayar: bayar,
        uang_kembali: kembalian,
        metode_pembayaran: "Tunai"
    };

    try {
        const response = await fetch('/api', { method: 'POST', body: JSON.stringify(dataTransaksi) });
        const result = await response.json();
        
        if (result.status === 'success') {
            tampilkanModalStruk(dataTransaksi); 
            showToast("Transaksi berhasil disimpan!", "success");
            resetTransaksi(); 
        }
    } catch (error) {
        showToast("Gagal memproses transaksi. Cek koneksi internet.", "error");
    } finally {
        btnCheckout.disabled = false;
        btnCheckout.innerText = "BAYAR (F12)";
        btnCheckout.style.backgroundColor = "#ef4444";
    }
}

btnCheckout.addEventListener('click', prosesPembayaran);

function resetTransaksi() {
    keranjang = [];
    namaInput.value = '';
    displayCustomer.innerText = 'CASH / UMUM';
    bayarInput.value = '';
    renderKeranjang();
    searchInput.focus();
}


// ==========================================
// --- 6. FUNGSI TOMBOL TOOLBAR & SIDEBAR ---
// ==========================================
document.getElementById('btn-new').addEventListener('click', () => {
    if(keranjang.length > 0) {
        showConfirm("Simpan transaksi ini ke Draft dan buat baru?", (isYes) => {
            if(isYes) {
                localStorage.setItem('draft_kasir', JSON.stringify(keranjang));
                showToast("Transaksi disimpan ke Draft", "info");
                resetTransaksi();
            }
        });
    } else { resetTransaksi(); }
});

document.getElementById('btn-open').addEventListener('click', () => {
    let draft = localStorage.getItem('draft_kasir');
    if(draft) {
        keranjang = JSON.parse(draft);
        renderKeranjang();
        showToast("Draft berhasil dimuat!", "success");
    } else { 
        showToast("Tidak ada draft tersimpan.", "info"); 
    }
});

document.getElementById('btn-hapus-semua').addEventListener('click', () => {
    if(keranjang.length === 0) return showToast("Keranjang sudah kosong", "info");
    showConfirm("Yakin ingin mengosongkan semua keranjang?", (isYes) => {
        if(isYes) { 
            keranjang = []; 
            renderKeranjang(); 
            showToast("Keranjang dibersihkan", "success");
        }
    });
});

document.getElementById('btn-member').addEventListener('click', () => {
    showPrompt("Masukkan Nama / Meja Member:", "", (namaMember) => {
        if(namaMember && namaMember.trim() !== '') {
            namaInput.value = namaMember;
            displayCustomer.innerText = namaMember;
            showToast(`Customer diatur ke: ${namaMember}`, "success");
        }
    });
});

document.getElementById('btn-qty').addEventListener('click', () => {
    if(keranjang.length === 0) return showToast("Keranjang kosong!", "error");
    let lastItem = keranjang[keranjang.length - 1];
    
    showPrompt(`Ubah jumlah pesanan untuk ${lastItem.nama_produk}:`, lastItem.qty, (newQty) => {
        if(newQty && !isNaN(newQty) && parseInt(newQty) > 0) {
            lastItem.qty = parseInt(newQty);
            renderKeranjang();
            showToast("Jumlah diubah", "success");
        }
    });
});

document.getElementById('btn-harga').addEventListener('click', () => {
    if(keranjang.length === 0) return showToast("Keranjang kosong!", "error");
    let lastItem = keranjang[keranjang.length - 1];
    
    showPrompt(`Ubah override harga untuk ${lastItem.nama_produk} (Harga Asli: Rp ${lastItem.harga}):`, lastItem.harga, (newHarga) => {
        let hrgVal = parseInt(newHarga);
        if(!isNaN(hrgVal) && hrgVal >= 0) {
            lastItem.harga = hrgVal; 
            lastItem.diskon = 0; 
            renderKeranjang();
            showToast("Harga berhasil diubah", "success");
        }
    });
});

document.getElementById('btn-disc').addEventListener('click', () => {
    if(keranjang.length === 0) return showToast("Keranjang kosong!", "error");
    let lastItem = keranjang[keranjang.length - 1];
    
    showPrompt(`Masukkan Diskon (Rp) PER ITEM untuk ${lastItem.nama_produk}:`, lastItem.diskon || 0, (disc) => {
        let discVal = parseInt(disc);
        if(!isNaN(discVal) && discVal >= 0 && discVal <= lastItem.harga) {
            lastItem.diskon = discVal; 
            renderKeranjang();
            showToast("Diskon diterapkan", "success");
        }
    });
});

// PERBAIKAN: Fitur Cek Harga sekarang diaktifkan dengan TRUE agar tombol kamera menyala
document.getElementById('btn-cek-harga').addEventListener('click', () => {
    showPrompt("Arahkan barcode ke kamera atau ketik manual:", "", (kode) => {
        if(kode && kode.trim() !== '') {
            let cari = daftarProduk.find(p => String(p.nama_produk).toLowerCase().includes(kode.toLowerCase()) || String(p.id_produk).toLowerCase() === kode.toLowerCase());
            if(cari) {
                showToast(`INFO HARGA: ${cari.nama_produk} - Rp ${cari.harga.toLocaleString('id-ID')}`, "success");
            } else {
                showToast("Produk tidak ditemukan di database.", "error");
            }
        }
    }, true); 
});

document.getElementById('btn-favorit').addEventListener('click', () => showToast("Fitur Favorit akan segera hadir!", "info"));


// ==========================================
// --- 7. LOGIKA TAMBAH PRODUK BARU ---
// ==========================================
btnTambahProduk.addEventListener('click', () => {
    modalProduk.style.display = 'flex';
    setTimeout(() => modalProduk.style.opacity = '1', 10);
    document.getElementById('new-id').focus();
});

document.getElementById('btn-batal-produk').addEventListener('click', () => {
    modalProduk.style.opacity = '0';
    setTimeout(() => {
        modalProduk.style.display = 'none';
        document.getElementById('new-id').value = '';
        document.getElementById('new-nama').value = '';
        document.getElementById('new-harga').value = '';
    }, 300);
});

btnSimpanProduk.addEventListener('click', async () => {
    const pId = document.getElementById('new-id').value;
    const pNama = document.getElementById('new-nama').value;
    const pKategori = document.getElementById('new-kategori').value;
    const pHarga = document.getElementById('new-harga').value;

    if(!pId || !pNama || !pHarga) return showToast("Lengkapi ID, Nama, dan Harga!", "error");

    btnSimpanProduk.disabled = true;
    btnSimpanProduk.innerText = "Menyimpan...";
    btnSimpanProduk.style.backgroundColor = "#9ca3af";

    const payloadProduk = {
        action: "tambah_produk",
        id_produk: pId,
        nama_produk: pNama,
        kategori: pKategori,
        harga: parseInt(pHarga),
        stok: 999 
    };

    try {
        const response = await fetch('/api', { method: 'POST', body: JSON.stringify(payloadProduk) });
        const result = await response.json();

        if (result.status === 'success') {
            showToast("Produk baru berhasil disimpan ke Server!", "success");
            document.getElementById('btn-batal-produk').click(); 
            fetchProduk(); 
        }
    } catch (error) {
        showToast("Gagal menyimpan produk. Cek koneksi internet.", "error");
    } finally {
        btnSimpanProduk.disabled = false;
        btnSimpanProduk.innerText = "💾 Simpan ke Database";
        btnSimpanProduk.style.backgroundColor = "#10b981";
    }
});


// ==========================================
// --- 8. MODAL STRUK & CETAK THERMAL ---
// ==========================================
function tampilkanModalStruk(dataTrans) {
    dataStrukAktif = dataTrans;
    let htmlStruk = `
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
            <h3 style="margin:0;">==== ${NAMA_TOKO} ====</h3>
            <p style="margin:4px 0 0 0; font-size: 12px;">ID: ${dataTrans.id_transaksi}</p>
            <p style="margin:0; font-size: 12px;">Customer: <b>${dataTrans.nama_meja}</b></p>
        </div>
        <table style="width: 100%; font-size: 14px; margin-bottom: 10px;">
    `;
    
    JSON.parse(dataTrans.daftar_pesanan).forEach(item => {
        let diskonPerItem = item.diskon || 0;
        let hargaSetelahDiskon = item.harga - diskonPerItem;
        let subtotal = hargaSetelahDiskon * item.qty;

        htmlStruk += `<tr><td colspan="2"><b>${item.nama_produk}</b></td></tr>`;
        
        if (diskonPerItem > 0) {
            htmlStruk += `<tr><td colspan="2" style="color:#ef4444; font-size: 12px; padding-left: 10px; font-style: italic;">Disc: -Rp ${diskonPerItem.toLocaleString('id-ID')} /item</td></tr>`;
        }

        htmlStruk += `<tr><td>${item.qty} x ${hargaSetelahDiskon.toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${subtotal.toLocaleString('id-ID')}</td></tr>`;
    });

    htmlStruk += `</table>
        <div style="border-top: 1px dashed #000; padding-top: 10px; font-size: 14px; font-weight: 600;">
            <div style="display:flex; justify-content:space-between;"><span>TOTAL:</span> <span>Rp ${dataTrans.total_harga.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight: normal;"><span>Tunai:</span> <span>Rp ${dataTrans.uang_bayar.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight: normal;"><span>Kembali:</span> <span>Rp ${dataTrans.uang_kembali.toLocaleString('id-ID')}</span></div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px;"><p>Terima Kasih!</p></div>`;

    strukPreview.innerHTML = htmlStruk;
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

document.getElementById('btn-tutup-modal').addEventListener('click', () => {
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 300);
});

document.getElementById('btn-download-pdf').addEventListener('click', () => window.print());

document.getElementById('btn-print-thermal').addEventListener('click', async () => {
    if (!dataStrukAktif) return;
    try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        
        let strukText = `==== ${NAMA_TOKO} ====\nID: ${dataStrukAktif.id_transaksi}\nCustomer: ${dataStrukAktif.nama_meja}\n------------------\n`;
        
        JSON.parse(dataStrukAktif.daftar_pesanan).forEach(item => {
            let diskonPerItem = item.diskon || 0;
            let hargaSetelahDiskon = item.harga - diskonPerItem;
            let subtotal = hargaSetelahDiskon * item.qty;

            strukText += `${item.nama_produk}\n`;
            if (diskonPerItem > 0) {
                strukText += `  (Disc per item: -${diskonPerItem})\n`;
            }
            strukText += `${item.qty} x ${hargaSetelahDiskon} = ${subtotal}\n`;
        });

        strukText += `------------------\nTOTAL: Rp ${dataStrukAktif.total_harga}\nBAYAR: Rp ${dataStrukAktif.uang_bayar}\nKEMBALI: Rp ${dataStrukAktif.uang_kembali}\nTerima Kasih!\n\n\n`;
        
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(strukText));
        await writer.write(new Uint8Array([0x1D, 0x56, 0x00]));
        writer.releaseLock();
        await port.close();
        showToast("Struk berhasil dicetak ke Printer Thermal!", "success");
    } catch (error) { 
        console.log("Cetak dibatalkan", error); 
        showToast("Pencetakan dibatalkan atau printer tidak siap.", "error");
    }
});


// ==========================================
// --- 9. FITUR SCANNER BARCODE KAMERA ---
// ==========================================
const scannerModal = document.getElementById('scanner-modal');
const btnScanKasir = document.getElementById('btn-scan-kasir');
const btnScanTambah = document.getElementById('btn-scan-tambah');
const btnTutupScanner = document.getElementById('btn-tutup-scanner');
let html5QrCode;
let targetInputScan = null;
let isProcessingScan = false;

function bukaScannerKamera(elemenTarget) {
    targetInputScan = elemenTarget; 
    isProcessingScan = false; 
    
    scannerModal.style.display = 'flex';
    setTimeout(() => scannerModal.style.opacity = '1', 10);

    html5QrCode = new Html5Qrcode("reader");
    
    const config = { fps: 20, qrbox: { width: 250, height: 100 } };
    
    const onScanSuccess = (decodedText, decodedResult) => {
        if (isProcessingScan) return; 
        isProcessingScan = true; 

        suaraBeep(); 
        
        if (targetInputScan.id === 'cari-produk') {
            const cari = daftarProduk.find(p => String(p.id_produk).toLowerCase() === String(decodedText).toLowerCase());
            
            if (cari) {
                tambahKeKeranjang(cari); 
                targetInputScan.value = ''; 
                if(searchDropdown) searchDropdown.style.display = 'none'; 
                showToast("Berhasil Scan: " + cari.nama_produk, "success");
            } else {
                showToast("Barcode " + decodedText + " tidak dikenali!", "error");
            }
        } else {
            targetInputScan.value = decodedText;
            
            // PERBAIKAN: Jika yang scan adalah modal Cek Harga, langsung proses Enter otomatis
            if (targetInputScan.id === 'custom-modal-input') {
                btnCustomOk.click(); 
            } else {
                showToast("Barcode berhasil dipindai!", "success");
            }
        }
        
        tutupScannerKamera();
    };

    const onScanError = (errorMessage) => { /* Abaikan error pencarian fokus */ };

    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanError)
    .catch((err) => {
        html5QrCode.start({ facingMode: "user" }, config, onScanSuccess, onScanError)
        .catch((err2) => {
            showToast("Akses kamera ditolak atau kamera tidak ditemukan.", "error");
            tutupScannerKamera();
        });
    });
}

function tutupScannerKamera() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            hilangkanModalScanner();
        }).catch(err => hilangkanModalScanner());
    } else { hilangkanModalScanner(); }
}

function hilangkanModalScanner() {
    scannerModal.style.opacity = '0';
    setTimeout(() => scannerModal.style.display = 'none', 300);
}

function suaraBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = 1000; 
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime); 
        osc.start();
        setTimeout(() => osc.stop(), 150); 
    } catch(e) { console.log("Audio tidak didukung"); }
}

// Pasang Event Listener Tombol Kamera
btnScanKasir.addEventListener('click', () => bukaScannerKamera(searchInput));

if (btnScanTambah) {
    btnScanTambah.addEventListener('click', () => bukaScannerKamera(document.getElementById('new-id')));
}

if (btnScanCustom) {
    btnScanCustom.addEventListener('click', () => bukaScannerKamera(customModalInput));
}

btnTutupScanner.addEventListener('click', tutupScannerKamera);

// Shortcut Keyboard Kasir (F11 = New, F12 = Bayar)
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') { e.preventDefault(); prosesPembayaran(); }
    if (e.key === 'F11') { e.preventDefault(); document.getElementById('btn-new').click(); }
});

// ==========================================
// --- JALANKAN SAAT PERTAMA DIBUKA ---
// ==========================================
fetchProduk();
