/**
 * Cloudflare Worker — Lotería PR V4.0
 * V4.1 añadirá los adaptadores de fuentes verificadas.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json;charset=utf-8"
    }
  });
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json({
        ok: true,
        service: "loteria-pr-data-center",
        version: "4.0",
        timestamp: new Date().toISOString(),
        sourceConfigured: false
      });
    }

    if (url.pathname === "/api/results") {
      return json({
        ok: true,
        version: "4.0",
        generatedAt: new Date().toISOString(),
        sourceConfigured: false,
        results: [],
        message: "El Worker está activo. Los adaptadores de resultados se incorporarán en V4.1."
      });
    }

    return json({ ok: false, error: "Ruta no encontrada" }, 404);
  }
};
