/**
 * Configuración central de Lotería PR V4.
 * Se expone en window para mantener compatibilidad con el núcleo legado.
 */
(() => {
  "use strict";

  const defaults = Object.freeze({
    version: "4.0",
    environment: "production",
    workerUrl: "",
    syncIntervalMinutes: 30,
    autoSync: false,
    autoBackup: true,
    requestTimeoutMs: 12000
  });

  const key = "loteria-pr-v4-config";

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      return { ...defaults, ...saved };
    } catch {
      return { ...defaults };
    }
  }

  function save(next) {
    const value = { ...defaults, ...next };
    localStorage.setItem(key, JSON.stringify(value));
    window.LoteriaConfig.current = value;
    return value;
  }

  window.LoteriaConfig = {
    defaults,
    key,
    current: load(),
    load,
    save,
    reset() {
      localStorage.removeItem(key);
      this.current = { ...defaults };
      return this.current;
    }
  };
})();
