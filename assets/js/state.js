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
  const LS_DATA_CACHE = 'pf_data_cache_v1';
  const LS_DATA_META = 'pf_data_meta_v1';
  const LS_MODULOS_VIEW = 'pf_modulos_view';

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

  // ---------- Estado global ----------
  const App = {
    model: null,        // resultado de ExcelParser.buildModel
    favorites: getFavorites(),
    route: { page: 'inicio', params: {} },
    dataMeta: null,      // {source: 'fetch'|'manual'|'cache', fileName, loadedAt}
    excelBuffer: null,   // ArrayBuffer del Excel tal como se cargó, para poder exportarlo tal cual
  };

  const State = {
    App,
    LAB_META, labMeta, labLogoPath,
    MES_NOMBRE, currentMonthLabel, EXCEL_FILENAME, EXCEL_PATH,
    getTheme, setTheme, toggleTheme,
    getModulosView, setModulosView,
    isFavorite, toggleFavorite, favKey,
    cacheData, getCachedData, clearCache,
    downloadCurrentExcel,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = State;
  else global.State = State;
})(typeof window !== 'undefined' ? window : globalThis);
