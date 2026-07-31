/**
 * app.js — arranque de la aplicación.
 */
(function () {
  'use strict';

  const SHEET_NAMES = {
    descuentos: 'Grupo Roemmers',
    desc_clientes: 'Desc. Clientes',
    detalle_pack: 'Detalle Pack',
  };

  function normSheetName(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Busca una hoja por nombre de forma tolerante a mayúsculas/espacios.
  function findSheet(workbook, wantedName) {
    const want = normSheetName(wantedName);
    const match = workbook.SheetNames.find((n) => normSheetName(n) === want);
    return match || null;
  }

  function workbookToSheetsObject(workbook) {
    const out = {};
    const wanted = [SHEET_NAMES.descuentos, SHEET_NAMES.desc_clientes].concat(
      ExcelParser.MODULE_SHEETS.map((d) => d.sheet)
    );
    wanted.forEach((name) => {
      const real = findSheet(workbook, name);
      if (real) {
        out[name] = XLSX.utils.sheet_to_json(workbook.Sheets[real], { header: 1, defval: null, raw: true });
      }
    });

    // "Detalle Pack" se lee aparte, por dirección absoluta de celda (columna C = índice 2),
    // porque esta hoja en particular puede tener su rango de datos arrancando en una
    // columna distinta de A (p.ej. B2:L41), lo cual correría los índices si se leyera
    // como array-de-filas con sheet_to_json.
    const packSheetName = findSheet(workbook, SHEET_NAMES.detalle_pack);
    if (packSheetName) {
      out[SHEET_NAMES.detalle_pack] = extractColumnValues(workbook.Sheets[packSheetName], 2);
    }

    return out;
  }

  // Devuelve un array plano con el valor crudo de cada celda de la columna `colIndex`
  // (0 = A, 1 = B, 2 = C, ...) para todas las filas del rango real de la hoja.
  function extractColumnValues(sheet, colIndex) {
    const values = [];
    if (!sheet || !sheet['!ref']) return values;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r: r, c: colIndex });
      const cell = sheet[addr];
      values.push(cell ? cell.v : null);
    }
    return values;
  }

  function buildAndStoreModel(workbook, meta, rawBuffer) {
    const sheets = workbookToSheetsObject(workbook);
    const model = ExcelParser.buildModel(sheets);
    State.App.model = model;
    State.App.dataMeta = meta;
    State.App.excelBuffer = rawBuffer || null;
    State.cacheData(model, meta);
    console.log('[PF] Excel cargado. Fuente:', meta && meta.source, '| Filas leídas de "Detalle Pack":', (sheets['Detalle Pack'] || []).length, '| Packs detectados:', (model.packEans || []).length);
    return model;
  }

  // ---------- Carga automática (fetch) ----------
  function tryAutoFetch() {
    return fetch(State.EXCEL_PATH, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.arrayBuffer();
      })
      .then((buf) => {
        const wb = XLSX.read(buf, { type: 'array' });
        return buildAndStoreModel(wb, { source: 'auto', fileName: State.EXCEL_FILENAME, loadedAt: Date.now() }, buf);
      });
  }

  // ---------- Carga manual (file input / drag&drop) ----------
  function loadFromFile(file) {
    return file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf, { type: 'array' });
      return buildAndStoreModel(wb, { source: 'manual', fileName: file.name, loadedAt: Date.now() }, buf);
    });
  }

  // ---------- Cache local ----------
  function tryLoadFromCache() {
    const cached = State.getCachedData();
    if (!cached) return false;
    State.App.model = cached.model;
    State.App.dataMeta = Object.assign({ source: 'cache' }, cached.meta || {});
    console.log('[PF] Usando datos guardados en caché (el Excel no se pudo leer en esta carga). Packs en caché:', (cached.model.packEans || []).length);
    return true;
  }

  // ---------- Pantallas ----------
  function showLoading(show) {
    document.getElementById('loading-screen').hidden = !show;
  }
  function showFileLoader(show, opts) {
    const el = document.getElementById('file-loader-screen');
    el.hidden = !show;
    if (show && opts && opts.banner) {
      document.getElementById('loader-banner').hidden = false;
      document.getElementById('loader-banner').textContent = opts.banner;
    } else if (show) {
      document.getElementById('loader-banner').hidden = true;
    }
  }
  function showApp(show) {
    document.getElementById('app').hidden = !show;
  }

  function updateMonthLabel() {
    document.getElementById('topbar-month-label').textContent = State.currentMonthLabel();
  }

  function startApp() {
    showLoading(false);
    showFileLoader(false);
    showApp(true);
    updateMonthLabel();
    Router.buildDerivedIndexes();
    Router.renderSidebar();
    Router.initRouter();
  }

  function wireFileLoaderUI(onFile) {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const errorEl = document.getElementById('loader-error');

    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handle(e.target.files[0]);
    });
    ['dragenter', 'dragover'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((ev) => dropzone.addEventListener(ev, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
    dropzone.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handle(f);
    });

    function handle(file) {
      errorEl.textContent = '';
      if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
        errorEl.textContent = 'Ese archivo no parece un Excel (.xlsx). Probá con el archivo correcto.';
        return;
      }
      showLoading(true);
      showFileLoader(false);
      onFile(file).catch((err) => {
        showLoading(false);
        showFileLoader(true);
        errorEl.textContent = 'No se pudo leer el archivo: ' + err.message;
      });
    }
  }

  // ============================================================
  //  CONTRASEÑA DE ADMINISTRACIÓN
  //  Cambiá el valor de abajo por la contraseña que quieras usar.
  //  (Recordá: al ser una app sin servidor, esta clave no es un
  //   candado "de seguridad" fuerte, solo oculta el botón del
  //   usuario común.)
  // ============================================================
  const ADMIN_PASSWORD = 'Nacho123';
  const LS_ADMIN_UNLOCKED = 'pf_admin_unlocked_v1';

  function isAdminUnlocked() {
    try { return localStorage.getItem(LS_ADMIN_UNLOCKED) === '1'; } catch (e) { return false; }
  }
  function setAdminUnlocked() {
    try { localStorage.setItem(LS_ADMIN_UNLOCKED, '1'); } catch (e) { /* noop */ }
  }

  function openUpdateLoader() {
    showFileLoader(true);
    document.getElementById('loader-title').textContent = 'Actualizar datos';
    document.getElementById('loader-sub').textContent = 'Seleccioná el nuevo Excel de política comercial para refrescar la información.';
  }

  function wireUpdateDataButton() {
    const lock = document.getElementById('btn-admin-lock');
    if (!lock) return;

    // Si ya estaba desbloqueado en este navegador, mostramos el candado abierto.
    function refreshLockIcon() {
      const icon = lock.querySelector('i');
      if (!icon) return;
      if (isAdminUnlocked()) {
        icon.className = 'fa-solid fa-lock-open';
        lock.title = 'Actualizar Excel';
        lock.classList.add('unlocked');
      } else {
        icon.className = 'fa-solid fa-lock';
        lock.title = 'Administración';
        lock.classList.remove('unlocked');
      }
    }
    refreshLockIcon();

    lock.addEventListener('click', () => {
      if (isAdminUnlocked()) {
        // Ya desbloqueado: abre directo el cargador de Excel.
        openUpdateLoader();
        return;
      }
      const intento = window.prompt('Contraseña de administración:');
      if (intento === null) return; // canceló
      if (intento === ADMIN_PASSWORD) {
        setAdminUnlocked();
        refreshLockIcon();
        UI.toast('Modo administración activado');
        openUpdateLoader();
      } else {
        UI.toast('Contraseña incorrecta');
      }
    });
  }

  function init() {
    State.setTheme(State.getTheme());
    UI.initFavoriteDelegation();
    document.getElementById('topbar-month-label').textContent = State.MES_NOMBRE; // placeholder hasta cargar el Excel

    wireFileLoaderUI((file) => loadFromFile(file).then(() => { startApp(); UI.toast('Datos actualizados desde ' + file.name); }));
    wireUpdateDataButton();

    showLoading(true);
    tryAutoFetch()
      .then(() => startApp())
      .catch((err) => {
        console.warn('[PF] Falló la carga automática del Excel:', err);
        showLoading(false);
        const hadCache = tryLoadFromCache();
        if (hadCache) {
          startApp();
          UI.toast('Mostrando datos guardados localmente. Podés actualizar el Excel desde el menú.');
        } else {
          document.getElementById('loader-title').textContent = 'Cargá el archivo Excel';
          document.getElementById('loader-sub').textContent = 'No pudimos leer el Excel automáticamente desde esta carpeta. Seleccioná el archivo "' + State.EXCEL_FILENAME + '" para empezar.';
          showFileLoader(true);
        }
      });

    // Topbar: tema, sidebar móvil, búsqueda global
    document.getElementById('btn-theme').addEventListener('click', () => {
      const next = State.toggleTheme();
      document.getElementById('btn-theme').innerHTML = next === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    });
    document.getElementById('btn-theme').innerHTML = State.getTheme() === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';

    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.add('open');
      document.getElementById('sidebar-backdrop').classList.add('show');
    });
    document.getElementById('sidebar-backdrop').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop').classList.remove('show');
    });

    document.getElementById('main').addEventListener('scroll', () => {
      document.getElementById('topbar').classList.toggle('scrolled', document.getElementById('main').scrollTop > 4);
    });
    window.addEventListener('scroll', () => {
      document.getElementById('topbar').classList.toggle('scrolled', window.scrollY > 4);
    });
    Router.wireInlineSearch(document.getElementById('topbar-search'), document.getElementById('topbar-search-panel'));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
