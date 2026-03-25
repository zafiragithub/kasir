export async function onRequest(context) {
  // Ganti dengan URL Web App Google Apps Script Bos
  const GAS_URL = "https://script.google.com/macros/s/AKfycbye1v3w0Kd5gcLAJ0bZ7JrLULS7KBqLgM6XVrJOn_AR844mLRi36hfvbEi77OQHmIKg/exec";
  
  const { request } = context;

  // Header CORS (Opsional jika dipanggil dari domain yang sama, tapi aman untuk disiapkan)
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // 1. Tangani Preflight Request
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2. Tarik Data Produk (GET)
    if (request.method === "GET") {
      const response = await fetch(GAS_URL);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    // 3. Kirim Data Transaksi Baru (POST)
    if (request.method === "POST") {
      const body = await request.text(); // Ambil data dari kasir
      const response = await fetch(GAS_URL, {
        method: "POST",
        body: body
      });
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ status: "error", message: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
}