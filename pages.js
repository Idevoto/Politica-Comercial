/**
 * pages.js — router + renderizado de cada sección de la app.
 */
(function (global) {
  'use strict';

  const NAV_ITEMS = [
    { key: 'inicio', label: 'Inicio', icon: 'fa-solid fa-house' },
    { key: 'descuentos', label: 'Descuentos', icon: 'fa-solid fa-tags' },
    { key: 'modulos', label: 'Módulos', icon: 'fa-solid fa-layer-group' },
    { key: 'cuentas', label: 'Cuentas Especiales', icon: 'fa-solid fa-handshake' },
    { key: 'favoritos', label: 'Favoritos', icon: 'fa-solid fa-star' },
    { key: 'novedades', label: 'Novedades', icon: 'fa-solid fa-bell' },
    { key: 'acerca', label: 'Acerca de', icon: 'fa-solid fa-circle-info' },
  ];

  function model() { return State.App.model; }

  // ---------- Índices derivados (se construyen una vez al cargar datos) ----------
  let productMap = null; // 'lab|ean' -> entry de productIndex
  function buildDerivedIndexes() {
    productMap = new Map();
    model().productIndex.forEach((e) => productMap.set(e.lab + '|' + (e.ean || e.producto), e));
  }
  function lookupProduct(lab, ean, producto) {
    return productMap.get(lab + '|' + (ean || producto)) || null;
  }

  function labCardHtml(lab) {
    const m = model();
    const meta = State.labMeta(lab);
    const nProd = m.descuentos.filter((d) => d.lab === lab).length;
    const nMod = (m.modulosPorLab[lab] || []).length;
    return `<div class="lab-card" data-lab="${UI.escapeHtml(lab)}">
        <div class="bar" style="background:${meta.bg};"></div>
        ${UI.labLogo(lab, 36)}
        <h3>${UI.escapeHtml(lab)}</h3>
        <div class="lab-meta">
          <div><div class="m-num">${nProd}</div><div class="m-label">Productos</div></div>
          <div><div class="m-num">${nMod}</div><div class="m-label">Módulos</div></div>
        </div>
      </div>`;
  }
  function wireLabCardClicks(grid) {
    grid.querySelectorAll('.lab-card').forEach((card) => {
      card.addEventListener('click', () => Router.go('laboratorios', { lab: card.getAttribute('data-lab') }));
    });
  }

  // ======================================================================
  // PRODUCT / MODULE DETAIL (modales)
  // ======================================================================
  function openProductDetail(lab, ean, productoFallback) {
    const entry = lookupProduct(lab, ean, productoFallback);
    const nombre = (entry && entry.producto) || productoFallback || 'Producto';
    const cuentas = model().cuentasEspeciales.filter((c) => c.lab === lab && c.ean === ean);
    const modulos = entry ? entry.modulos : [];

    const body = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        ${UI.labLogo(lab, 46)}
        <div>${UI.labPill(lab)}<div class="text-faint mono" style="font-size:11px;margin-top:4px;">${UI.escapeHtml(ean || 'sin código')}</div></div>
        <div style="margin-left:auto;">${UI.favToggleHtml(lab, ean, '')}</div>
      </div>
      <div class="detail-row"><span class="k">Descuento Especial</span><span class="v">${UI.discountOrDash(entry ? entry.especial : null, UI.fmtPctDirect)}</span></div>
      <div class="detail-row"><span class="k">Descuento Publicado</span><span class="v">${UI.discountOrDash(entry ? entry.publicado : null, UI.fmtPctDirect, { pub: true })}</span></div>
      <div class="detail-row"><span class="k">Descuento Exclusivo</span><span class="v">${UI.discountOrDash(entry ? entry.exclusivo : null, UI.fmtPctDirect)}</span></div>
      <div class="detail-row"><span class="k">Cuentas especiales con condición propia</span><span class="v">${cuentas.length}</span></div>
      <div style="margin-top:16px;">
        <div style="font-weight:700;font-size:12.5px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px;">
          Participa en ${modulos.length} módulo${modulos.length === 1 ? '' : 's'}
        </div>
        ${modulos.length ? modulos.map((m) => `<div class="module-line module-line-link" data-mod-id="${UI.escapeHtml(m.id)}"><span class="ml-name">${UI.escapeHtml(m.nombre)}</span><i class="fa-solid fa-arrow-right text-faint" style="font-size:11px;"></i></div>`).join('') : '<p class="text-faint" style="font-size:12.5px;">Este producto no forma parte de ningún módulo este mes.</p>'}
      </div>
      ${cuentas.length ? `<div style="margin-top:16px;">
        <div style="font-weight:700;font-size:12.5px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.03em;margin-bottom:8px;">Detalle por cuenta</div>
        ${cuentas.slice(0, 12).map((c) => `<div class="module-line"><span class="ml-name">${UI.escapeHtml(c.cliente)}</span>${UI.discountOrDash(c.descuento, UI.fmtPctDirect, { sm: true })}</div>`).join('')}
        ${cuentas.length > 12 ? `<p class="text-faint" style="font-size:11.5px;margin-top:6px;">+${cuentas.length - 12} cuentas más</p>` : ''}
      </div>` : ''}
    `;
    const modalEl = UI.showModal(`<i class="fa-solid fa-pills" style="color:var(--brand);margin-right:8px;"></i>${UI.escapeHtml(nombre)}`, body,
      `<button class="btn btn-ghost btn-sm" data-bs-dismiss="modal">Cerrar</button>`);

    modalEl.querySelectorAll('.module-line-link[data-mod-id]').forEach((el) => {
      el.addEventListener('click', () => {
        const modId = el.getAttribute('data-mod-id');
        const mod = (model().modulosPorLab[lab] || []).find((mo) => mo.id === modId);
        if (mod) openModuleDetail(mod, { lab, ean, producto: productoFallback });
      });
    });
  }

  function openModuleDetail(mod, back) {
    const lines = mod.productos.map((p, i) => {
      const dline = i === 0 ? mod.descuentoPrincipal : p.descuentoLinea;
      return `<div class="module-line">
        <span class="ml-name">${UI.escapeHtml(p.producto || '—')}</span>
        <div class="ml-cols">
          <span class="ml-qty">x${p.cantidad != null ? p.cantidad : '—'}</span>
          <span class="ml-desc">${dline != null ? UI.discountOrDash(dline, UI.fmtPctFraction, { sm: true }) : UI.dchip('—', { muted: true, sm: true })}</span>
        </div>
      </div>`;
    }).join('');

    const body = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        ${UI.labLogo(mod.lab, 46)}
        <div>${UI.labPill(mod.lab)} ${mod.categoria ? `<span class="text-faint" style="font-size:11.5px;margin-left:6px;">${UI.escapeHtml(mod.categoria)}</span>` : ''}</div>
        <div style="margin-left:auto;">${UI.favToggleModHtml(mod.id)}</div>
      </div>
      <div class="detail-row"><span class="k">Código de módulo</span><span class="v mono">${UI.escapeHtml(mod.codigo || '—')}</span></div>
      <div class="detail-row"><span class="k">Descuento principal</span><span class="v">${UI.discountOrDash(mod.descuentoPrincipal, UI.fmtPctFraction)}</span></div>
      <div class="detail-row"><span class="k">Cantidad total de unidades</span><span class="v mono">${mod.cantidadTotal != null ? mod.cantidadTotal : '—'}</span></div>
      ${mod.observacion ? `<div class="detail-row"><span class="k">Observación</span><span class="v">${UI.obsPill(mod.observacion)}</span></div>` : ''}
      <div style="margin-top:16px;">
        <div class="module-line module-line-head">
          <span class="ml-name">Productos del combo (${mod.productos.length})</span>
          <div class="ml-cols">
            <span class="ml-qty">Unid.</span>
            <span class="ml-desc">Desc.</span>
          </div>
        </div>
        ${lines}
      </div>
    `;
    UI.showModal(`<i class="fa-solid fa-layer-group" style="color:var(--brand);margin-right:8px;"></i>${UI.escapeHtml(mod.nombre)}`, body,
      `${back ? `<button class="btn btn-ghost btn-sm" id="btn-back-modulo"><i class="fa-solid fa-arrow-left"></i> Volver</button>` : ''}
       <button class="btn btn-ghost btn-sm" id="btn-print-modulo"><i class="fa-solid fa-print"></i> Exportar / Imprimir</button>
       <button class="btn btn-ghost btn-sm" data-bs-dismiss="modal">Cerrar</button>`);

    document.getElementById('btn-print-modulo').onclick = function () {
      document.body.classList.add('printing-modal');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-modal'), 300);
    };

    if (back) {
      document.getElementById('btn-back-modulo').onclick = function () {
        openProductDetail(back.lab, back.ean, back.producto);
      };
    }
  }

  // ======================================================================
  // INICIO
  // ======================================================================
  function pageInicio(container) {
    const m = model();
    const labs = m.labs;
    const totalModulos = labs.reduce((a, l) => a + (m.modulosPorLab[l] || []).length, 0);
    const totalCuentas = new Set(m.cuentasEspeciales.map((c) => c.cliente)).size;

    container.innerHTML = `
      <div class="hero">
        <div class="hero-eyebrow hero-eyebrow-mobile"><i class="fa-solid fa-bolt"></i> ${UI.escapeHtml(State.currentMonthLabel())}</div>
        <h1>Política Comercial</h1>
        <p class="lead">Consultá descuentos y módulos comerciales</p>
        <div class="hero-stats">
          <div class="hero-stat"><div class="num mono">${m.descuentos.length}</div><div class="lab">Productos con descuento</div></div>
          <div class="hero-stat"><div class="num mono">${totalModulos}</div><div class="lab">Módulos comerciales</div></div>
          <div class="hero-stat"><div class="num mono">${labs.length}</div><div class="lab">Laboratorios</div></div>
          <div class="hero-stat"><div class="num mono">${totalCuentas}</div><div class="lab">Cuentas especiales</div></div>
        </div>
      </div>
      <div class="page-head" style="margin-bottom:14px;"><h1 style="font-size:17px;">Acceso rápido por laboratorio</h1></div>
      <div class="lab-grid" id="home-lab-grid"></div>
    `;

    const grid = container.querySelector('#home-lab-grid');
    grid.innerHTML = labs.map(labCardHtml).join('');
    wireLabCardClicks(grid);
  }

  // ======================================================================
  // BÚSQUEDA (inline, usada en topbar y en home)
  // ======================================================================
  function searchProducts(query, limit) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const norm = (s) => String(s || '').toLowerCase();
    const out = [];
    for (const e of model().productIndex) {
      if (norm(e.producto).includes(q) || norm(e.lab).includes(q) || norm(e.ean).includes(q) || norm(e.sap).includes(q)) {
        out.push(e);
        if (out.length >= (limit || 8)) break;
      }
    }
    return out;
  }

  function searchResultRow(e) {
    return `<div class="search-result-item" data-lab="${UI.escapeHtml(e.lab)}" data-ean="${UI.escapeHtml(e.ean || '')}" data-producto="${UI.escapeHtml(e.producto || '')}">
      ${UI.labLogo(e.lab, 30)}
      <div class="sri-info">
        <div class="sri-name">${UI.escapeHtml(e.producto || '—')}</div>
        <div class="sri-meta">${UI.escapeHtml(e.lab)}</div>
      </div>
      <div class="sri-chips">
        <span class="sri-chip-slot" data-label="Excl.">${UI.discountOrDash(e.exclusivo, UI.fmtPctDirect, { sm: true })}</span>
        <span class="sri-chip-slot" data-label="Publ.">${UI.discountOrDash(e.publicado, UI.fmtPctDirect, { sm: true, pub: true })}</span>
        <span class="sri-chip-slot" data-label="Esp.">${UI.discountOrDash(e.especial, UI.fmtPctDirect, { sm: true })}</span>
        <span class="sri-chip-slot" data-label="Mód.">${e.modulos.length ? `<span class="dchip muted sm">${e.modulos.length}</span>` : UI.dchip('—', { muted: true, sm: true })}</span>
      </div>
    </div>`;
  }

  function searchResultHeader() {
    return `<div class="sri-header">
      <span class="sri-header-spacer"></span>
      <div class="sri-chips">
        <span class="sri-chip-slot head">Excl.</span>
        <span class="sri-chip-slot head">Publ.</span>
        <span class="sri-chip-slot head">Esp.</span>
        <span class="sri-chip-slot head">Mód.</span>
      </div>
    </div>`;
  }

  function wireInlineSearch(input, panel) {
    if (!input || !panel) return;
    panel.classList.add('search-panel');
    panel.style.display = 'none';
    let debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = input.value.trim();
        if (!q) { panel.style.display = 'none'; panel.innerHTML = ''; return; }
        const results = searchProducts(q, 8);
        panel.innerHTML = results.length
          ? searchResultHeader() + results.map(searchResultRow).join('') + `<div class="search-result-item" style="justify-content:center;color:var(--brand);font-weight:600;" id="sri-see-all">Ver todos los resultados para "${UI.escapeHtml(q)}"</div>`
          : UI.emptyState('fa-solid fa-magnifying-glass', 'Sin resultados', 'Probá con otro nombre, laboratorio o código.');
        panel.style.display = 'block';
        panel.querySelectorAll('.search-result-item[data-lab]').forEach((row) => {
          row.addEventListener('click', () => {
            panel.style.display = 'none';
            openProductDetail(row.getAttribute('data-lab'), row.getAttribute('data-ean'), row.getAttribute('data-producto'));
          });
        });
        const seeAll = panel.querySelector('#sri-see-all');
        if (seeAll) seeAll.addEventListener('click', () => { panel.style.display = 'none'; Router.go('buscar', { q }); });
      }, 120);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) { panel.style.display = 'none'; Router.go('buscar', { q: input.value.trim() }); }
      if (e.key === 'Escape') panel.style.display = 'none';
    });
    document.addEventListener('click', (e) => { if (!panel.contains(e.target) && e.target !== input) panel.style.display = 'none'; });
  }

  // ======================================================================
  // DESCUENTOS
  // ======================================================================
  let dtDescuentos = null;
  const PACK_LABS = ['Roemmers', 'Siegfried'];
  function labShowsPacks(lab) {
    return lab === 'todos' || PACK_LABS.includes(lab);
  }
  let descResizeListener = null;

  function pageDescuentos(container, params) {
    const m = model();
    const activeLab = (params && params.lab) || 'todos';
    const embeddedInLab = !!(params && params.embeddedInLab); // está dentro de la vista de un laboratorio
    const packSet = new Set(m.packEans || []);
    let packsOnly = false;
    let descEspecialOnly = false;

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Descuentos individuales</h1><p class="subtitle">Descuento Especial, Publicado y Exclusivo vigentes por producto — ${UI.escapeHtml(State.currentMonthLabel())}.</p></div>
        <div class="page-actions">
          <button class="btn btn-ghost" id="btn-export-excel-descuentos"><i class="fa-solid fa-file-excel"></i> Exportar a Excel</button>
          <button class="btn btn-ghost" id="btn-print-descuentos"><i class="fa-solid fa-print"></i> Imprimir / PDF</button>
        </div>
      </div>
      <div class="filter-bar" id="desc-filters">
        <span class="filter-label">Laboratorio</span>
        <span class="chip ${activeLab === 'todos' ? 'active' : ''}" data-lab="todos">Todos</span>
        ${m.labs.map((l) => `<span class="chip ${activeLab === l ? 'active' : ''}" data-lab="${UI.escapeHtml(l)}"><span class="dot" style="background:${State.labMeta(l).bg}"></span>${UI.escapeHtml(l)}</span>`).join('')}
        ${packSet.size ? `<span style="flex:1"></span><span class="chip" id="btn-packs-toggle" ${labShowsPacks(activeLab) ? '' : 'hidden'}><i class="fa-solid fa-box"></i> Packs</span>` : ''}
        <span class="chip mobile-only-chip" id="btn-desc-especial-toggle" ${labShowsPacks(activeLab) ? '' : 'hidden'}><i class="fa-solid fa-star"></i> Desc. Especial</span>
      </div>
      <div class="table-card">
          <table id="tbl-descuentos" class="styled-table dataTable" style="width:100%">
            <tbody></tbody>
          </table>
      </div>
      <div id="print-descuentos-area"></div>
    `;

    let printMode = false; // se activa solo mientras se imprime
    function isMobileView() { return window.innerWidth <= 560; }
    function isDescEspecial(v) { return v != null && Math.abs(Math.abs(v) - 1.45) < 0.001; }
    // La columna "Especial" solo aplica a Roemmers y Siegfried (y a "Todos", que los incluye).
    function showsEspecial(lab) { return labShowsPacks(lab); }

    // --- Ordenamiento numérico de las columnas de descuento ---
    // Los descuentos vienen con signo negativo (-15 = 15% de descuento). Para que
    // ordenar por Exclusivo/Publicado/Especial vaya "de mayor a menor descuento",
    // usamos la MAGNITUD (valor absoluto) como clave de orden. Los vacíos (—) van
    // al final. Cada celda se pasa como objeto { display, sort }: DataTables
    // muestra `display` (el chip) y ordena por `sort` (el número).
    function descCell(value, opts) {
      const magnitud = (value === null || value === undefined) ? -1 : Math.abs(value);
      return { display: UI.discountOrDash(value, UI.fmtPctDirect, opts), sort: magnitud };
    }
    // Render que entiende tanto el objeto {display, sort} como un string suelto.
    function renderDesc(data, type) {
      if (data && typeof data === 'object') {
        if (type === 'sort' || type === 'type') return data.sort;
        if (type === 'filter') return String(data.display || '').replace(/<[^>]*>/g, '');
        return data.display;
      }
      return data;
    }
    // La celda de Producto es HTML (<span ...>NOMBRE</span>). Para que el orden
    // alfabético use el NOMBRE y no los atributos del HTML, al ordenar/filtrar
    // devolvemos solo el texto (el atributo data-producto tiene el nombre limpio).
    function renderProducto(data, type) {
      if (type === 'sort' || type === 'type' || type === 'filter') {
        const m1 = /data-producto="([^"]*)"/.exec(String(data || ''));
        if (m1) return m1[1];
        return String(data || '').replace(/<[^>]*>/g, '');
      }
      return data;
    }

    function rowsFor(lab) {
      let list = lab === 'todos' ? m.descuentos : m.descuentos.filter((d) => d.lab === lab);
      if (packsOnly) list = list.filter((d) => packSet.has(d.ean));
      const mobile = isMobileView();
      const conEspecial = showsEspecial(lab);
      if (mobile && descEspecialOnly) list = list.filter((d) => isDescEspecial(d.especial));
      return list.map((d) => {
        const entry = lookupProduct(d.lab, d.ean, d.producto);
        const nMod = entry ? entry.modulos.length : 0;
        const productoCell = `<span data-lab="${UI.escapeHtml(d.lab)}" data-ean="${UI.escapeHtml(d.ean || '')}" data-producto="${UI.escapeHtml(d.producto)}" class="row-open" title="${UI.escapeHtml(d.producto)}" style="cursor:pointer;font-weight:600;">${UI.escapeHtml(d.producto)}</span>`;
        const modChip = nMod ? `<span class="dchip muted sm">${nMod}</span>` : UI.dchip('—', { muted: true, sm: true });

        // --- Impresión: mismas columnas que se ven en pantalla, pero sin la de favorito ---
        if (printMode) {
          if (mobile) {
            const row = [
              productoCell,
              UI.discountOrDash(d.exclusivo, UI.fmtPctDirect, { sm: true }),
              UI.discountOrDash(d.publicado, UI.fmtPctDirect, { sm: true, pub: true }),
            ];
            if (conEspecial) row.push(UI.discountOrDash(d.especial, UI.fmtPctDirect, { sm: true }));
            return row;
          }
          const row = [
            UI.labPill(d.lab, 'sm'),
            productoCell,
            UI.discountOrDash(d.exclusivo, UI.fmtPctDirect, { sm: true }),
            UI.discountOrDash(d.publicado, UI.fmtPctDirect, { sm: true, pub: true }),
          ];
          if (conEspecial) row.push(UI.discountOrDash(d.especial, UI.fmtPctDirect, { sm: true }));
          return row;
        }

        if (mobile && descEspecialOnly) {
          return [productoCell, descCell(d.especial)];
        }
        if (mobile) {
          return [
            UI.favToggleHtml(d.lab, d.ean),
            productoCell,
            descCell(d.exclusivo, { sm: true }),
            descCell(d.publicado, { sm: true, pub: true }),
            modChip,
          ];
        }
        const row = [
          UI.favToggleHtml(d.lab, d.ean),
          UI.labPill(d.lab, 'sm'),
          productoCell,
          descCell(d.exclusivo),
          descCell(d.publicado, { pub: true }),
        ];
        if (conEspecial) row.push(descCell(d.especial));
        row.push(modChip);
        return row;
      });
    }

    function mountTable(lab, stateOverride) {
      if (dtDescuentos) { try { dtDescuentos.destroy(); } catch (e) { /* noop */ } dtDescuentos = null; }
      // Limpieza completa: si la cantidad de columnas cambia (mobile <-> desktop, o
      // al mostrar/ocultar Especial), DataTables necesita la tabla en blanco antes de reiniciar.
      document.getElementById('tbl-descuentos').innerHTML = '<tbody></tbody>';
      const mobile = isMobileView();
      const conEspecial = showsEspecial(lab);
      // Clase para que el CSS mobile del layout "Desc. Especial" (2 columnas) pueda
      // fijar el ancho del descuento a la derecha y que no se superponga al producto.
      document.getElementById('tbl-descuentos').classList.toggle('mode-desc-especial', !!(mobile && descEspecialOnly));
      let columns, orderIdx;

      const colExcl = { title: '<span class="th-full">Exclusivo</span><span class="th-short">Excl.</span>', width: '76px', className: 'td-desc', render: renderDesc, type: 'num' };
      const colPubl = { title: '<span class="th-full">Publicado</span><span class="th-short">Publ.</span>', width: '76px', className: 'td-desc', render: renderDesc, type: 'num' };
      const colEsp  = { title: '<span class="th-full">Especial</span><span class="th-short">Esp.</span>', width: '76px', className: 'td-desc', render: renderDesc, type: 'num' };
      const colMod  = { title: '<span class="th-full">Módulos</span><span class="th-short">Mód.</span>', width: '66px', orderable: false, className: 'td-desc' };

      if (printMode && mobile) {
        columns = [
          { title: 'Producto', className: 'td-producto' },
          { title: 'Excl.', className: 'td-desc' },
          { title: 'Publ.', className: 'td-desc' },
        ];
        if (conEspecial) columns.push({ title: 'Desc. Esp.', className: 'td-desc' });
        orderIdx = 0;
      } else if (printMode) {
        columns = [
          { title: 'Laboratorio', width: '95px' },
          { title: 'Producto', className: 'td-producto' },
          { title: 'Excl.', className: 'td-desc' },
          { title: 'Publ.', className: 'td-desc' },
        ];
        if (conEspecial) columns.push({ title: 'Desc. Esp.', className: 'td-desc' });
        orderIdx = 1;
      } else if (mobile && descEspecialOnly) {
        columns = [
          { title: 'Producto', className: 'td-producto', render: renderProducto },
          { title: 'Descuento Especial', width: '110px', render: renderDesc, type: 'num' },
        ];
        orderIdx = 0;
      } else if (mobile) {
        columns = [
          { width: '20px', orderable: false },
          { title: 'Producto', className: 'td-producto', render: renderProducto },
          { title: 'Excl.', width: '42px', render: renderDesc, type: 'num' },
          { title: 'Publ.', width: '42px', render: renderDesc, type: 'num' },
          { title: 'Mod.', width: '34px', orderable: false },
        ];
        orderIdx = 1;
      } else {
        columns = [
          { width: '26px', orderable: false },
          { title: 'Laboratorio', width: '95px' },
          { title: 'Producto', className: 'td-producto', render: renderProducto },
          colExcl,
          colPubl,
        ];
        if (conEspecial) columns.push(colEsp);
        columns.push(colMod);
        orderIdx = 2;
      }
      // Orden inicial: el que venga en stateOverride (para preservar lo que el
      // usuario eligió al imprimir), o el orden por defecto de este layout.
      const initialOrder = (stateOverride && stateOverride.order) ? stateOverride.order : [[orderIdx, 'asc']];
      const initialSearch = (stateOverride && stateOverride.search) ? stateOverride.search : '';

      dtDescuentos = $('#tbl-descuentos').DataTable({
        data: rowsFor(lab),
        columns: columns,
        autoWidth: false,
        pageLength: mobile ? 15 : 25,
        lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'Todos']],
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-AR.json' },
        order: initialOrder,
        search: { search: initialSearch },
        scrollY: (mobile || printMode) ? '' : '68vh',
        scrollCollapse: !(mobile || printMode),
      });
      $('#tbl-descuentos tbody').off('click').on('click', '.row-open', function () {
        openProductDetail($(this).data('lab'), $(this).data('ean'), $(this).data('producto'));
      });
    }

    // Remonta la tabla (cambio de lab / packs / desc. especial) SIN que la página
    // salte hasta arriba. Guardamos la posición y la sostenemos unos frames, porque
    // DataTables (scrollY) reajusta el layout después del remonte y eso vuelve a
    // tirar la vista arriba. Si el usuario scrollea a propósito, dejamos de forzar.
    function mountTableKeepScroll(lab) {
      const mainEl = document.getElementById('main');
      const winY = window.scrollY || window.pageYOffset || 0;
      const mainY = mainEl ? mainEl.scrollTop : 0;

      // Evitar el colapso de altura: mientras se destruye/recrea la tabla, el
      // contenedor queda casi sin alto y el documento se acorta, lo que hace que el
      // navegador suba el scroll. Reservamos su altura actual durante el remonte.
      const card = container.querySelector('.table-card');
      const prevMinH = card ? card.style.minHeight : '';
      if (card) card.style.minHeight = card.offsetHeight + 'px';

      mountTable(lab);

      let cancelled = false;
      const onUserScroll = () => { cancelled = true; };
      window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
      window.addEventListener('touchmove', onUserScroll, { passive: true, once: true });

      const restore = () => {
        if (cancelled) return;
        if (winY) window.scrollTo(0, winY);
        if (mainEl && mainY) mainEl.scrollTop = mainY;
      };
      restore();
      requestAnimationFrame(restore);
      let n = 0;
      const iv = setInterval(() => {
        restore();
        if (cancelled || ++n >= 10) {
          clearInterval(iv);
          if (card) card.style.minHeight = prevMinH; // liberar la altura reservada
          window.removeEventListener('wheel', onUserScroll);
          window.removeEventListener('touchmove', onUserScroll);
        }
      }, 30);
    }

    mountTable(activeLab);

    let wasMobile = isMobileView();
    if (descResizeListener) window.removeEventListener('resize', descResizeListener);
    descResizeListener = () => {
      const nowMobile = isMobileView();
      if (nowMobile !== wasMobile) {
        wasMobile = nowMobile;
        const activeChip = container.querySelector('#desc-filters .chip[data-lab].active');
        mountTable(activeChip ? activeChip.getAttribute('data-lab') : 'todos');
      }
    };
    window.addEventListener('resize', descResizeListener);

    const btnPacks = container.querySelector('#btn-packs-toggle');
    const btnDescEspecial = container.querySelector('#btn-desc-especial-toggle');

    container.querySelectorAll('#desc-filters .chip[data-lab]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const lab = chip.getAttribute('data-lab');
        // Dentro de la vista de un laboratorio, cambiar de lab navega a la vista de
        // ese otro laboratorio, para que el título, el logo y los contadores queden
        // coherentes con la tabla. "Todos" vuelve a la vista general de Descuentos.
        if (embeddedInLab) {
          Router.go('laboratorios', { lab: lab }, { keepScroll: true });
          return;
        }
        container.querySelectorAll('#desc-filters .chip[data-lab]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const shouldShow = labShowsPacks(lab);
        if (btnPacks) {
          btnPacks.hidden = !shouldShow;
          if (!shouldShow && packsOnly) {
            packsOnly = false;
            btnPacks.classList.remove('active');
          }
        }
        if (btnDescEspecial) {
          btnDescEspecial.hidden = !shouldShow;
          if (!shouldShow && descEspecialOnly) {
            descEspecialOnly = false;
            btnDescEspecial.classList.remove('active');
          }
        }
        mountTableKeepScroll(lab);
      });
    });

    if (btnPacks) {
      btnPacks.addEventListener('click', () => {
        packsOnly = !packsOnly;
        btnPacks.classList.toggle('active', packsOnly);
        const activeChip = container.querySelector('#desc-filters .chip[data-lab].active');
        mountTableKeepScroll(activeChip ? activeChip.getAttribute('data-lab') : 'todos');
      });
    }

    if (btnDescEspecial) {
      btnDescEspecial.addEventListener('click', () => {
        descEspecialOnly = !descEspecialOnly;
        btnDescEspecial.classList.toggle('active', descEspecialOnly);
        const activeChip = container.querySelector('#desc-filters .chip[data-lab].active');
        mountTableKeepScroll(activeChip ? activeChip.getAttribute('data-lab') : 'todos');
      });
    }

    container.querySelector('#btn-print-descuentos').addEventListener('click', () => {
      const activeChip = container.querySelector('#desc-filters .chip[data-lab].active');
      const activeLabNow = activeChip ? activeChip.getAttribute('data-lab') : 'todos';
      const mobile = isMobileView();
      const conEspecial = showsEspecial(activeLabNow);

      // En vez de remontar la DataTable (lo que producía el "parpadeo" de encabezados
      // y era lento), armamos una tabla estática con las filas visibles actuales,
      // respetando filtro y orden. Sacamos las columnas de Favorito y Módulos.
      const dispDesc = (cell) => (cell && typeof cell === 'object') ? cell.display : (cell != null ? cell : '');
      const rows = dtDescuentos.rows({ search: 'applied', order: 'applied' }).data().toArray();

      // Índices de columna según el layout de pantalla vigente:
      //  - mobile Desc.Especial: [producto, especial]
      //  - mobile normal:        [fav, producto, excl, publ, mod]
      //  - desktop normal:       [fav, lab, producto, excl, publ, (esp), mod]
      let headHtml, bodyHtml;
      if (mobile && descEspecialOnly) {
        headHtml = '<th>Producto</th><th>Desc. Esp.</th>';
        bodyHtml = rows.map((r) => `<tr><td class="td-producto">${r[0]}</td><td class="td-desc">${dispDesc(r[1])}</td></tr>`).join('');
      } else if (mobile) {
        headHtml = '<th>Producto</th><th>Excl.</th><th>Publ.</th>';
        bodyHtml = rows.map((r) => `<tr><td class="td-producto">${r[1]}</td><td class="td-desc">${dispDesc(r[2])}</td><td class="td-desc">${dispDesc(r[3])}</td></tr>`).join('');
      } else {
        headHtml = `<th>Laboratorio</th><th>Producto</th><th>Excl.</th><th>Publ.</th>${conEspecial ? '<th>Desc. Esp.</th>' : ''}`;
        bodyHtml = rows.map((r) => {
          const espCell = conEspecial ? `<td class="td-desc">${dispDesc(r[5])}</td>` : '';
          return `<tr><td>${r[1]}</td><td class="td-producto">${r[2]}</td><td class="td-desc">${dispDesc(r[3])}</td><td class="td-desc">${dispDesc(r[4])}</td>${espCell}</tr>`;
        }).join('');
      }

      const printArea = container.querySelector('#print-descuentos-area');
      printArea.innerHTML = `<table class="styled-table print-desc-table">
        <thead><tr>${headHtml}</tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>`;
      document.body.classList.add('printing-descuentos');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-descuentos'), 300);
    });
    container.querySelector('#btn-export-excel-descuentos').addEventListener('click', () => State.downloadCurrentExcel());
  }

  // ======================================================================
  // MÓDULOS
  // ======================================================================
  function moduleCardHtml(mod) {
    const meta = State.labMeta(mod.lab);
    const visibleProductos = mod.productos.slice(0, 3);
    const restCount = mod.productos.length - visibleProductos.length;
    return `<div class="module-card" data-mod-id="${UI.escapeHtml(mod.id)}" style="border-top:3px solid ${meta.bg};">
      <div class="mc-desktop">
        <div class="mc-top">
          <div style="min-width:0;flex:1;">
            <div class="mc-name" title="${UI.escapeHtml(mod.nombre)}">${UI.escapeHtml(mod.nombre)}</div>
            <div class="mc-code">${UI.escapeHtml(mod.codigo || mod.lab.toUpperCase())}</div>
          </div>
          ${UI.discountOrDash(mod.descuentoPrincipal, UI.fmtPctFraction)}
        </div>
        ${mod.observacion ? UI.obsPill(mod.observacion) : ''}
        <div class="mc-products">
          ${visibleProductos.map((p) => `<div class="mc-prod-line" title="${UI.escapeHtml(p.producto || '—')}">• ${UI.escapeHtml(p.producto || '—')}</div>`).join('')}
          ${restCount > 0 ? `<div class="more">+${restCount} producto${restCount === 1 ? '' : 's'} más</div>` : ''}
        </div>
        <div class="mc-foot">
          <span class="mc-qty">Unidades totales: <b>${mod.cantidadTotal != null ? mod.cantidadTotal : '—'}</b></span>
          <span class="mc-foot-right">
            ${UI.favToggleModHtml(mod.id)}
            ${UI.labPill(mod.lab, 'sm')}
          </span>
        </div>
      </div>
      <div class="mc-mobile">${moduleCardMobileHtml(mod)}</div>
    </div>`;
  }

  // Versión compacta (estilo mini-ficha) usada en la vista de Tarjetas solo en celular.
  function moduleCardMobileHtml(mod) {
    const rows = mod.productos.map((p, i) => {
      const dline = i === 0 ? mod.descuentoPrincipal : p.descuentoLinea;
      return `<tr>
        <td title="${UI.escapeHtml(p.producto || '—')}">${UI.escapeHtml(p.producto || '—')}</td>
        <td class="mcm-num">x${p.cantidad != null ? p.cantidad : '—'}</td>
        <td class="mcm-num">${UI.discountOrDash(dline, UI.fmtPctFraction, { sm: true })}</td>
      </tr>`;
    }).join('');
    return `
      <div class="mcm-head">
        <div class="mcm-title" title="${UI.escapeHtml(mod.nombre)}">${UI.escapeHtml(mod.nombre)}</div>
        <div class="mcm-lab">${UI.favToggleModHtml(mod.id)} ${UI.escapeHtml(mod.lab)}</div>
      </div>
      <div class="mcm-meta">
        <span>Cód: <b>${UI.escapeHtml(mod.codigo || '—')}</b></span>
        <span>Desc: ${UI.discountOrDash(mod.descuentoPrincipal, UI.fmtPctFraction, { sm: true })}</span>
        <span>Unid: <b>${mod.cantidadTotal != null ? mod.cantidadTotal : '—'}</b></span>
      </div>
      ${mod.observacion ? `<div class="mcm-obs">${UI.escapeHtml(mod.observacion)}</div>` : ''}
      <table class="mcm-table">
        <thead><tr><th>Producto</th><th>Unid.</th><th>Desc.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function moduleListRowHtml(mod) {
    const meta = State.labMeta(mod.lab);
    return `<div class="module-list-row" data-mod-id="${UI.escapeHtml(mod.id)}" style="border-left:3px solid ${meta.bg};">
      <span class="mlr-fav">${UI.favToggleModHtml(mod.id)}</span>
      <span class="mlr-lab">${UI.labPill(mod.lab, 'sm')}</span>
      <div class="mlr-main">
        <div class="mlr-name">${UI.escapeHtml(mod.nombre)}</div>
        <div class="mlr-meta">
          <span class="mono">${UI.escapeHtml(mod.codigo || '—')}</span>
          <span>·</span>
          <span>${mod.productos.length} producto${mod.productos.length === 1 ? '' : 's'}</span>
          ${mod.observacion ? `<span>·</span>${UI.obsPill(mod.observacion)}` : ''}
        </div>
      </div>
      <span class="mlr-qty">Unidades: <b>${mod.cantidadTotal != null ? mod.cantidadTotal : '—'}</b></span>
      ${UI.discountOrDash(mod.descuentoPrincipal, UI.fmtPctFraction)}
      <i class="fa-solid fa-chevron-right text-faint" style="font-size:11px;"></i>
    </div>`;
  }

  function moduleCardPrintHtml(mod) {
    const meta = State.labMeta(mod.lab);
    const rows = mod.productos.map((p, i) => {
      const dline = i === 0 ? mod.descuentoPrincipal : p.descuentoLinea;
      return `<tr>
        <td>${UI.escapeHtml(p.producto || '—')}</td>
        <td class="pc-num">x${p.cantidad != null ? p.cantidad : '—'}</td>
        <td class="pc-num">${dline != null ? UI.fmtPctFraction(dline) : '—'}</td>
      </tr>`;
    }).join('');
    return `<div class="print-mod-card" style="border-top-color:${meta.bg};">
      <div class="pmc-head">
        <div class="pmc-title">${UI.escapeHtml(mod.nombre)}</div>
        <div class="pmc-badge" style="background:${meta.bg};color:${meta.text};">${UI.escapeHtml(mod.lab)}</div>
      </div>
      <div class="pmc-meta">
        <span>Cód: <b>${UI.escapeHtml(mod.codigo || '—')}</b></span>
        <span>Desc: ${UI.discountOrDash(mod.descuentoPrincipal, UI.fmtPctFraction, { sm: true })}</span>
        <span>Unid: <b>${mod.cantidadTotal != null ? mod.cantidadTotal : '—'}</b></span>
      </div>
      ${mod.observacion ? `<div class="pmc-obs">${UI.escapeHtml(mod.observacion)}</div>` : ''}
      <table class="pmc-table">
        <thead><tr><th>Producto</th><th>Unid.</th><th>Desc.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  // Fila compacta para imprimir la vista de Lista (una línea por módulo).
  function moduleRowPrintHtml(mod) {
    const meta = State.labMeta(mod.lab);
    const desc = UI.fmtPctFraction(mod.descuentoPrincipal);
    return `<div class="print-mod-row" style="border-left-color:${meta.bg};">
      <span class="pmr-lab" style="background:${meta.bg};color:${meta.text};">${UI.escapeHtml(mod.lab)}</span>
      <div class="pmr-main">
        <span class="pmr-name">${UI.escapeHtml(mod.nombre)}</span>
        <span class="pmr-code">${UI.escapeHtml(mod.codigo || '—')}</span>
        <span class="pmr-prods">${mod.productos.length} producto${mod.productos.length === 1 ? '' : 's'}</span>
        ${mod.observacion ? `<span class="pmr-obs">${UI.escapeHtml(mod.observacion)}</span>` : ''}
      </div>
      <div class="pmr-cols">
        <span class="pmr-unid">Unid: <b>${mod.cantidadTotal != null ? mod.cantidadTotal : '—'}</b></span>
        <span class="pmr-desc">${desc != null ? desc : '—'}</span>
      </div>
    </div>`;
  }

  function pageModulos(container, params) {
    const m = model();
    const labs = m.labs;
    let activeLab = (params && params.lab) || labs[0];
    const embeddedInLab = !!(params && params.embeddedInLab);
    let activeCat = 'todas';
    let query = '';
    let viewMode = State.getModulosView();

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Módulos comerciales</h1><p class="subtitle">Combos, condiciones y descuentos por módulo.</p></div>
        <div class="page-actions">
          <div class="view-toggle" id="view-toggle">
            <button class="view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}" data-view="cards" title="Ver como tarjetas"><i class="fa-solid fa-table-cells-large"></i><span>Tarjetas</span></button>
            <button class="view-toggle-btn ${viewMode === 'list' ? 'active' : ''}" data-view="list" title="Ver como lista"><i class="fa-solid fa-list"></i><span>Lista</span></button>
          </div>
          <button class="btn btn-ghost" id="btn-print-modulos"><i class="fa-solid fa-print"></i> Imprimir / PDF</button>
        </div>
      </div>
      <div class="filter-bar">
        <span class="filter-label">Laboratorio</span>
        ${labs.map((l) => `<span class="chip ${l === activeLab ? 'active' : ''}" data-lab="${UI.escapeHtml(l)}"><span class="dot" style="background:${State.labMeta(l).bg}"></span>${UI.escapeHtml(l)}</span>`).join('')}
        <span style="flex:1"></span>
        <input class="input" id="mod-search" style="width:220px;" placeholder="Buscar módulo o producto...">
      </div>
      <div id="cat-filters" class="filter-bar" style="display:none;"></div>
      <div id="modulos-output"></div>
      <div id="print-modulos-area"></div>
    `;

    let lastFiltered = [];

    function render() {
      const all = activeLab === 'todos'
        ? labs.reduce((acc, l) => acc.concat(m.modulosPorLab[l] || []), [])
        : (m.modulosPorLab[activeLab] || []);
      const q = query.trim().toLowerCase();
      const filtered = all.filter((mod) => {
        if (q && !mod.nombre.toLowerCase().includes(q) && !mod.productos.some((p) => (p.producto || '').toLowerCase().includes(q))) return false;
        if (activeCat !== 'todas' && (mod.categoria || 'General') !== activeCat) return false;
        return true;
      });

      const cats = Array.from(new Set(all.map((mo) => mo.categoria || 'General')));
      lastFiltered = filtered;
      const catBar = container.querySelector('#cat-filters');
      if (cats.length > 1) {
        catBar.style.display = 'flex';
        catBar.innerHTML = `<span class="filter-label">Categoría</span>
          <span class="chip ${activeCat === 'todas' ? 'active' : ''}" data-cat="todas">Todas</span>
          ${cats.map((c) => `<span class="chip ${activeCat === c ? 'active' : ''}" data-cat="${UI.escapeHtml(c)}">${UI.escapeHtml(c)}</span>`).join('')}`;
        catBar.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', (ev) => {
          ev.stopPropagation();
          activeCat = chip.getAttribute('data-cat'); renderKeepScroll();
        }));
      } else {
        catBar.style.display = 'none';
        activeCat = 'todas';
      }

      const out = container.querySelector('#modulos-output');
      if (!filtered.length) {
        out.innerHTML = UI.emptyState('fa-solid fa-layer-group', 'Sin módulos para mostrar', 'No encontramos módulos que coincidan con el filtro actual.');
        return;
      }

      const itemHtml = viewMode === 'list' ? moduleListRowHtml : moduleCardHtml;
      const wrapOpen = viewMode === 'list' ? '<div class="module-list">' : '<div class="module-grid">';
      const wrapClose = '</div>';
      const itemSelector = viewMode === 'list' ? '.module-list-row' : '.module-card';

      if (!q && activeCat === 'todas' && cats.length > 1) {
        out.innerHTML = cats.map((cat) => {
          const list = filtered.filter((mo) => (mo.categoria || 'General') === cat);
          if (!list.length) return '';
          return `<div class="cat-divider">${UI.escapeHtml(cat)} · ${list.length}</div>${wrapOpen}${list.map(itemHtml).join('')}${wrapClose}`;
        }).join('');
      } else {
        out.innerHTML = `${wrapOpen}${filtered.map(itemHtml).join('')}${wrapClose}`;
      }

      out.querySelectorAll(itemSelector).forEach((card) => {
        card.addEventListener('click', () => {
          const mod = all.find((mo) => mo.id === card.getAttribute('data-mod-id'));
          if (mod) openModuleDetail(mod);
        });
      });
    }

    // Re-renderiza el listado de módulos. Para cambio de CATEGORÍA el resultado
    // suele ser más corto, así que en vez de intentar mantener una posición que
    // quizá ya no exista (y terminar saltando al tope), llevamos la vista al inicio
    // del listado de módulos: la barra de laboratorio/categoría queda arriba y se
    // ven los resultados filtrados desde el principio, sin saltos bruscos.
    function renderAndScrollToFilters() {
      render();
      const anchor = container.querySelector('#cat-filters') || container.querySelector('.filter-bar');
      if (anchor && anchor.scrollIntoView) {
        anchor.scrollIntoView({ block: 'start' });
      }
    }
    // Re-render conservando la posición actual. Para que el scroll no salte cuando
    // el nuevo listado es más corto (p.ej. al filtrar por categoría), reservamos la
    // altura del bloque de salida durante el redibujado, así el documento no se
    // encoge de golpe. Liberamos la altura cuando el contenido nuevo se estabiliza.
    function renderKeepScroll() {
      const se = document.scrollingElement || document.documentElement;
      const y = se ? se.scrollTop : (window.scrollY || 0);
      const out = container.querySelector('#modulos-output');
      const reservedH = out ? out.offsetHeight : 0;
      if (out && reservedH) out.style.minHeight = reservedH + 'px';

      render();

      const restore = () => { window.scrollTo(0, y); if (se) se.scrollTop = y; };
      restore();
      requestAnimationFrame(restore);
      const outNew = container.querySelector('#modulos-output');
      let n = 0, lastH = -1, stable = 0;
      const iv = setInterval(() => {
        restore();
        n++;
        let realH = 0;
        if (outNew) {
          const prev = outNew.style.minHeight;
          outNew.style.minHeight = '0px';
          realH = outNew.scrollHeight;
          outNew.style.minHeight = prev;
        }
        if (realH === lastH) stable++; else { stable = 0; lastH = realH; }
        if (stable >= 4 || n >= 60) {
          clearInterval(iv);
          if (outNew) outNew.style.minHeight = '';
          restore();
        }
      }, 30);
    }

    container.querySelectorAll('.filter-bar .chip[data-lab]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const lab = chip.getAttribute('data-lab');
        // Dentro de la vista de un laboratorio, cambiar de lab navega a la vista de
        // ese otro laboratorio (título/logo/contadores coherentes), en la solapa
        // Módulos y sin saltar el scroll.
        if (embeddedInLab) {
          Router.go('laboratorios', { lab: lab, tab: 'modulos' }, { keepScroll: true });
          return;
        }
        container.querySelectorAll('.filter-bar .chip[data-lab]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        activeLab = lab;
        activeCat = 'todas';
        render();
      });
    });
    container.querySelector('#mod-search').addEventListener('input', (e) => { query = e.target.value; render(); });
    container.querySelector('#btn-print-modulos').addEventListener('click', () => {
      const printArea = container.querySelector('#print-modulos-area');
      if (viewMode === 'list') {
        printArea.innerHTML = `<div class="print-mod-list">${lastFiltered.map(moduleRowPrintHtml).join('')}</div>`;
      } else {
        printArea.innerHTML = `<div class="print-mod-grid">${lastFiltered.map(moduleCardPrintHtml).join('')}</div>`;
      }
      document.body.classList.add('printing-modulos');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-modulos'), 300);
    });
    container.querySelectorAll('#view-toggle .view-toggle-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        viewMode = btn.getAttribute('data-view');
        State.setModulosView(viewMode);
        container.querySelectorAll('#view-toggle .view-toggle-btn').forEach((b) => b.classList.toggle('active', b === btn));
        render();
      });
    });

    render();
  }

  // ======================================================================
  // LABORATORIOS
  // ======================================================================
  function pageLaboratorios(container, params) {
    const m = model();
    if (params && params.lab) return pageLaboratorioDetalle(container, params.lab, params.tab);

    container.innerHTML = `
      <div class="page-head"><div><h1>Laboratorios</h1><p class="subtitle">Elegí un laboratorio para ver sus descuentos y módulos.</p></div></div>
      <div class="lab-grid" id="labs-grid"></div>
    `;
    const grid = container.querySelector('#labs-grid');
    grid.innerHTML = m.labs.map(labCardHtml).join('');
    wireLabCardClicks(grid);
  }

  function pageLaboratorioDetalle(container, lab, initialTab) {
    const m = model();
    const esTodos = (lab === 'todos');
    const meta = State.labMeta(lab);
    const nProd = esTodos ? m.descuentos.length : m.descuentos.filter((d) => d.lab === lab).length;
    const nMod = esTodos
      ? m.labs.reduce((a, l) => a + (m.modulosPorLab[l] || []).length, 0)
      : (m.modulosPorLab[lab] || []).length;
    const startTab = (initialTab === 'modulos') ? 'modulos' : 'descuentos';

    // Encabezado: para "Todos" mostramos un título genérico (sin logo de un lab).
    const headHtml = esTodos
      ? `<div><h1>Todos los laboratorios</h1><p class="subtitle">${nProd} productos con descuento · ${nMod} módulos</p></div>`
      : `${UI.labLogo(lab, 52)}
         <div><h1>${UI.escapeHtml(lab)}</h1><p class="subtitle">${nProd} productos con descuento · ${nMod} módulos</p></div>`;

    container.innerHTML = `
      <div style="margin-bottom:14px;"><span class="chip" id="btn-volver" style="cursor:pointer;"><i class="fa-solid fa-arrow-left"></i> Laboratorios</span></div>
      <div class="page-head">
        <div style="display:flex;align-items:center;gap:14px;">
          ${headHtml}
        </div>
      </div>
      <div class="filter-bar" id="lab-tabs-bar">
        <span class="chip ${startTab === 'descuentos' ? 'active' : ''}" data-tab="descuentos">Descuentos</span>
        <span class="chip ${startTab === 'modulos' ? 'active' : ''}" data-tab="modulos">Módulos</span>
      </div>
      <div id="lab-tab-output"></div>
    `;
    container.querySelector('#btn-volver').addEventListener('click', () => Router.go('laboratorios', {}));

    const out = container.querySelector('#lab-tab-output');
    function showTab(tab) {
      if (tab === 'descuentos') pageDescuentos(out, { lab, embeddedInLab: true });
      else pageModulos(out, { lab, embeddedInLab: true });
    }
    const tabsBar = container.querySelector('#lab-tabs-bar');
    tabsBar.querySelectorAll('.chip[data-tab]').forEach((chip) => {
      chip.addEventListener('click', () => {
        tabsBar.querySelectorAll('.chip[data-tab]').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        showTab(chip.getAttribute('data-tab'));
      });
    });
    showTab(startTab);
  }

  // ======================================================================
  // BUSCAR PRODUCTO
  // ======================================================================
  function pageBuscar(container, params) {
    const initialQ = (params && params.q) || '';
    container.innerHTML = `
      <div class="page-head"><div><h1>Buscar Producto</h1><p class="subtitle">Buscá por nombre, laboratorio o código (EAN / SAP). Resultado instantáneo.</p></div></div>
      <div class="hero-search" style="max-width:none;margin-bottom:20px;">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input id="buscar-input" type="text" placeholder="Ej: amoxidal, roemmers, 779534..." value="${UI.escapeHtml(initialQ)}">
      </div>
      <div id="buscar-output"></div>
    `;
    const input = container.querySelector('#buscar-input');
    const out = container.querySelector('#buscar-output');

    function render() {
      const q = input.value.trim().toLowerCase();
      if (!q) { out.innerHTML = UI.emptyState('fa-solid fa-magnifying-glass', 'Empezá a escribir', 'Buscá cualquier producto, laboratorio o código de barras.'); return; }
      const results = searchProducts(q, 200);
      if (!results.length) { out.innerHTML = UI.emptyState('fa-solid fa-circle-xmark', 'Sin resultados', `No encontramos productos para "${q}".`); return; }
      out.innerHTML = `<p class="text-faint" style="font-size:12.5px;margin-bottom:10px;">${results.length} resultado${results.length === 1 ? '' : 's'}</p>` +
        searchResultHeader() + results.map(searchResultRow).join('');
      out.querySelectorAll('.search-result-item[data-lab]').forEach((row) => {
        row.addEventListener('click', () => openProductDetail(row.getAttribute('data-lab'), row.getAttribute('data-ean'), row.getAttribute('data-producto')));
      });
    }
    input.addEventListener('input', render);
    render();
    input.focus();
  }

  // ======================================================================
  // FAVORITOS
  // ======================================================================
  let favoritesListener = null;
  // Busca un módulo por su id único recorriendo todos los laboratorios.
  function lookupModule(modId) {
    const m = model();
    for (const lab of Object.keys(m.modulosPorLab)) {
      const found = (m.modulosPorLab[lab] || []).find((mo) => mo.id === modId);
      if (found) return found;
    }
    return null;
  }

  function pageFavoritos(container) {
    function render() {
      const favsProd = Array.from(State.App.favorites).map((key) => {
        const [lab, ean] = key.split('|');
        return lookupProduct(lab, ean, null);
      }).filter(Boolean);

      const favsMod = Array.from(State.App.favoritesMod).map((id) => lookupModule(id)).filter(Boolean);

      container.innerHTML = `
        <div class="page-head"><div><h1>Favoritos</h1><p class="subtitle">Productos y módulos marcados para acceso rápido. Se guardan en este navegador.</p></div></div>
        <div id="fav-output"></div>
      `;
      const out = container.querySelector('#fav-output');

      if (!favsProd.length && !favsMod.length) {
        out.innerHTML = UI.emptyState('fa-regular fa-star', 'Todavía no tenés favoritos', 'Marcá la estrella ⭐ en cualquier producto o módulo para encontrarlo rápido acá.');
        return;
      }

      let html = '';

      // --- Sección Productos ---
      html += `<div class="cat-divider">Productos · ${favsProd.length}</div>`;
      if (favsProd.length) {
        html += searchResultHeader() + favsProd.map(searchResultRow).join('');
      } else {
        html += `<p class="text-faint" style="font-size:12.5px;margin:4px 0 8px;">Todavía no marcaste productos como favoritos.</p>`;
      }

      // --- Sección Módulos ---
      html += `<div class="cat-divider" style="margin-top:20px;">Módulos · ${favsMod.length}</div>`;
      if (favsMod.length) {
        html += `<div class="module-list">${favsMod.map(moduleListRowHtml).join('')}</div>`;
      } else {
        html += `<p class="text-faint" style="font-size:12.5px;margin:4px 0 8px;">Todavía no marcaste módulos como favoritos.</p>`;
      }

      out.innerHTML = html;

      // Click en producto -> detalle de producto
      out.querySelectorAll('.search-result-item[data-lab]').forEach((row) => {
        row.addEventListener('click', () => openProductDetail(row.getAttribute('data-lab'), row.getAttribute('data-ean'), row.getAttribute('data-producto')));
      });
      // Click en módulo -> detalle de módulo
      out.querySelectorAll('.module-list-row[data-mod-id]').forEach((row) => {
        row.addEventListener('click', (e) => {
          // Si el clic fue sobre la estrella de favorito (o su ícono interno,
          // que Font Awesome puede convertir en <svg>/<path>), no abrir el detalle.
          if (e.target.closest('.fav-toggle') || e.target.closest('.mlr-fav')) return;
          const mod = lookupModule(row.getAttribute('data-mod-id'));
          if (mod) openModuleDetail(mod);
        });
      });
    }
    render();
    if (favoritesListener) document.removeEventListener('pf:favorites-changed', favoritesListener);
    favoritesListener = () => { if (State.App.route.page === 'favoritos') render(); };
    document.addEventListener('pf:favorites-changed', favoritesListener);
  }

  // ======================================================================
  // CUENTAS ESPECIALES (Desc. Clientes)
  // ======================================================================
  let dtCuentas = null;
  function pageCuentas(container) {
    const m = model();
    const clientes = Array.from(new Set(m.cuentasEspeciales.map((c) => c.cliente))).sort();

    container.innerHTML = `
      <div class="page-head">
        <div><h1>Cuentas Especiales</h1><p class="subtitle">Descuentos Especiales por Cliente.</p></div>
        <div class="page-actions"><button class="btn btn-ghost" id="btn-print-cuentas"><i class="fa-solid fa-print"></i> Imprimir / PDF</button></div>
      </div>
      <div class="filter-bar">
        <span class="filter-label">Cuenta</span>
        <select class="input" id="cuenta-select" style="min-width:220px;">
          <option value="">Todas las cuentas</option>
          ${clientes.map((c) => `<option value="${UI.escapeHtml(c)}">${UI.escapeHtml(c)}</option>`).join('')}
        </select>
        <input class="input" id="cuenta-buscar" style="min-width:200px;" placeholder="Buscar cliente...">
        <span class="filter-label" style="margin-left:10px;">Laboratorio</span>
        <select class="input" id="cuenta-lab-select">
          <option value="">Todos</option>
          ${m.labs.map((l) => `<option value="${UI.escapeHtml(l)}">${UI.escapeHtml(l)}</option>`).join('')}
        </select>
      </div>
      <div class="table-card">
        <table id="tbl-cuentas" class="styled-table dataTable" style="width:100%">
          <thead><tr><th>Laboratorio</th><th>Cuenta</th><th>Producto</th><th>Descuento</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <div id="print-cuentas-area"></div>
    `;

    function mount() {
      if (dtCuentas) { try { dtCuentas.destroy(); } catch (e) { /* noop */ } dtCuentas = null; }
      document.getElementById('tbl-cuentas').innerHTML = '<tbody></tbody>';
      const mobile = window.innerWidth <= 560;
      dtCuentas = $('#tbl-cuentas').DataTable({
        data: m.cuentasEspeciales.map((c) => [
          UI.labPill(c.lab, 'sm'),
          `<span title="${UI.escapeHtml(c.cliente)}">${UI.escapeHtml(c.cliente)}</span>`,
          `<span title="${UI.escapeHtml(c.producto)}">${UI.escapeHtml(c.producto)}</span>`,
          UI.discountOrDash(c.descuento, UI.fmtPctDirect, { sm: true }),
        ]),
        columns: [
          { title: 'Laboratorio', width: '95px' },
          { title: 'Cuenta', width: '22%' },
          { title: 'Producto' },
          { title: 'Desc.', width: '64px', className: 'td-desc' },
        ],
        autoWidth: false,
        pageLength: mobile ? 15 : 25,
        lengthMenu: [[25, 50, 100, -1], [25, 50, 100, 'Todos']],
        language: { url: 'https://cdn.datatables.net/plug-ins/1.13.8/i18n/es-AR.json' },
        deferRender: true,
        order: [[1, 'asc']],
        scrollY: mobile ? '' : '68vh',
        scrollCollapse: !mobile,
      });
    }
    mount();

    const sel = container.querySelector('#cuenta-select');
    const buscar = container.querySelector('#cuenta-buscar');
    const labSel = container.querySelector('#cuenta-lab-select');
    function applyFilter() {
      const q = buscar.value.trim();
      if (q) {
        // Búsqueda libre: coincidencia parcial en cualquier parte del nombre.
        dtCuentas.column(1).search($.fn.dataTable.util.escapeRegex(q), true, false);
      } else if (sel.value) {
        // Desplegable: coincidencia exacta con la cuenta elegida.
        dtCuentas.column(1).search('^' + $.fn.dataTable.util.escapeRegex(sel.value) + '$', true, false);
      } else {
        dtCuentas.column(1).search('');
      }
      dtCuentas.column(0).search(labSel.value ? labSel.value : '');
      dtCuentas.draw();
    }
    sel.addEventListener('change', () => { if (sel.value) buscar.value = ''; applyFilter(); });
    buscar.addEventListener('input', () => { if (buscar.value) sel.value = ''; applyFilter(); });
    labSel.addEventListener('change', applyFilter);
    container.querySelector('#btn-print-cuentas').addEventListener('click', () => {
      // En vez de remontar la DataTable (lento y frágil por scrollY + idioma async),
      // armamos una tabla estática con las filas actualmente visibles (respeta el
      // filtro y el orden que el usuario tiene puesto). Es instantáneo y se alinea bien.
      const printArea = container.querySelector('#print-cuentas-area');
      const rows = dtCuentas.rows({ search: 'applied', order: 'applied' }).data().toArray();
      const bodyHtml = rows.map((r) => `<tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td>${r[2]}</td>
        <td class="td-desc">${r[3]}</td>
      </tr>`).join('');
      printArea.innerHTML = `<table class="styled-table print-cuentas-table">
        <thead><tr><th>Laboratorio</th><th>Cuenta</th><th>Producto</th><th>Desc.</th></tr></thead>
        <tbody>${bodyHtml}</tbody>
      </table>`;
      document.body.classList.add('printing-cuentas');
      window.print();
      setTimeout(() => document.body.classList.remove('printing-cuentas'), 300);
    });
  }

  // ======================================================================
  // NOVEDADES (cambios respecto de la última versión del Excel)
  // ======================================================================
  function pageNovedades(container) {
    const diff = State.App.pendingChanges || State.getLastChanges();
    container.innerHTML = `
      <div class="page-head">
        <div><h1>Novedades</h1><p class="subtitle">Últimos cambios detectados en la política comercial.</p></div>
      </div>
      <div class="about-card" style="max-width:760px;">${UI.changesBodyHtml(diff)}</div>
    `;
    // Al entrar a Novedades se consideran vistos: se apaga el puntito rojo y no
    // vuelve a titilar hasta la próxima actualización del Excel. El recuadro con el
    // detalle queda igualmente disponible acá hasta el próximo cambio.
    if (State.App.pendingChanges) {
      State.acknowledgeChanges();
      if (window.Router && Router.showChangesBadge) Router.showChangesBadge(false);
    }
  }

  // ======================================================================
  // ACERCA DE
  // ======================================================================
  function pageAcerca(container) {
    container.innerHTML = `
      <div class="page-head"><div><h1>Acerca de</h1><p class="subtitle">Cómo funciona esta herramienta y qué información incluye.</p></div></div>
      <div class="about-card">
        <h2>Política Comercial — ${UI.escapeHtml(State.currentMonthLabel())}</h2>
        <p>Esta aplicación reemplaza el Excel mensual de condiciones comerciales para la fuerza de ventas. Toda la información se lee directamente del archivo Excel oficial: no hay servidor ni base de datos intermedia.</p>
        <ul class="about-list">
          <li><i class="fa-solid fa-tags"></i> <span><b>Descuentos:</b> Descuento Especial, Publicado y Exclusivo vigentes por producto.</span></li>
          <li><i class="fa-solid fa-layer-group"></i> <span><b>Módulos:</b> combos comerciales por laboratorio, con sus productos, cantidades y descuentos.</span></li>
          <li><i class="fa-solid fa-handshake"></i> <span><b>Cuentas Especiales:</b> condiciones negociadas con cuentas puntuales (no aplican a la política general).</span></li>
        </ul>
        <p class="text-faint" style="font-size:12px;">Fuente cargada: <span id="acerca-fuente">—</span></p>
      </div>
    `;
    const fuenteEl = container.querySelector('#acerca-fuente');
    if (fuenteEl && State.App.dataMeta) {
      const meta = State.App.dataMeta;
      fuenteEl.textContent = (meta.fileName || 'archivo seleccionado') + (meta.loadedAt ? ' · ' + new Date(meta.loadedAt).toLocaleString('es-AR') : '');
    }
  }

  // ======================================================================
  // ROUTER
  // ======================================================================
  const PAGES = {
    inicio: pageInicio, descuentos: pageDescuentos, modulos: pageModulos,
    laboratorios: pageLaboratorios, buscar: pageBuscar, favoritos: pageFavoritos,
    cuentas: pageCuentas, novedades: pageNovedades, acerca: pageAcerca,
  };

  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    const [pagePart, qs] = h.split('?');
    const params = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => { params[k] = v; });
    return { page: PAGES[pagePart] ? pagePart : 'inicio', params };
  }

  function renderActiveNav(page) {
    document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.getAttribute('data-page') === page));
  }

  function render(opts) {
    opts = opts || {};
    const { page, params } = State.App.route;
    const container = document.getElementById('page-content');
    const mainEl = document.getElementById('main');
    // ¿Conservar scroll? (navegación entre laboratorios desde acceso rápido / chips).
    const keep = !!opts.keepScroll || pendingKeepScroll;
    const winY = keep ? (pendingKeepScroll ? pendingScrollY : (window.scrollY || window.pageYOffset || 0)) : 0;
    pendingKeepScroll = false; // se consume una sola vez

    // CLAVE para conservar el scroll: si vaciamos #page-content, el documento
    // colapsa a altura ~0, el navegador fuerza el scroll a 0, y aunque después
    // restauremos, la tabla nueva (DataTables) tarda en montar y el documento
    // sigue corto un rato. Para evitarlo, fijamos una altura mínima igual a la
    // que tenía antes de vaciar, y la liberamos cuando el contenido nuevo ya montó.
    let reservedH = 0;
    if (keep) reservedH = container.offsetHeight;

    container.innerHTML = '';
    if (keep && reservedH) container.style.minHeight = reservedH + 'px';
    renderActiveNav(page);
    PAGES[page](container, params);

    if (keep) {
      const se = document.scrollingElement || document.documentElement;
      const restore = () => { if (winY) { window.scrollTo(0, winY); if (se) se.scrollTop = winY; } };
      if (scrollRestoreIv) clearInterval(scrollRestoreIv);
      restore();
      requestAnimationFrame(restore);
      // Sostenemos el scroll y la altura reservada hasta que la altura real del
      // contenido nuevo se estabilice (deje de crecer entre chequeos). Recién ahí
      // liberamos el minHeight, así el documento nunca se encoge de golpe y el
      // scroll no salta "unos segundos después" (que pasaba cuando los logos y el
      // resto del contenido terminaban de cargar tarde).
      let n = 0;
      let lastH = -1;
      let stableCount = 0;
      scrollRestoreIv = setInterval(() => {
        restore();
        n++;
        // Altura real del contenido, ignorando el minHeight que le pusimos.
        const prevMin = container.style.minHeight;
        container.style.minHeight = '0px';
        const realH = container.scrollHeight;
        container.style.minHeight = prevMin;

        if (realH === lastH) stableCount++; else { stableCount = 0; lastH = realH; }

        // Estable por ~120ms seguidos, o tope de seguridad a ~4s.
        if (stableCount >= 4 || n >= 130) {
          clearInterval(scrollRestoreIv);
          scrollRestoreIv = null;
          container.style.minHeight = '';
          restore();
          // un último empujón por si liberar la altura movió algo
          requestAnimationFrame(restore);
        }
      }, 30);
    } else {
      if (scrollRestoreIv) { clearInterval(scrollRestoreIv); scrollRestoreIv = null; }
      container.style.minHeight = '';
      container.scrollTop = 0;
      if (mainEl) mainEl.scrollTop = 0;
      window.scrollTo(0, 0);
    }

    if (document.getElementById('sidebar').classList.contains('open')) {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-backdrop').classList.remove('show');
    }
  }

  // Bandera efímera: cuando go() pide conservar el scroll, guardamos la posición
  // ANTES de cambiar el hash (porque el cambio de hash puede resetear el scroll),
  // y el próximo render() la restaura y la consume una sola vez.
  let pendingKeepScroll = false;
  let pendingScrollY = 0;
  let scrollRestoreIv = null;

  function go(page, params, opts) {
    params = params || {};
    opts = opts || {};
    if (opts.keepScroll) {
      pendingKeepScroll = true;
      const se = document.scrollingElement || document.documentElement;
      pendingScrollY = se ? se.scrollTop : (window.scrollY || window.pageYOffset || 0);
    }
    const sp = new URLSearchParams();
    if (params.lab) sp.set('lab', params.lab);
    if (params.q) sp.set('q', params.q);
    if (params.tab) sp.set('tab', params.tab);
    const qs = sp.toString();
    const newHash = '#/' + page + (qs ? '?' + qs : '');
    if (location.hash === newHash) {
      State.App.route = { page, params };
      render();
    } else {
      location.hash = newHash; // dispara 'hashchange' -> render()
    }
  }

  function initRouter() {
    // Evitamos que el navegador reposicione el scroll por su cuenta al cambiar el
    // hash: lo controlamos nosotros (para poder conservarlo entre laboratorios).
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* noop */ }
    window.addEventListener('hashchange', () => {
      const parsed = parseHash();
      State.App.route = parsed;
      render();
    });
    State.App.route = parseHash();
    render();
  }

  function renderSidebar() {
    const nav = document.getElementById('nav-section');
    const m = model();
    nav.innerHTML = NAV_ITEMS.map((item) => {
      let count = '';
      if (item.key === 'descuentos') count = m.descuentos.length;
      else if (item.key === 'modulos') count = m.labs.reduce((a, l) => a + (m.modulosPorLab[l] || []).length, 0);
      else if (item.key === 'laboratorios') count = m.labs.length;
      else if (item.key === 'cuentas') count = new Set(m.cuentasEspeciales.map((c) => c.cliente)).size;
      else if (item.key === 'favoritos') count = (State.App.favorites.size + State.App.favoritesMod.size) || '';
      return `<div class="nav-item" data-page="${item.key}"><i class="${item.icon}"></i>${item.label}${count !== '' ? `<span class="count">${count}</span>` : ''}</div>`;
    }).join('');
    nav.querySelectorAll('.nav-item').forEach((el) => el.addEventListener('click', () => go(el.getAttribute('data-page'), {})));
    if (State.App.pendingChanges) showChangesBadge(true);
    document.addEventListener('pf:favorites-changed', () => {
      const favItem = nav.querySelector('[data-page="favoritos"] .count');
      const total = State.App.favorites.size + State.App.favoritesMod.size;
      if (favItem) favItem.textContent = total; else renderSidebar();
    });
  }

  // Muestra/oculta el indicador de "hay novedades" en el ítem de Novedades.
  function showChangesBadge(show) {
    const item = document.querySelector('.nav-item[data-page="novedades"]');
    if (!item) return;
    let dot = item.querySelector('.nav-badge');
    if (show) {
      if (!dot) { dot = document.createElement('span'); dot.className = 'nav-badge'; item.appendChild(dot); }
    } else if (dot) { dot.remove(); }
  }

  const Router = { go, initRouter, renderSidebar, buildDerivedIndexes, wireInlineSearch, showChangesBadge };

  if (typeof module !== 'undefined' && module.exports) module.exports = Router;
  else global.Router = Router;
})(typeof window !== 'undefined' ? window : globalThis);
