import React, { useState, useEffect, useMemo, useCallback } from "react";

/* ---------------------------------------------------------
   Configuración de juegos
--------------------------------------------------------- */
const GAMES = {
  pega3_dia: { label: "Pega 3 · Día", short: "P3D", type: "digits", count: 3, max: 9, color: "#E1503F" },
  pega3_noche: { label: "Pega 3 · Noche", short: "P3N", type: "digits", count: 3, max: 9, color: "#E1503F" },
  pega4_dia: { label: "Pega 4 · Día", short: "P4D", type: "digits", count: 4, max: 9, color: "#2F5C8A" },
  pega4_noche: { label: "Pega 4 · Noche", short: "P4N", type: "digits", count: 4, max: 9, color: "#2F5C8A" },
  loto: { label: "Loto", short: "LOTO", type: "balls", count: 5, max: 40, bonusLabel: "Bolo Cash", bonusMax: 4, color: "#E3B23C" },
  revancha: { label: "Revancha", short: "REV", type: "balls", count: 5, max: 40, bonusLabel: "Bolo Cash", bonusMax: 4, color: "#E3B23C" },
  powerball: { label: "Powerball", short: "PB", type: "balls", count: 5, max: 69, bonusLabel: "Powerball", bonusMax: 26, color: "#7A4FE0" },
};

const GAME_ORDER = ["pega3_dia", "pega3_noche", "pega4_dia", "pega4_noche", "loto", "revancha", "powerball"];

const STORAGE_KEY = "draws-v1";

const emptyStore = () =>
  Object.fromEntries(GAME_ORDER.map((g) => [g, []]));

/* ---------------------------------------------------------
   Utilidades
--------------------------------------------------------- */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function parseNums(str) {
  return (str.match(/\d+/g) || []).map(Number);
}

// Parser del bloque de "pegar resultados"
function parsePasteBlock(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const result = { date: todayISO(), entries: {} };
  const keyMap = {
    FECHA: "date",
    "PEGA3-DIA": "pega3_dia",
    "PEGA3-NOCHE": "pega3_noche",
    "PEGA4-DIA": "pega4_dia",
    "PEGA4-NOCHE": "pega4_noche",
    LOTO: "loto",
    REVANCHA: "revancha",
    POWERBALL: "powerball",
  };
  for (const line of lines) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const rawKey = line.slice(0, idx).trim().toUpperCase();
    const rest = line.slice(idx + 1).trim();
    const key = keyMap[rawKey];
    if (!key) continue;
    if (key === "date") {
      const m = rest.match(/\d{4}-\d{2}-\d{2}/);
      if (m) result.date = m[0];
      continue;
    }
    const [mainPart, bonusPart] = rest.split("|");
    const nums = parseNums(mainPart);
    const bonus = bonusPart ? parseNums(bonusPart)[0] : undefined;
    result.entries[key] = { numbers: nums, bonus };
  }
  return result;
}

// Frecuencia de números individuales (para "balls") o de dígitos (para "digits")
function computeFrequency(game, draws) {
  const cfg = GAMES[game];
  const freq = {};
  const max = cfg.max;
  for (let i = cfg.type === "digits" ? 0 : 1; i <= max; i++) freq[i] = 0;
  let total = 0;
  draws.forEach((d) => {
    (d.numbers || []).forEach((n) => {
      if (freq[n] === undefined) freq[n] = 0;
      freq[n]++;
      total++;
    });
  });
  const bonusFreq = {};
  if (cfg.bonusMax) {
    for (let i = 1; i <= cfg.bonusMax; i++) bonusFreq[i] = 0;
    draws.forEach((d) => {
      if (d.bonus !== undefined && d.bonus !== null) {
        bonusFreq[d.bonus] = (bonusFreq[d.bonus] || 0) + 1;
      }
    });
  }
  return { freq, bonusFreq, total, drawCount: draws.length };
}

function sortedByFreq(freq, dir = "desc") {
  return Object.entries(freq)
    .map(([n, c]) => ({ n: Number(n), c }))
    .sort((a, b) => (dir === "desc" ? b.c - a.c || a.n - b.n : a.c - b.c || a.n - b.n));
}

// Genera combinación ponderada por frecuencia histórica (peso = veces salido + 1)
function weightedPick(freqList, count, allowRepeats = false) {
  const pool = freqList.map((f) => ({ n: f.n, w: f.c + 1 }));
  const picked = [];
  const working = [...pool];
  while (picked.length < count && working.length > 0) {
    const totalW = working.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * totalW;
    let idx = 0;
    for (; idx < working.length; idx++) {
      r -= working[idx].w;
      if (r <= 0) break;
    }
    const chosen = working[Math.min(idx, working.length - 1)];
    picked.push(chosen.n);
    if (!allowRepeats) working.splice(idx, 1);
  }
  return picked;
}

/* ---------------------------------------------------------
   Componentes visuales
--------------------------------------------------------- */
function Perforation() {
  return (
    <div className="flex items-center gap-1.5 my-4 select-none" aria-hidden="true">
      {Array.from({ length: 40 }).map((_, i) => (
        <span key={i} className="w-1 h-1 rounded-full bg-white/10 flex-shrink-0" />
      ))}
    </div>
  );
}

function Ball({ n, size = "md", color = "#E3B23C", dim = false }) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-10 h-10 text-sm", lg: "w-14 h-14 text-lg" };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0 border`}
      style={{
        background: dim ? "transparent" : color,
        borderColor: color,
        color: dim ? color : "#0E1B2B",
        opacity: dim ? 0.55 : 1,
      }}
    >
      {n}
    </div>
  );
}

function Digit({ n, color }) {
  return (
    <div
      className="w-11 h-14 rounded-md flex items-center justify-center text-2xl font-bold border-2 flex-shrink-0"
      style={{ borderColor: color, color: "#F3EFE4", background: "rgba(255,255,255,0.03)" }}
    >
      {n}
    </div>
  );
}

/* ---------------------------------------------------------
   App principal
--------------------------------------------------------- */
export default function LoteriaPR() {
  const [store, setStore] = useState(emptyStore());
  const [loaded, setLoaded] = useState(false);
  const [activeGame, setActiveGame] = useState("pega3_dia");
  const [tab, setTab] = useState("resumen"); // resumen | agregar | historial
  const [pasteText, setPasteText] = useState("");
  const [pasteMsg, setPasteMsg] = useState(null);
  const [manualDate, setManualDate] = useState(todayISO());
  const [manualFields, setManualFields] = useState({});
  const [saveMsg, setSaveMsg] = useState(null);

  // Cargar datos guardados en este navegador
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStore({ ...emptyStore(), ...parsed });
      }
    } catch (e) {
      console.error("No se pudieron cargar los datos guardados", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next) => {
    setStore(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.error("No se pudo guardar", e);
    }
  }, []);

  const addDraw = useCallback(
    (game, entry) => {
      const next = { ...store, [game]: [...store[game], entry] };
      persist(next);
    },
    [store, persist]
  );

  const removeDraw = useCallback(
    (game, index) => {
      const next = { ...store, [game]: store[game].filter((_, i) => i !== index) };
      persist(next);
    },
    [store, persist]
  );

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    const parsed = parsePasteBlock(pasteText);
    const addedGames = [];
    let next = { ...store };
    for (const [game, data] of Object.entries(parsed.entries)) {
      if (!GAMES[game]) continue;
      const cfg = GAMES[game];
      if (!data.numbers || data.numbers.length < cfg.count) continue;
      const entry = { date: parsed.date, numbers: data.numbers.slice(0, cfg.count) };
      if (cfg.bonusMax) entry.bonus = data.bonus;
      next[game] = [...next[game], entry];
      addedGames.push(cfg.short);
    }
    persist(next);
    setPasteMsg(
      addedGames.length
        ? `Añadido a: ${addedGames.join(", ")} — fecha ${parsed.date}`
        : "No se reconoció ningún juego en el texto. Revisa el formato."
    );
    setPasteText("");
    setTimeout(() => setPasteMsg(null), 5000);
  };

  const handleManualSave = (game) => {
    const cfg = GAMES[game];
    const raw = manualFields[game] || {};
    const numbers = (raw.numbers || []).map(Number);
    if (numbers.length !== cfg.count || numbers.some((n) => isNaN(n))) {
      setSaveMsg({ game, ok: false, text: `Completa los ${cfg.count} números.` });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }
    const entry = { date: manualDate, numbers };
    if (cfg.bonusMax) {
      const b = Number(raw.bonus);
      if (isNaN(b)) {
        setSaveMsg({ game, ok: false, text: `Falta el número de ${cfg.bonusLabel}.` });
        setTimeout(() => setSaveMsg(null), 3000);
        return;
      }
      entry.bonus = b;
    }
    addDraw(game, entry);
    setManualFields((f) => ({ ...f, [game]: {} }));
    setSaveMsg({ game, ok: true, text: "Guardado." });
    setTimeout(() => setSaveMsg(null), 2500);
  };

  const stats = useMemo(() => {
    const out = {};
    for (const g of GAME_ORDER) out[g] = computeFrequency(g, store[g]);
    return out;
  }, [store]);

  const totalDraws = GAME_ORDER.reduce((s, g) => s + store[g].length, 0);

  const cfg = GAMES[activeGame];
  const gStats = stats[activeGame];
  const hot = sortedByFreq(gStats.freq, "desc").slice(0, cfg.type === "digits" ? 5 : 10);
  const cold = sortedByFreq(gStats.freq, "asc").slice(0, cfg.type === "digits" ? 5 : 10);
  const hotBonus = cfg.bonusMax ? sortedByFreq(gStats.bonusFreq, "desc")[0] : null;
  const coldBonus = cfg.bonusMax ? sortedByFreq(gStats.bonusFreq, "asc")[0] : null;

  const [combos, setCombos] = useState([]);

  const generateCombos = (mode) => {
    const source = mode === "hot" ? hot : mode === "cold" ? cold : sortedByFreq(gStats.freq, "desc");
    const results = [];
    for (let i = 0; i < 5; i++) {
      let picks;
      if (cfg.type === "digits") {
        // dígitos permiten repetir posición a posición
        picks = Array.from({ length: cfg.count }, () => weightedPick(source, 1, true)[0]);
      } else {
        picks = weightedPick(source, cfg.count, false).sort((a, b) => a - b);
      }
      const bonus = cfg.bonusMax
        ? weightedPick(sortedByFreq(gStats.bonusFreq, mode === "cold" ? "asc" : "desc"), 1, true)[0]
        : null;
      results.push({ picks, bonus });
    }
    setCombos(results);
  };

  useEffect(() => {
    setCombos([]);
  }, [activeGame]);

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0E1B2B", color: "#F3EFE4" }}>
        <p className="font-mono text-sm opacity-70">Cargando datos guardados…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "#0E1B2B", color: "#F3EFE4" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* HERO / TICKET HEADER */}
        <header className="mb-2">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-[11px] tracking-[0.3em] uppercase opacity-50 mb-1">
                Lotería Electrónica · Puerto Rico
              </p>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-none">
                Rastreador de <span style={{ color: "#E3B23C" }}>Números</span>
              </h1>
            </div>
            <div className="text-right font-mono text-xs opacity-60 leading-tight">
              <div>SORTEOS REGISTRADOS</div>
              <div className="text-2xl font-bold" style={{ color: "#E1503F" }}>
                {String(totalDraws).padStart(3, "0")}
              </div>
            </div>
          </div>
          <Perforation />
        </header>

        {/* AVISO */}
        <div
          className="rounded-lg border px-4 py-3 mb-6 text-[13px] leading-snug"
          style={{ borderColor: "rgba(227,178,60,0.4)", background: "rgba(227,178,60,0.07)" }}
        >
          <strong style={{ color: "#E3B23C" }}>Nota:</strong> cada sorteo es independiente y aleatorio. El
          historial no cambia la probabilidad del próximo número. Estas combinaciones se generan a partir de la
          frecuencia pasada solo con fines informativos y de entretenimiento — no son una predicción.
        </div>

        {/* TABS */}
        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {[
            ["resumen", "Resumen"],
            ["agregar", "Añadir resultados"],
            ["historial", "Historial"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-4 py-2 text-sm font-semibold rounded-t-md transition-colors"
              style={{
                color: tab === key ? "#0E1B2B" : "#F3EFE4",
                background: tab === key ? "#E3B23C" : "transparent",
                opacity: tab === key ? 1 : 0.6,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* GAME SELECTOR */}
        <div className="flex flex-wrap gap-2 mb-6">
          {GAME_ORDER.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGame(g)}
              className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all"
              style={{
                borderColor: GAMES[g].color,
                background: activeGame === g ? GAMES[g].color : "transparent",
                color: activeGame === g ? "#0E1B2B" : GAMES[g].color,
              }}
            >
              {GAMES[g].short}
              <span className="ml-1.5 font-mono opacity-70">{store[g].length}</span>
            </button>
          ))}
        </div>

        {/* ===================== TAB: RESUMEN ===================== */}
        {tab === "resumen" && (
          <div>
            <h2 className="text-2xl font-bold mb-1">{cfg.label}</h2>
            <p className="text-xs font-mono opacity-50 mb-5">
              {gStats.drawCount} sorteo{gStats.drawCount === 1 ? "" : "s"} registrado
              {gStats.drawCount === 1 ? "" : "s"} en tu historial
            </p>

            {gStats.drawCount === 0 ? (
              <div
                className="rounded-lg border border-dashed p-6 text-center text-sm opacity-60"
                style={{ borderColor: "rgba(255,255,255,0.2)" }}
              >
                Aún no hay datos para {cfg.label}. Ve a la pestaña "Añadir resultados" — o dime{" "}
                <span className="font-mono">"actualizar"</span> en el chat y buscaré los resultados de hoy para
                que los pegues aquí.
              </div>
            ) : (
              <>
                {/* Hot / Cold */}
                <div className="grid sm:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-lg p-4 border" style={{ borderColor: "rgba(225,80,63,0.35)", background: "rgba(225,80,63,0.06)" }}>
                    <p className="text-[11px] font-mono uppercase tracking-widest mb-3" style={{ color: "#E1503F" }}>
                      🔥 Más frecuentes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {hot.map((h) =>
                        cfg.type === "digits" ? (
                          <div key={h.n} className="flex flex-col items-center gap-1">
                            <Digit n={h.n} color="#E1503F" />
                            <span className="text-[10px] font-mono opacity-60">{h.c}x</span>
                          </div>
                        ) : (
                          <div key={h.n} className="flex flex-col items-center gap-1">
                            <Ball n={h.n} color="#E1503F" />
                            <span className="text-[10px] font-mono opacity-60">{h.c}x</span>
                          </div>
                        )
                      )}
                    </div>
                    {cfg.bonusMax && hotBonus && (
                      <p className="text-xs font-mono mt-3 opacity-70">
                        {cfg.bonusLabel} más frecuente: <strong>{hotBonus.n}</strong> ({hotBonus.c}x)
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg p-4 border" style={{ borderColor: "rgba(47,92,138,0.35)", background: "rgba(47,92,138,0.06)" }}>
                    <p className="text-[11px] font-mono uppercase tracking-widest mb-3" style={{ color: "#6FA0D8" }}>
                      ❄️ Menos frecuentes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {cold.map((h) =>
                        cfg.type === "digits" ? (
                          <div key={h.n} className="flex flex-col items-center gap-1">
                            <Digit n={h.n} color="#2F5C8A" />
                            <span className="text-[10px] font-mono opacity-60">{h.c}x</span>
                          </div>
                        ) : (
                          <div key={h.n} className="flex flex-col items-center gap-1">
                            <Ball n={h.n} color="#2F5C8A" />
                            <span className="text-[10px] font-mono opacity-60">{h.c}x</span>
                          </div>
                        )
                      )}
                    </div>
                    {cfg.bonusMax && coldBonus && (
                      <p className="text-xs font-mono mt-3 opacity-70">
                        {cfg.bonusLabel} menos frecuente: <strong>{coldBonus.n}</strong> ({coldBonus.c}x)
                      </p>
                    )}
                  </div>
                </div>

                {/* Generador de combinaciones */}
                <div className="rounded-lg border p-4 mb-6" style={{ borderColor: "rgba(227,178,60,0.35)" }}>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <p className="text-sm font-bold" style={{ color: "#E3B23C" }}>
                      Generar combinaciones
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateCombos("hot")}
                        className="px-3 py-1.5 rounded-md text-xs font-bold"
                        style={{ background: "#E3B23C", color: "#0E1B2B" }}
                      >
                        Basado en calientes
                      </button>
                      <button
                        onClick={() => generateCombos("cold")}
                        className="px-3 py-1.5 rounded-md text-xs font-bold border"
                        style={{ borderColor: "#E3B23C", color: "#E3B23C" }}
                      >
                        Basado en fríos
                      </button>
                    </div>
                  </div>

                  {combos.length === 0 ? (
                    <p className="text-xs opacity-50">Pulsa un botón para generar 5 combinaciones sugeridas.</p>
                  ) : (
                    <div className="space-y-2">
                      {combos.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs opacity-40 w-4">{i + 1}.</span>
                          {c.picks.map((n, j) =>
                            cfg.type === "digits" ? (
                              <Digit key={j} n={n} color="#E3B23C" />
                            ) : (
                              <Ball key={j} n={n} size="sm" color="#E3B23C" />
                            )
                          )}
                          {c.bonus !== null && c.bonus !== undefined && (
                            <>
                              <span className="text-xs opacity-40 mx-1">+</span>
                              <Ball n={c.bonus} size="sm" color="#7A4FE0" />
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===================== TAB: AÑADIR ===================== */}
        {tab === "agregar" && (
          <div>
            <div className="rounded-lg border p-4 mb-6" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <p className="text-sm font-bold mb-1">Pegar resultados del día</p>
              <p className="text-xs opacity-60 mb-3 leading-relaxed">
                Cuando me digas <span className="font-mono">"actualizar"</span> en el chat, buscaré los números
                del día y te los daré en este formato — solo pégalos aquí y presiona "Procesar".
              </p>
              <pre
                className="text-[11px] font-mono p-3 rounded-md mb-3 overflow-x-auto"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
{`FECHA: ${todayISO()}
PEGA3-DIA: 1 2 3
PEGA3-NOCHE: 4 5 6
PEGA4-DIA: 1 2 3 4
PEGA4-NOCHE: 5 6 7 8
LOTO: 3 11 18 24 39 | BOLO 2
REVANCHA: 5 9 14 21 33 | BOLO 3
POWERBALL: 6 19 28 44 61 | PB 12`}
              </pre>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Pega aquí el bloque de resultados…"
                rows={6}
                className="w-full rounded-md p-3 text-sm font-mono outline-none"
                style={{ background: "rgba(255,255,255,0.05)", color: "#F3EFE4", border: "1px solid rgba(255,255,255,0.15)" }}
              />
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={handlePaste}
                  className="px-4 py-2 rounded-md text-sm font-bold"
                  style={{ background: "#E3B23C", color: "#0E1B2B" }}
                >
                  Procesar bloque
                </button>
                {pasteMsg && <span className="text-xs font-mono opacity-70">{pasteMsg}</span>}
              </div>
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
              <p className="text-sm font-bold mb-3">O añade un juego manualmente</p>
              <div className="mb-3">
                <label className="text-xs font-mono opacity-60 block mb-1">Fecha</label>
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="rounded-md px-3 py-1.5 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", color: "#F3EFE4", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>

              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <span className="text-xs font-mono opacity-60">Juego:</span>
                {GAME_ORDER.map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGame(g)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold border"
                    style={{
                      borderColor: GAMES[g].color,
                      background: activeGame === g ? GAMES[g].color : "transparent",
                      color: activeGame === g ? "#0E1B2B" : GAMES[g].color,
                    }}
                  >
                    {GAMES[g].short}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-2 flex-wrap">
                {Array.from({ length: cfg.count }).map((_, i) => (
                  <div key={i}>
                    <label className="text-[10px] font-mono opacity-50 block mb-1">#{i + 1}</label>
                    <input
                      type="number"
                      min={cfg.type === "digits" ? 0 : 1}
                      max={cfg.max}
                      value={(manualFields[activeGame]?.numbers || [])[i] ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setManualFields((f) => {
                          const nums = [...(f[activeGame]?.numbers || [])];
                          nums[i] = val;
                          return { ...f, [activeGame]: { ...f[activeGame], numbers: nums } };
                        });
                      }}
                      className="w-14 rounded-md px-2 py-1.5 text-sm text-center outline-none"
                      style={{ background: "rgba(255,255,255,0.05)", color: "#F3EFE4", border: "1px solid rgba(255,255,255,0.15)" }}
                    />
                  </div>
                ))}
                {cfg.bonusMax && (
                  <div>
                    <label className="text-[10px] font-mono opacity-50 block mb-1">{cfg.bonusLabel}</label>
                    <input
                      type="number"
                      min={1}
                      max={cfg.bonusMax}
                      value={manualFields[activeGame]?.bonus ?? ""}
                      onChange={(e) =>
                        setManualFields((f) => ({ ...f, [activeGame]: { ...f[activeGame], bonus: e.target.value } }))
                      }
                      className="w-16 rounded-md px-2 py-1.5 text-sm text-center outline-none"
                      style={{ background: "rgba(122,79,224,0.1)", color: "#F3EFE4", border: "1px solid rgba(122,79,224,0.4)" }}
                    />
                  </div>
                )}
                <button
                  onClick={() => handleManualSave(activeGame)}
                  className="px-4 py-2 rounded-md text-sm font-bold"
                  style={{ background: GAMES[activeGame].color, color: "#0E1B2B" }}
                >
                  Guardar
                </button>
              </div>
              {saveMsg && saveMsg.game === activeGame && (
                <p className="text-xs font-mono mt-2" style={{ color: saveMsg.ok ? "#7CC98A" : "#E1503F" }}>
                  {saveMsg.text}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ===================== TAB: HISTORIAL ===================== */}
        {tab === "historial" && (
          <div>
            <h2 className="text-xl font-bold mb-4">{cfg.label} — historial</h2>
            {store[activeGame].length === 0 ? (
              <p className="text-sm opacity-50">Sin resultados guardados todavía.</p>
            ) : (
              <div className="space-y-2">
                {[...store[activeGame]]
                  .map((d, i) => ({ ...d, _i: i }))
                  .reverse()
                  .map((d) => (
                    <div
                      key={d._i}
                      className="flex items-center justify-between gap-3 rounded-md px-3 py-2 border flex-wrap"
                      style={{ borderColor: "rgba(255,255,255,0.1)" }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-mono opacity-50 w-24">{d.date}</span>
                        {d.numbers.map((n, j) =>
                          cfg.type === "digits" ? (
                            <Digit key={j} n={n} color={cfg.color} />
                          ) : (
                            <Ball key={j} n={n} size="sm" color={cfg.color} />
                          )
                        )}
                        {d.bonus !== undefined && (
                          <>
                            <span className="text-xs opacity-40">+</span>
                            <Ball n={d.bonus} size="sm" color="#7A4FE0" />
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => removeDraw(activeGame, d._i)}
                        className="text-[11px] font-mono opacity-40 hover:opacity-90"
                      >
                        eliminar
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <footer className="mt-10 pt-4 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <p className="text-[11px] font-mono opacity-35">
            Datos guardados localmente en tu cuenta. Ninguna combinación garantiza un premio.
          </p>
        </footer>
      </div>
    </div>
  );
}
