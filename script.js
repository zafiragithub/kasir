// --- STATE APLIKASI ---
const NAMA_TOKO = "TOKO SEMBAKO MAKMUR"; // <-- Bos tinggal ganti nama toko di sini kapan saja
let daftarProduk = [];
let keranjang = [];
let totalBelanja = 0;

// Elemen DOM
const productGrid = document.getElementById('product-grid');
const loadingText = document.getElementById('loading-text');
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceEl = document.getElementById('total-price');
const btnCheckout = document.getElementById('btn-checkout');
const searchInput = document.getElementById('cari-produk');

// Elemen Kasir & Modal
const namaInput = document.getElementById('nama-pembeli');
const bayarInput = document.getElementById('uang-bayar');
const kembaliEl = document.getElementById('uang-kembali');

const modal = document.getElementById('struk-modal');
const strukPreview = document.getElementById('struk-preview');
let dataStrukAktif = null;

// --- 1. AMBIL DATA PRODUK ---
async function fetchProduk() {
    try {
        const response = await fetch('/api');
        const result = await response.json();
        if (result.status === 'success') {
            daftarProduk = result.data;
            renderProduk();
        }
    } catch (error) {
        loadingText.innerText = "Gagal memuat produk. Cek koneksi Anda.";
    }
}

// --- 1. FUNGSI RENDER PRODUK (DIPERBARUI UNTUK PENCARIAN) ---
function renderProduk(dataYangDirender = daftarProduk) {
    // Sembunyikan loading text jika masih muncul
    if (loadingText.style.display !== 'none') {
        loadingText.style.opacity = '0';
        setTimeout(() => loadingText.style.display = 'none', 300);
    }

    // Kosongkan grid sebelum diisi ulang (penting saat mencari)
    productGrid.innerHTML = '';

    // Jika produk tidak ditemukan
    if (dataYangDirender.length === 0) {
        productGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #6b7280; padding: 20px;">Produk tidak ditemukan.</p>';
        return;
    }

    dataYangDirender.forEach((produk, index) => {
        const card = document.createElement('div');
        card.className = 'product-card smooth-transition';
        
        // Trik agar animasi masuk tidak terlalu lama jika produk ada ribuan (di-loop setiap 20 item)
        card.style.animationDelay = `${(index % 20) * 0.03}s`; 
        
        card.innerHTML = `
            <h3 style="margin-bottom: 8px;">${produk.nama_produk}</h3>
            <p style="color: #6b7280; font-size: 14px;">Rp ${produk.harga.toLocaleString('id-ID')}</p>
        `;
        card.addEventListener('click', () => tambahKeKeranjang(produk));
        productGrid.appendChild(card);
    });
}

// --- FITUR PENCARIAN REAL-TIME ---
searchInput.addEventListener('input', (e) => {
    const kataKunci = e.target.value.toLowerCase();
    
    // Filter produk yang namanya mengandung huruf yang diketik
    const produkHasilFilter = daftarProduk.filter(produk => 
        produk.nama_produk.toLowerCase().includes(kataKunci)
    );
    
    // Render ulang dengan data hasil saringan
    renderProduk(produkHasilFilter);
});
// --- 2. LOGIKA KERANJANG & EDIT PESANAN ---
function tambahKeKeranjang(produk) {
    const itemAda = keranjang.find(item => item.id_produk === produk.id_produk);
    if (itemAda) { itemAda.qty += 1; } 
    else { keranjang.push({ ...produk, qty: 1 }); }
    renderKeranjang();
}

// Fungsi edit kuantitas terhubung ke window agar bisa dipanggil di HTML string
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
    cartItemsContainer.innerHTML = '';
    totalBelanja = 0;

    if (keranjang.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Keranjang masih kosong</p>';
    } else {
        keranjang.forEach((item, index) => {
            totalBelanja += (item.harga * item.qty);
            const div = document.createElement('div');
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px dashed #e5e7eb';
            
            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; font-weight: 600;">
                    <span>${item.nama_produk}</span>
                    <span>Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
                    <div class="qty-control">
                        <button class="qty-btn smooth-transition" onclick="ubahQty(${index}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn smooth-transition" onclick="ubahQty(${index}, 1)">+</button>
                    </div>
                    <button class="btn-hapus smooth-transition" onclick="hapusItem(${index})">Hapus</button>
                </div>
            `;
            cartItemsContainer.appendChild(div);
        });
    }
    totalPriceEl.innerText = `Rp ${totalBelanja.toLocaleString('id-ID')}`;
    hitungKembalian(); // Kalkulasi ulang kembalian jika pesanan diedit
}

// --- 3. KALKULATOR KEMBALIAN ---
function hitungKembalian() {
    const bayar = parseInt(bayarInput.value) || 0;
    const kembalian = bayar - totalBelanja;
    
    if (kembalian >= 0 && totalBelanja > 0) {
        kembaliEl.innerText = `Rp ${kembalian.toLocaleString('id-ID')}`;
        kembaliEl.style.color = '#10b981';
    } else {
        kembaliEl.innerText = `Rp 0`;
        kembaliEl.style.color = '#ef4444';
    }
}
bayarInput.addEventListener('input', hitungKembalian);

// --- 4. CHECKOUT (ANTI PENDING) ---
btnCheckout.addEventListener('click', async () => {
    const bayar = parseInt(bayarInput.value) || 0;
    const kembalian = bayar - totalBelanja;

    if (keranjang.length === 0) return alert("Keranjang kosong, Bos!");
    if (!namaInput.value) return alert("Isi Nama / No. Meja dulu!");
    if (bayar < totalBelanja) return alert("Uang bayar kurang!");

    // Mengunci state agar transaksi tidak menggantung
    btnCheckout.disabled = true;
    btnCheckout.innerText = "Memproses...";
    btnCheckout.style.backgroundColor = "#9ca3af";

    const dataTransaksi = {
        id_transaksi: "TRX-" + Date.now(),
        nama_meja: namaInput.value,
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
            tampilkanModalStruk(dataTransaksi); // Panggil pop-up
            
            // Reset antarmuka
            keranjang = [];
            namaInput.value = '';
            bayarInput.value = '';
            renderKeranjang();
        }
    } catch (error) {
        alert("Gagal memproses transaksi. Cek koneksi.");
    } finally {
        btnCheckout.disabled = false;
        btnCheckout.innerText = "Lanjutkan Pembayaran";
        btnCheckout.style.backgroundColor = "#2563eb";
    }
});

// --- 5. MODAL STRUK & CETAK ---
function tampilkanModalStruk(dataTrans) {
    dataStrukAktif = dataTrans;
    
    // Menyusun tampilan struk
    let htmlStruk = `
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px;">
           <h3 style="margin:0;">==== ${NAMA_TOKO} ====</h3>
            <p style="margin:4px 0 0 0; font-size: 12px;">ID: ${dataTrans.id_transaksi}</p>
            <p style="margin:0; font-size: 12px;">Pelanggan/Meja: <b>${dataTrans.nama_meja}</b></p>
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
    
    // Efek smooth munculnya pop-up
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

// Tombol Tutup
document.getElementById('btn-tutup-modal').addEventListener('click', () => {
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 300);
});

// Tombol Download PDF / Print Bawaan
document.getElementById('btn-download-pdf').addEventListener('click', () => {
    window.print(); // Memanggil dialog print browser (bisa "Save as PDF")
});

// Tombol Cetak Thermal (Web Serial API)
document.getElementById('btn-print-thermal').addEventListener('click', async () => {
    if (!dataStrukAktif) return;
    
    try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        
        let strukText = `==== ${NAMA_TOKO} ====\n`;
        strukText += `ID: ${dataStrukAktif.id_transaksi}\n`;
        strukText += `Meja: ${dataStrukAktif.nama_meja}\n`;
        strukText += "------------------\n";
        
        JSON.parse(dataStrukAktif.daftar_pesanan).forEach(item => {
            strukText += `${item.nama_produk}\n`;
            strukText += `${item.qty} x ${item.harga} = ${item.harga * item.qty}\n`;
        });
        
        strukText += "------------------\n";
        strukText += `TOTAL: Rp ${dataStrukAktif.total_harga}\n`;
        strukText += `BAYAR: Rp ${dataStrukAktif.uang_bayar}\n`;
        strukText += `KEMBALI: Rp ${dataStrukAktif.uang_kembali}\n`;
        strukText += "Terima Kasih!\n\n\n";

        const encoder = new TextEncoder();
        await writer.write(encoder.encode(strukText));
        
        // Perintah potong kertas
        await writer.write(new Uint8Array([0x1D, 0x56, 0x00]));
        writer.releaseLock();
        await port.close();

    } catch (error) {
        console.log("Cetak thermal dibatalkan atau gagal", error);
    }
});

// Jalankan saat pertama dibuka
fetchProduk();
