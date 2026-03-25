// --- STATE APLIKASI ---
const NAMA_TOKO = "TOKO BOS"; 
let daftarProduk = [];
let keranjang = [];
let totalBelanja = 0;

// Elemen DOM
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

const modal = document.getElementById('struk-modal');
const strukPreview = document.getElementById('struk-preview');
let dataStrukAktif = null;

// Tanggal Hari Ini
tanggalHariIni.innerText = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// --- 1. AMBIL DATA PRODUK ---
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
        searchInput.placeholder = "Koneksi data gagal. Refresh halaman.";
    }
}

// --- 2. PENCARIAN & DROPDOWN ---
searchInput.addEventListener('input', (e) => {
    const kataKunci = e.target.value.toLowerCase().trim();
    if (!kataKunci) { searchDropdown.style.display = 'none'; return; }

    const hasil = daftarProduk.filter(p => p.nama_produk.toLowerCase().includes(kataKunci) || p.id_produk.toLowerCase().includes(kataKunci));

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
    if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) searchDropdown.style.display = 'none';
});

// Update Customer Display
namaInput.addEventListener('input', (e) => {
    displayCustomer.innerText = e.target.value || "CASH / UMUM";
});

// --- 3. LOGIKA KERANJANG ---
function tambahKeKeranjang(produk) {
    const itemAda = keranjang.find(item => item.id_produk === produk.id_produk);
    if (itemAda) { itemAda.qty += 1; } else { keranjang.push({ ...produk, qty: 1 }); }
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
                    <button onclick="ubahQty(${index}, -1)" style="padding:2px 6px; cursor:pointer;">-</button>
                    <span style="display:inline-block; width:20px; text-align:center; font-weight:bold;">${item.qty}</span>
                    <button onclick="ubahQty(${index}, 1)" style="padding:2px 6px; cursor:pointer;">+</button>
                </td>
                <td>${item.harga.toLocaleString('id-ID')}</td>
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

// --- 5. CHECKOUT ---
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
        const response = await fetch('/api', { method: 'POST', body: JSON.stringify(dataTransaksi) });
        const result = await response.json();
        
        if (result.status === 'success') {
            tampilkanModalStruk(dataTransaksi); // PANGGIL MODAL SEKARANG
            resetTransaksi(); // Bersihkan background layar kasir
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

function resetTransaksi() {
    keranjang = [];
    namaInput.value = '';
    displayCustomer.innerText = 'CASH / UMUM';
    bayarInput.value = '';
    renderKeranjang();
    searchInput.focus();
}

// --- 6. FUNGSI TOMBOL TOOLBAR & SIDEBAR ---
document.getElementById('btn-new').addEventListener('click', () => {
    if(confirm("Buat transaksi baru dan hapus yang sekarang?")) resetTransaksi();
});

document.getElementById('btn-hapus-semua').addEventListener('click', () => {
    if(confirm("Kosongkan keranjang?")) { keranjang = []; renderKeranjang(); }
});

document.getElementById('btn-member').addEventListener('click', () => {
    let namaMember = prompt("Masukkan Nama Member:");
    if(namaMember) {
        namaInput.value = namaMember;
        displayCustomer.innerText = namaMember;
    }
});

// Fitur Placeholder (Segera Hadir)
const fiturBelumSiap = ['btn-open', 'btn-qty', 'btn-favorit', 'btn-harga', 'btn-disc', 'btn-cek-harga'];
fiturBelumSiap.forEach(id => {
    document.getElementById(id).addEventListener('click', () => alert("Fitur ini akan segera hadir pada pembaruan berikutnya, Bos!"));
});

// Shortcut Keyboard F11 dan F12
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12') { e.preventDefault(); prosesPembayaran(); }
    if (e.key === 'F11') { e.preventDefault(); resetTransaksi(); }
});

// --- 7. MODAL STRUK (DIPERBAIKI) ---
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
        htmlStruk += `<tr><td colspan="2"><b>${item.nama_produk}</b></td></tr>
            <tr><td>${item.qty} x ${item.harga.toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${(item.harga * item.qty).toLocaleString('id-ID')}</td></tr>`;
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

// Aksi Modal
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
            strukText += `${item.nama_produk}\n${item.qty} x ${item.harga} = ${item.harga * item.qty}\n`;
        });
        strukText += `------------------\nTOTAL: Rp ${dataStrukAktif.total_harga}\nBAYAR: Rp ${dataStrukAktif.uang_bayar}\nKEMBALI: Rp ${dataStrukAktif.uang_kembali}\nTerima Kasih!\n\n\n`;
        const encoder = new TextEncoder();
        await writer.write(encoder.encode(strukText));
        await writer.write(new Uint8Array([0x1D, 0x56, 0x00]));
        writer.releaseLock();
        await port.close();
    } catch (error) { console.log("Cetak dibatalkan", error); }
});

fetchProduk();
