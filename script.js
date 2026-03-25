// --- STATE APLIKASI ---
let daftarProduk = [];
let keranjang = [];

// Elemen DOM
const productGrid = document.getElementById('product-grid');
const loadingText = document.getElementById('loading-text');
const cartItemsContainer = document.getElementById('cart-items');
const totalPriceEl = document.getElementById('total-price');
const btnCheckout = document.getElementById('btn-checkout');

// --- FUNGSI 1: AMBIL DATA PRODUK (SMOOTH UI) ---
async function fetchProduk() {
    try {
        // Memanggil API Cloudflare Pages (berada di domain yang sama)
        const response = await fetch('/api');
        const result = await response.json();
        
        if (result.status === 'success') {
            daftarProduk = result.data;
            renderProduk();
        }
    } catch (error) {
        loadingText.innerText = "Gagal memuat produk. Cek koneksi Anda.";
        console.error(error);
    }
}

// Merender produk ke layar dengan transisi mulus
function renderProduk() {
    // Hilangkan teks loading dengan mulus
    loadingText.style.opacity = '0';
    setTimeout(() => {
        loadingText.style.display = 'none';
        
        // Buat kartu produk
        daftarProduk.forEach((produk, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            // Menambahkan delay sedikit untuk efek muncul bergantian (staggered)
            card.style.animationDelay = `${index * 0.05}s`; 
            
            card.innerHTML = `
                <h3 style="margin-bottom: 8px;">${produk.nama_produk}</h3>
                <p style="color: #6b7280; font-size: 14px;">Rp ${produk.harga.toLocaleString('id-ID')}</p>
            `;
            
            // Event klik untuk masuk keranjang
            card.addEventListener('click', () => tambahKeKeranjang(produk));
            productGrid.appendChild(card);
        });
    }, 300); // Waktu yang pas agar transisi terasa smooth
}

// --- FUNGSI 2: LOGIKA KERANJANG ---
function tambahKeKeranjang(produk) {
    const itemAda = keranjang.find(item => item.id_produk === produk.id_produk);
    
    if (itemAda) {
        itemAda.qty += 1;
    } else {
        keranjang.push({ ...produk, qty: 1 });
    }
    renderKeranjang();
}

function renderKeranjang() {
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (keranjang.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-msg" style="padding:10px;">Keranjang masih kosong</p>';
    } else {
        keranjang.forEach((item, index) => {
            total += (item.harga * item.qty);
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.padding = '10px 0';
            div.style.borderBottom = '1px dashed #e5e7eb';
            
            div.innerHTML = `
                <span>${item.nama_produk} (x${item.qty})</span>
                <span>Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</span>
            `;
            // Fitur hapus item jika di-klik
            div.addEventListener('click', () => hapusItem(index));
            cartItemsContainer.appendChild(div);
        });
    }
    totalPriceEl.innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

function hapusItem(index) {
    keranjang.splice(index, 1);
    renderKeranjang();
}

// --- FUNGSI 3: CHECKOUT & DATABASE (ANTI PENDING) ---
btnCheckout.addEventListener('click', async () => {
    if (keranjang.length === 0) {
        alert("Keranjang kosong, Bos!");
        return;
    }

    // 1. Kunci tombol dan atur initial state agar tidak ada double-click (mencegah data pending/nyangkut)
    btnCheckout.disabled = true;
    btnCheckout.innerText = "Memproses...";
    btnCheckout.style.backgroundColor = "#9ca3af";

    const totalBelanja = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    const dataTransaksi = {
        id_transaksi: "TRX-" + Date.now(),
        daftar_pesanan: JSON.stringify(keranjang),
        total_harga: totalBelanja,
        metode_pembayaran: "Tunai" // Bisa dikembangkan pakai dropdown nanti
    };

    try {
        // 2. Tembak data ke Cloudflare API -> Google Sheets
        const response = await fetch('/api', {
            method: 'POST',
            body: JSON.stringify(dataTransaksi)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // 3. Jika berhasil tercatat, langsung cetak struk!
            await cetakStruk(dataTransaksi.id_transaksi, totalBelanja);
            
            // 4. Reset antarmuka
            keranjang = [];
            renderKeranjang();
            alert("Transaksi Sukses & Struk Dicetak!");
        }
    } catch (error) {
        alert("Gagal memproses transaksi. Silakan coba lagi.");
        console.error(error);
    } finally {
        // 5. Kembalikan tombol ke state semula
        btnCheckout.disabled = false;
        btnCheckout.innerText = "Lanjutkan Pembayaran";
        btnCheckout.style.backgroundColor = "#2563eb";
    }
});

// --- FUNGSI 4: CETAK STRUK (WEB SERIAL API) ---
async function cetakStruk(idTrx, total) {
    try {
        // Meminta izin browser untuk terhubung ke printer thermal via USB (Serial)
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 }); // Sesuaikan baudRate dengan printer Bos (biasanya 9600 atau 115200)

        const writer = port.writable.getWriter();
        
        // Format teks struk (Bisa disesuaikan tata letaknya)
        let strukText = "==== TOKO BOS ====\n";
        strukText += `ID: ${idTrx}\n`;
        strukText += "------------------\n";
        
        keranjang.forEach(item => {
            strukText += `${item.nama_produk}\n`;
            strukText += `${item.qty} x ${item.harga} = ${item.harga * item.qty}\n`;
        });
        
        strukText += "------------------\n";
        strukText += `TOTAL: Rp ${total}\n`;
        strukText += "Terima Kasih!\n\n\n";

        // Konversi string ke format byte array (Uint8Array) yang dimengerti printer
        const encoder = new TextEncoder();
        const data = encoder.encode(strukText);
        
        // Kirim perintah cetak
        await writer.write(data);
        
        // Perintah ESC/POS untuk memotong kertas (Cut Paper)
        const cutCommand = new Uint8Array([0x1D, 0x56, 0x00]);
        await writer.write(cutCommand);

        // Tutup koneksi dengan aman
        writer.releaseLock();
        await port.close();

    } catch (error) {
        console.log("Printer tidak terhubung atau dibatalkan.", error);
        // Tetap biarkan transaksi sukses meski printer dibatalkan
    }
}

// --- INISIALISASI ---
// Jalankan fungsi ambil produk saat aplikasi pertama kali dibuka
fetchProduk();
