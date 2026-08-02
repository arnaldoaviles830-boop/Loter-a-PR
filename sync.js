/**
 * Cliente del Centro de Datos.
 * V4.0 incluye la interfaz programática; V4.1 conectará el panel visual.
 */
(() => {
  "use strict";

  const logKey = "loteria-pr-v4-sync-log";

  function getLog() {
    return window.LoteriaStorage?.readJson(logKey, []) || [];
  }

  function addLog(entry) {
    const log = getLog();
    log.unshift({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    window.LoteriaStorage?.writeJson(logKey, log.slice(0, 100));
    return log;
  }

  async function request(path = "/api/results") {
    const config = window.LoteriaConfig?.current;
    const base = String(config?.workerUrl || "").replace(/\/+$/, "");
    if (!base) {
      throw new Error("La URL del Cloudflare Worker todavía no está configurada.");
    }

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Number(config?.requestTimeoutMs || 12000)
    );

    try {
      const response = await fetch(`${base}${path}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error(`Servidor respondió ${response.status}`);
      }
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function health() {
    const started = performance.now();
    try {
      const data = await request("/health");
      const result = {
        ok: true,
        latencyMs: Math.round(performance.now() - started),
        data
      };
      addLog({ type: "health", status: "ok", ...result });
      return result;
    } catch (error) {
      const result = {
        ok: false,
        latencyMs: Math.round(performance.now() - started),
        error: String(error?.message || error)
      };
      addLog({ type: "health", status: "error", ...result });
      return result;
    }
  }

  async function fetchResults() {
    try {
      const data = await request("/api/results");
      addLog({
        type: "sync",
        status: "ok",
        count: Array.isArray(data?.results) ? data.results.length : 0
      });
      return data;
    } catch (error) {
      addLog({
        type: "sync",
        status: "error",
        error: String(error?.message || error)
      });
      throw error;
    }
  }

  window.LoteriaSync = {
    getLog,
    addLog,
    health,
    fetchResults
  };
})();
