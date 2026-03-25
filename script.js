// --- STATE APLIKASI ---
const NAMA_TOKO = "TOKO BOS"; 
let daftarProduk = [];
let keranjang = [];
let totalBelanja = 0;

// Elemen DOM Header & Panel
const tanggalHariIni = document.getElementById('tanggal-hari-ini');
const searchInput = document.getElementById('cari-produk');
const searchDropdown = document.getElementById('search-dropdown');
const cartTableBody = document.getElementById('cart-table-body');
const totalPriceBig = document.getElementById('total-price-big');

// Elemen Kasir & Pembayaran
const namaInput = document.getElementById('nama-pembeli');
const bayarInput = document.getElementById('uang-bayar');
const kembaliEl = document.getElementById('uang-kembali');
const btnCheckout = document.getElementById('btn-checkout');

// Elemen Modal Struk
const modal = document.getElementById('struk-modal');
const strukPreview = document.getElementById('struk-preview');
let dataStrukAktif = null;

// --- INISIALISASI TANGGAL ---
const hariIni = new Date();
tanggalHariIni.innerText = hariIni.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// --- 1. AMBIL DATA PRODUK (BACKGROUND) ---
async function fetchProduk() {
    try {
        searchInput.placeholder = "Memuat data dari server...";
        const response = await fetch('/api');
        const result = await response.json();
        if (result.status === 'success') {
            daftarProduk = result.data;
            searchInput.placeholder = "Ketik nama atau kode item (Scan Barcode)...";
            searchInput.focus(); // Langsung fokus ke pencarian saat web dibuka
        }
    } catch (error) {
        searchInput.placeholder = "Gagal memuat koneksi data.";
    }
}

// --- 2. PENCARIAN & DROPDOWN (SCANNER FRIENDLY) ---
searchInput.addEventListener('input', (e) => {
    const kataKunci = e.target.value.toLowerCase().trim();
    
    // Sembunyikan dropdown jika input kosong
    if (!kataKunci) {
        searchDropdown.style.display = 'none';
        return;
    }

    // Cari produk berdasarkan Nama atau ID/Kode
    const hasil = daftarProduk.filter(p => 
        p.nama_produk.toLowerCase().includes(kataKunci) || 
        p.id_produk.toLowerCase().includes(kataKunci)
    );

    searchDropdown.innerHTML = '';
    if (hasil.length === 0) {
        searchDropdown.innerHTML = '<div class="dropdown-item" style="color:#ef4444;">Produk tidak ditemukan</div>';
    } else {
        // Tampilkan maksimal 10 hasil agar rapi
        hasil.slice(0, 10).forEach(produk => {
            const div = document.createElement('div');
            div.className = 'dropdown-item smooth-transition';
            div.innerHTML = `<b>${produk.id_produk}</b> - ${produk.nama_produk} <span style="float:right; color:#ef4444; font-weight:bold;">Rp ${produk.harga.toLocaleString('id-ID')}</span>`;
            
            // Saat produk dipilih
            div.addEventListener('click', () => {
                tambahKeKeranjang(produk);
                searchInput.value = ''; // Kosongkan input
                searchDropdown.style.display = 'none'; // Tutup dropdown
                searchInput.focus(); // Kembalikan fokus untuk scan berikutnya
            });
            searchDropdown.appendChild(div);
        });
    }
    searchDropdown.style.display = 'block';
});

// Menutup dropdown jika kasir klik di luar area
document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
        searchDropdown.style.display = 'none';
    }
});

// --- 3. LOGIKA TABEL KERANJANG ---
function tambahKeKeranjang(produk) {
    const itemAda = keranjang.find(item => item.id_produk === produk.id_produk);
    if (itemAda) { itemAda.qty += 1; } 
    else { keranjang.push({ ...produk, qty: 1 }); }
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
            const subtotal = item.harga * item.qty;
            totalBelanja += subtotal;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align:center;">${index + 1}</td>
                <td>${item.id_produk}</td>
                <td style="font-weight:bold;">${item.nama_produk}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <button onclick="ubahQty(${index}, -1)" style="padding:2px 6px; cursor:pointer; border:1px solid #d1d5db;">-</button>
                        <span style="min-width:20px; text-align:center; font-weight:bold;">${item.qty}</span>
                        <button onclick="ubahQty(${index}, 1)" style="padding:2px 6px; cursor:pointer; border:1px solid #d1d5db;">+</button>
                    </div>
                </td>
                <td>${item.harga.toLocaleString('id-ID')}</td>
                <td>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:bold; color:#111827;">${subtotal.toLocaleString('id-ID')}</span>
                        <button onclick="hapusItem(${index})" title="Hapus" style="color:#ef4444; background:none; border:none; cursor:pointer; font-weight:bold; font-size:16px;">✖</button>
                    </div>
                </td>
            `;
            cartTableBody.appendChild(tr);
        });
    }
    totalPriceBig.innerText = `Rp. ${totalBelanja.toLocaleString('id-ID')}`;
    hitungKembalian();
}

// --- 4. KALKULATOR KEMBALIAN ---
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

// --- 5. CHECKOUT (ANTI PENDING) & SHORTCUT KEYBOARD ---
async function prosesPembayaran() {
    const bayar = parseInt(bayarInput.value) || 0;
    const kembalian = bayar - totalBelanja;

    if (keranjang.length === 0) return alert("Keranjang kosong!");
    if (totalBelanja > 0 && bayar < totalBelanja) return alert("Uang bayar kurang!");

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
        const response = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify(dataTransaksi)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Panggil pop-up jika elemen modal ada di HTML
            if (typeof tampilkanModalStruk === "function") {
                tampilkanModalStruk(dataTransaksi);
            }
            
            // Reset
            keranjang = [];
            namaInput.value = '';
            bayarInput.value = '';
            renderKeranjang();
            searchInput.focus(); // Kembalikan fokus ke pencarian untuk pelanggan berikutnya
        }
    } catch (error) {
        alert("Gagal memproses transaksi. Cek koneksi.");
    } finally {
        btnCheckout.disabled = false;
        btnCheckout.innerText = "BAYAR (F12)";
        btnCheckout.style.backgroundColor = "#ef4444";
    }
}

btnCheckout.addEventListener('click', prosesPembayaran);

// Shortcut Keyboard: F12 untuk Bayar
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') {
        e.preventDefault(); // Mencegah browser membuka developer tools
        prosesPembayaran();
    }
});

// --- 6. MODAL STRUK (Jika Modal HTML disisipkan) ---
function tampilkanModalStruk(dataTrans) {
    if(!modal) return;
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
        htmlStruk += `
            <tr><td colspan="2"><b>${item.nama_produk}</b></td></tr>
            <tr>
                <td>${item.qty} x ${item.harga.toLocaleString('id-ID')}</td>
                <td style="text-align: right;">${(item.harga * item.qty).toLocaleString('id-ID')}</td>
            </tr>
        `;
    });

    htmlStruk += `
        </table>
        <div style="border-top: 1px dashed #000; padding-top: 10px; font-size: 14px; font-weight: 600;">
            <div style="display:flex; justify-content:space-between;"><span>TOTAL:</span> <span>Rp ${dataTrans.total_harga.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight: normal;"><span>Tunai:</span> <span>Rp ${dataTrans.uang_bayar.toLocaleString('id-ID')}</span></div>
            <div style="display:flex; justify-content:space-between; font-weight: normal;"><span>Kembali:</span> <span>Rp ${dataTrans.uang_kembali.toLocaleString('id-ID')}</span></div>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px;">
            <p>Terima Kasih Atas Kunjungan Anda!</p>
        </div>
    `;

    strukPreview.innerHTML = htmlStruk;
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

if(document.getElementById('btn-tutup-modal')) {
    document.getElementById('btn-tutup-modal').addEventListener('click', () => {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 300);
    });
}
if(document.getElementById('btn-download-pdf')) {
    document.getElementById('btn-download-pdf').addEventListener('click', () => window.print());
}
if(document.getElementById('btn-print-thermal')) {
    document.getElementById('btn-print-thermal').addEventListener('click', async () => {
        if (!dataStrukAktif) return;
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            const writer = port.writable.getWriter();
            let strukText = `==== ${NAMA_TOKO} ====\nID: ${dataStrukAktif.id_transaksi}\nCustomer: ${dataStrukAktif.nama_meja}\n------------------\n`;
            JSON.parse(dataStrukAktif.daftar_pesanan).forEach(item => {
                strukText += `${item.nama_produk}\n${item.qty} x ${item.harga} = ${item.harga * item.qty}\n`;
            });
            strukText += `------------------\nTOTAL: Rp ${dataStrukAktif.total_harga}\nBAYAR: Rp ${dataStrukAktif.uang_bayar}\nKEMBALI: Rp ${dataStrukAktif.uang_kembali}\nTerima Kasih!\n\n\n`;
            const encoder = new TextEncoder();
            await writer.write(encoder.encode(strukText));
            await writer.write(new Uint8Array([0x1D, 0x56, 0x00]));
            writer.releaseLock();
            await port.close();
        } catch (error) { console.log("Cetak thermal dibatalkan", error); }
    });
}

// --- JALANKAN SAAT PERTAMA DIBUKA ---
fetchProduk();
