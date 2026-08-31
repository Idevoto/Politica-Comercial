/**
 * state.js — configuración estática + estado de la app + helpers de localStorage.
 */
(function (global) {
  'use strict';

  // ---------- Configuración de laboratorios ----------
  // bg/text: paleta institucional exacta (usada en el pill con el nombre del
  // laboratorio y en los acentos de las tarjetas). color/soft: variante suave
  // usada como fondo detrás del logo (mantiene buen contraste en ambos temas).
  const LAB_META = {
    Roemmers:  { bg: '#FFE24E', text: '#000000', color: 'var(--lab-roemmers)',  soft: 'var(--lab-roemmers-soft)',  initials: 'RO' },
    Ethical:   { bg: '#08D0C7', text: '#FFFFFF', color: 'var(--lab-ethical)',   soft: 'var(--lab-ethical-soft)',   initials: 'ET' },
    Millet:    { bg: '#3324A9', text: '#FFFFFF', color: 'var(--lab-millet)',    soft: 'var(--lab-millet-soft)',    initials: 'MI' },
    Sidus:     { bg: '#009FE3', text: '#FFFFFF', color: 'var(--lab-sidus)',     soft: 'var(--lab-sidus-soft)',     initials: 'SI' },
    Siegfried: { bg: '#B1403D', text: '#FFFFFF', color: 'var(--lab-siegfried)', soft: 'var(--lab-siegfried-soft)', initials: 'SG' },
    Craveri:   { bg: '#CE152B', text: '#FFFFFF', color: 'var(--lab-craveri)',   soft: 'var(--lab-craveri-soft)',   initials: 'CR' },
  };
  function labMeta(lab) {
    return LAB_META[lab] || { bg: 'var(--surface-2)', text: 'var(--text-muted)', color: 'var(--text-faint)', soft: 'var(--surface-2)', initials: (lab || '?').slice(0, 2).toUpperCase() };
  }
  function labLogoPath(lab) {
    return 'assets/logos/' + String(lab || '').toLowerCase() + '.svg';
  }

  const MES_NOMBRE = 'Julio 2026'; // respaldo, por si el Excel no trae el mes en la celda I1 de "Grupo Roemmers"
  function currentMonthLabel() {
    return (App.model && App.model.mesLabel) || MES_NOMBRE;
  }
  const EXCEL_FILENAME = 'Politica_Comercial_FFVV.xlsx';
  const EXCEL_PATH = 'excel/' + EXCEL_FILENAME;

  // ---------- localStorage keys ----------
  const LS_THEME = 'pf_theme';
  const LS_FAVORITES = 'pf_favoritos_v1';
  const LS_FAVORITES_MOD = 'pf_favoritos_mod_v1';
  const LS_DATA_CACHE = 'pf_data_cache_v1';
  const LS_DATA_META = 'pf_data_meta_v1';
  const LS_MODULOS_VIEW = 'pf_modulos_view';
  const LS_SEEN_SNAPSHOT = 'pf_seen_snapshot_v1'; // huella del modelo que el usuario ya vio
  const LS_LAST_CHANGES = 'pf_last_changes_v1';   // último diff calculado (para volver a mostrarlo)

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* noop */ }
  }

  // ---------- Tema ----------
  function getTheme() {
    return safeGet(LS_THEME) || 'light';
  }
  function setTheme(theme) {
    safeSet(LS_THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }
  function toggleTheme() {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
    return next;
  }

  // ---------- Exportar el Excel tal cual se cargó ----------
  function downloadCurrentExcel() {
    const fileName = (App.dataMeta && App.dataMeta.fileName) || EXCEL_FILENAME;
    if (App.excelBuffer) {
      const blob = new Blob([App.excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } else {
      // Respaldo (p.ej. datos venían de la caché local sin buffer en memoria):
      // intentamos el link directo al archivo publicado.
      const a = document.createElement('a');
      a.href = EXCEL_PATH;
      a.download = EXCEL_FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  // ---------- Vista de Módulos (tarjetas / lista) ----------
  function getModulosView() {
    const v = safeGet(LS_MODULOS_VIEW);
    return v === 'list' ? 'list' : 'cards';
  }
  function setModulosView(view) {
    safeSet(LS_MODULOS_VIEW, view === 'list' ? 'list' : 'cards');
  }

  // ---------- Favoritos ----------
  function getFavorites() {
    try {
      const raw = safeGet(LS_FAVORITES);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  }
  function saveFavorites(set) {
    safeSet(LS_FAVORITES, JSON.stringify(Array.from(set)));
  }
  function favKey(lab, ean) { return lab + '|' + (ean || ''); }
  function isFavorite(lab, ean) {
    return App.favorites.has(favKey(lab, ean));
  }
  function toggleFavorite(lab, ean) {
    const key = favKey(lab, ean);
    if (App.favorites.has(key)) App.favorites.delete(key);
    else App.favorites.add(key);
    saveFavorites(App.favorites);
    return App.favorites.has(key);
  }

  // ---------- Favoritos de módulos (guardados aparte de los productos) ----------
  function getFavoritesMod() {
    try {
      const raw = safeGet(LS_FAVORITES_MOD);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (e) { return new Set(); }
  }
  function saveFavoritesMod(set) {
    safeSet(LS_FAVORITES_MOD, JSON.stringify(Array.from(set)));
  }
  // Un módulo se identifica por su id único (p.ej. "Sidus-3").
  function isFavoriteMod(modId) {
    return App.favoritesMod.has(String(modId));
  }
  function toggleFavoriteMod(modId) {
    const key = String(modId);
    if (App.favoritesMod.has(key)) App.favoritesMod.delete(key);
    else App.favoritesMod.add(key);
    saveFavoritesMod(App.favoritesMod);
    return App.favoritesMod.has(key);
  }

  // ---------- Cache de datos (para cuando falla el auto-fetch) ----------
  function cacheData(model, meta) {
    try {
      safeSet(LS_DATA_CACHE, JSON.stringify(model));
      safeSet(LS_DATA_META, JSON.stringify(meta));
      return true;
    } catch (e) {
      return false; // p.ej. QuotaExceededError — no es crítico, simplemente no quedará cache
    }
  }
  function getCachedData() {
    try {
      const raw = safeGet(LS_DATA_CACHE);
      const metaRaw = safeGet(LS_DATA_META);
      if (!raw) return null;
      return { model: JSON.parse(raw), meta: metaRaw ? JSON.parse(metaRaw) : null };
    } catch (e) { return null; }
  }
  function clearCache() {
    safeRemove(LS_DATA_CACHE);
    safeRemove(LS_DATA_META);
  }

  // ---------- Detección de cambios entre versiones del Excel ----------
  // Construye una "huella" del modelo: mapa por producto (lab|ean) con sus
  // descuentos, y mapa por módulo (lab|código) con su detalle línea por línea.
  function buildSnapshot(model) {
    if (!model) return null;
    const productos = {};
    (model.descuentos || []).forEach((d) => {
      const key = d.lab + '|' + (d.ean || d.producto);
      productos[key] = { n: d.producto, lab: d.lab, e: d.especial, p: d.publicado, x: d.exclusivo };
    });

    const modulos = {};
    Object.keys(model.modulosPorLab || {}).forEach((lab) => {
      (model.modulosPorLab[lab] || []).forEach((mo) => {
        // Clave estable: código real del módulo (no su posición en la hoja).
        const key = mo.lab + '|' + (mo.codigo || ('N:' + mo.nombre));
        // Detalle línea por línea, para el antes/después producto por producto.
        const lineas = {};
        (mo.productos || []).forEach((p, i) => {
          const lkey = p.ean || ('N:' + (p.producto || ('#' + i)));
          lineas[lkey] = {
            n: p.producto,
            c: p.cantidad,
            d: i === 0 ? mo.descuentoPrincipal : p.descuentoLinea,
          };
        });
        // Firma de contenido (independiente del código): lab + descuento + total +
        // productos con cantidad, ordenados por EAN. Sirve para reconocer un mismo
        // módulo aunque le hayan cambiado el número de código.
        const firma = mo.lab + '#' + mo.descuentoPrincipal + '#' + mo.cantidadTotal + '#'
          + (mo.productos || [])
              .map((p) => (p.ean || p.producto) + ':' + p.cantidad)
              .sort()
              .join(',');
        modulos[key] = {
          n: mo.nombre, lab: mo.lab,
          d: mo.descuentoPrincipal, u: mo.cantidadTotal,
          np: (mo.productos || []).length, lineas: lineas,
          obs: mo.observacion || null,   // columna H (condición / observación)
          firma: firma,                  // huella de contenido para detectar renumeraciones
        };
      });
    });

    return { mes: model.mesLabel || null, productos, modulos };
  }

  // Compara dos huellas y devuelve el detalle de cambios (o null si no hay).
  function diffSnapshots(prev, next) {
    if (!prev || !next) return null;

    const out = {
      mesAntes: prev.mes, mesAhora: next.mes,
      productosNuevos: [], productosQuitados: [], productosCambiados: [],
      modulosNuevos: [], modulosQuitados: [], modulosCambiados: [],
      bonificaciones: [],
    };

    const eqNum = (a, b) => (a == null ? '' : a) === (b == null ? '' : b);
    const pct = (v) => (v == null ? '—' : (Math.round(v * 100) / 100) + '%');
    const norm = (s) => String(s == null ? '' : s).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // --- Productos ---
    Object.keys(next.productos).forEach((key) => {
      const b = next.productos[key];
      const a = prev.productos[key];
      if (!a) { out.productosNuevos.push({ nombre: b.n, lab: b.lab }); return; }
      const campos = [];
      if (!eqNum(a.e, b.e)) campos.push({ campo: 'Especial', antes: pct(a.e), ahora: pct(b.e) });
      if (!eqNum(a.p, b.p)) campos.push({ campo: 'Publicado', antes: pct(a.p), ahora: pct(b.p) });
      if (!eqNum(a.x, b.x)) campos.push({ campo: 'Exclusivo', antes: pct(a.x), ahora: pct(b.x) });
      if (campos.length) out.productosCambiados.push({ nombre: b.n, lab: b.lab, campos });
    });
    Object.keys(prev.productos).forEach((key) => {
      if (!next.productos[key]) {
        const a = prev.productos[key];
        out.productosQuitados.push({ nombre: a.n, lab: a.lab });
      }
    });

    // --- Módulos ---
    // Regla de negocio: en Novedades se informan los módulos que Nacho marcó con
    // texto en la columna H (observación) — esos son los modificados/nuevos —, más
    // los módulos realmente dados de baja. Un módulo NO se informa como baja si su
    // contenido reaparece con otro código (renumeración): se compara por "firma".
    function diffModuloLineas(a, b) {
      const productos = [];
      const aL = (a && a.lineas) || {}, bL = b.lineas || {};
      const moduloEsNuevo = !a; // no había versión previa de este módulo

      Object.keys(bL).forEach((lk) => {
        const bn = bL[lk], an = aL[lk];
        if (!an) {
          // Línea sin versión previa. Si el módulo entero es nuevo, no la marcamos
          // como "nuevo en módulo" (sería redundante: todo el módulo es nuevo). Solo
          // se marca en verde cuando el producto se agregó a un módulo que ya existía.
          productos.push({ estado: moduloEsNuevo ? 'nuevo-modulo' : 'nuevo', nombre: bn.n, cantVieja: null, cantNueva: bn.c, descVieja: null, descNueva: bn.d });
          return;
        }
        const cantCambio = !eqNum(an.c, bn.c);
        const descCambio = !eqNum(an.d, bn.d);
        productos.push({
          estado: (cantCambio || descCambio) ? 'modificado' : 'igual',
          nombre: bn.n,
          cantVieja: an.c, cantNueva: cantCambio ? bn.c : null,
          descVieja: an.d, descNueva: descCambio ? bn.d : null,
        });
      });
      Object.keys(aL).forEach((lk) => {
        if (!bL[lk]) {
          const an = aL[lk];
          productos.push({ estado: 'quitado', nombre: an.n, cantVieja: an.c, cantNueva: null, descVieja: an.d, descNueva: null });
        }
      });
      return { productos };
    }

    // Sets de la versión nueva para detectar bajas reales: por firma de contenido y
    // por nombre de módulo. Si el módulo reaparece con el mismo contenido O con el
    // mismo nombre (aunque le hayan cambiado código y/o productos), NO es una baja.
    const firmasNext = {};
    const nombresNext = {};
    Object.keys(next.modulos).forEach((id) => {
      const m = next.modulos[id];
      firmasNext[m.firma] = true;
      nombresNext[m.lab + '|' + norm(m.n)] = true;
    });

    // Índice de la versión anterior por nombre (lab|nombre), para reencontrar un
    // módulo aunque le hayan cambiado el código.
    const prevPorNombre = {};
    Object.keys(prev.modulos).forEach((id) => {
      const m = prev.modulos[id];
      prevPorNombre[m.lab + '|' + norm(m.n)] = m;
    });

    // Módulos informados por observación en la columna H (modificados o nuevos).
    // Las bonificaciones (nombre que empieza con "BON." / "BONI.") van a una lista
    // separada, para mostrarse bajo su propio título "BONIFICACIONES".
    const esBonificacion = (nombre) => /^BONI?\.?\b/.test(norm(nombre));
    Object.keys(next.modulos).forEach((id) => {
      const b = next.modulos[id];
      if (!b.obs) return; // sin texto en H: no se informa
      // Versión anterior: primero por código; si no está (le cambiaron el código),
      // por nombre. Así ROFINA renumerado se compara contra su versión previa real.
      const a = prev.modulos[id] || prevPorNombre[b.lab + '|' + norm(b.n)] || null;
      const det = diffModuloLineas(a, b);
      const card = {
        nombre: b.n, lab: b.lab,
        observacion: b.obs,
        productos: det.productos,
      };
      if (esBonificacion(b.n)) out.bonificaciones.push(card);
      else out.modulosCambiados.push(card);
    });

    // Módulos dados de baja: estaban antes y ya no existen en la versión nueva,
    // ni por código, ni por contenido (firma), ni por nombre. Así, un módulo al que
    // solo le cambiaron el código y/o algunos productos (como los ROFINA marcados en
    // la columna H) no se informa como baja: sigue existiendo por su nombre.
    Object.keys(prev.modulos).forEach((id) => {
      const a = prev.modulos[id];
      if (next.modulos[id]) return;                        // mismo código sigue existiendo
      if (firmasNext[a.firma]) return;                     // mismo contenido con otro código
      if (nombresNext[a.lab + '|' + norm(a.n)]) return;    // mismo nombre sigue presente
      out.modulosQuitados.push({ nombre: a.n, lab: a.lab });
    });

    out.total =
      out.productosNuevos.length + out.productosQuitados.length + out.productosCambiados.length +
      out.modulosNuevos.length + out.modulosQuitados.length + out.modulosCambiados.length +
      out.bonificaciones.length;

    return out;
  }

  function getSeenSnapshot() {
    try { const raw = safeGet(LS_SEEN_SNAPSHOT); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function saveSeenSnapshot(snap) {
    try { safeSet(LS_SEEN_SNAPSHOT, JSON.stringify(snap)); } catch (e) { /* noop */ }
  }
  function getLastChanges() {
    try { const raw = safeGet(LS_LAST_CHANGES); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function saveLastChanges(diff) {
    try { if (diff) safeSet(LS_LAST_CHANGES, JSON.stringify(diff)); else safeRemove(LS_LAST_CHANGES); } catch (e) { /* noop */ }
  }

  // Compara el modelo recién cargado contra la última huella vista por el usuario.
  function detectChanges(model) {
    const nextSnap = buildSnapshot(model);
    App.currentSnapshot = nextSnap;
    const prevSnap = getSeenSnapshot();

    // Primera vez en este navegador: guardamos la base, no avisamos.
    if (!prevSnap) {
      saveSeenSnapshot(nextSnap);
      saveLastChanges(null);
      App.pendingChanges = null;
      return null;
    }

    const diff = diffSnapshots(prevSnap, nextSnap);
    if (!diff || diff.total === 0) {
      // Recarga del mismo Excel: refrescamos la base, conservamos el último diff mostrado.
      saveSeenSnapshot(nextSnap);
      App.pendingChanges = null;
      return null;
    }

    diff.detectadoEn = Date.now();
    saveLastChanges(diff);
    App.pendingChanges = diff;
    return diff;
  }

  // El usuario cerró el aviso: marca la huella nueva como vista (para que el modal
  // no vuelva a saltar), pero CONSERVA el diff para que quede visible en Novedades.
  function acknowledgeChanges() {
    if (App.currentSnapshot) saveSeenSnapshot(App.currentSnapshot);
    App.pendingChanges = null;
  }

  // ---------- Estado global ----------
  const App = {
    model: null,        // resultado de ExcelParser.buildModel
    favorites: getFavorites(),
    favoritesMod: getFavoritesMod(),
    route: { page: 'inicio', params: {} },
    dataMeta: null,      // {source: 'fetch'|'manual'|'cache', fileName, loadedAt}
    excelBuffer: null,   // ArrayBuffer del Excel tal como se cargó, para poder exportarlo tal cual
    currentSnapshot: null,
    pendingChanges: null,
  };

  const State = {
    App,
    LAB_META, labMeta, labLogoPath,
    MES_NOMBRE, currentMonthLabel, EXCEL_FILENAME, EXCEL_PATH,
    getTheme, setTheme, toggleTheme,
    getModulosView, setModulosView,
    isFavorite, toggleFavorite, favKey,
    isFavoriteMod, toggleFavoriteMod,
    cacheData, getCachedData, clearCache,
    downloadCurrentExcel,
    buildSnapshot, diffSnapshots, detectChanges, acknowledgeChanges, getLastChanges,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = State;
  else global.State = State;
})(typeof window !== 'undefined' ? window : globalThis);
