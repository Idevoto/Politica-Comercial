/**
 * ui.js — helpers de presentación reutilizados por todas las páginas.
 */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Los descuentos individuales (hoja "Grupo Roemmers") ya vienen como número-porcentaje
  // (-7 significa 7%). Los descuentos de módulo vienen como fracción (0.07 = 7%).
  function fmtPctDirect(v) {
    if (v === null || v === undefined) return null;
    const r = Math.round(v * 100) / 100;
    return r + '%';
  }
  function fmtPctFraction(v) {
    if (v === null || v === undefined) return null;
    const r = Math.round(v * 1000) / 10; // 0.07 -> 7
    return r + '%';
  }

  function dchip(text, opts) {
    opts = opts || {};
    const cls = ['dchip'];
    if (opts.muted) cls.push('muted');
    if (opts.warn) cls.push('warn');
    if (opts.pub) cls.push('pub');
    if (opts.sm) cls.push('sm');
    return `<span class="${cls.join(' ')}">${escapeHtml(text)}</span>`;
  }

  function discountOrDash(value, formatter, opts) {
    const txt = formatter(value);
    if (txt === null) return dchip('—', Object.assign({ muted: true }, opts));
    return dchip(txt, opts);
  }

  function labPill(lab, size) {
    const meta = State.labMeta(lab);
    const sm = size === 'sm';
    return `<span class="lab-pill" style="background:${meta.bg};color:${meta.text};${sm ? 'font-size:10.5px;padding:2px 8px;' : ''}">`
      + `${escapeHtml(lab)}</span>`;
  }

  function labLogo(lab, size) {
    size = size || 42;
    const meta = State.labMeta(lab);
    const initials = meta.initials;
    // Todos los laboratorios muestran sus iniciales sobre el color del lab, con la
    // misma tipografía y tamaño (no hay archivos de logo reales; antes cada uno caía
    // a las iniciales por separado y podían verse distintos). Así quedan uniformes.
    return `<div class="lab-logo-wrap" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.26)}px;background:${meta.bg};color:${meta.text};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">`
      + `<span style="font-weight:800;font-size:${Math.round(size * 0.33)}px;line-height:1;">${escapeHtml(initials)}</span>`
      + `</div>`;
  }

  function obsPill(text) {
    if (!text) return '';
    return `<span class="obs-pill"><i class="fa-solid fa-bolt"></i>${escapeHtml(text)}</span>`;
  }

  function emptyState(icon, title, text) {
    return `<div class="empty-state"><i class="${icon}"></i><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div>`;
  }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function favToggleHtml(lab, ean, sizeClass) {
    const isFav = State.isFavorite(lab, ean);
    return `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star fav-toggle ${isFav ? 'is-fav' : ''} ${sizeClass || ''}" `
      + `data-fav-lab="${escapeHtml(lab)}" data-fav-ean="${escapeHtml(ean || '')}" title="Favorito"></i>`;
  }

  // Estrella de favorito para un módulo (identificado por su id único).
  function favToggleModHtml(modId, sizeClass) {
    const isFav = State.isFavoriteMod(modId);
    return `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star fav-toggle fav-toggle-mod ${isFav ? 'is-fav' : ''} ${sizeClass || ''}" `
      + `data-fav-mod="${escapeHtml(modId)}" title="Favorito"></i>`;
  }

  // Delegación global para favoritos (un solo listener para toda la app).
  // Se registra en fase de CAPTURA para poder frenar el clic antes de que llegue
  // al contenedor (tarjeta/fila/modal), y así tocar la estrella nunca dispara la
  // apertura del detalle en ninguna parte de la app.
  function initFavoriteDelegation() {
    document.addEventListener('click', function (e) {
      const t = e.target.closest('.fav-toggle');
      if (!t) return;
      e.stopPropagation();
      e.preventDefault();
      let isFav;
      if (t.hasAttribute('data-fav-mod')) {
        // Favorito de módulo
        isFav = State.toggleFavoriteMod(t.getAttribute('data-fav-mod'));
      } else {
        // Favorito de producto
        const lab = t.getAttribute('data-fav-lab');
        const ean = t.getAttribute('data-fav-ean');
        isFav = State.toggleFavorite(lab, ean);
      }
      t.classList.toggle('is-fav', isFav);
      t.classList.toggle('fa-solid', isFav);
      t.classList.toggle('fa-regular', !isFav);
      toast(isFav ? 'Agregado a favoritos' : 'Quitado de favoritos');
      document.dispatchEvent(new CustomEvent('pf:favorites-changed'));
    }, true); // <- true = fase de captura
  }

  // ---------- Modal genérico (Bootstrap) ----------
  function showModal(titleHtml, bodyHtml, footHtml) {
    let modalEl = document.getElementById('detail-modal');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'detail-modal';
      modalEl.className = 'modal detail-modal fade';
      modalEl.tabIndex = -1;
      modalEl.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-lg"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body"></div>
        <div class="modal-footer"></div>
      </div></div>`;
      document.body.appendChild(modalEl);
    }
    modalEl.querySelector('.modal-title').innerHTML = titleHtml;
    modalEl.querySelector('.modal-body').innerHTML = bodyHtml;
    modalEl.querySelector('.modal-footer').innerHTML = footHtml || '';
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
    return modalEl;
  }

  // ---------- Aviso de cambios entre versiones del Excel ----------
  function changesSectionHtml(titulo, icono, items, render) {
    if (!items || !items.length) return '';
    return `<div class="chg-section">
      <div class="chg-section-head"><i class="${icono}"></i> ${escapeHtml(titulo)} <span class="chg-count">${items.length}</span></div>
      <div class="chg-list">${items.map(render).join('')}</div>
    </div>`;
  }

  function chgItemSimple(it) {
    return `<div class="chg-item">${labPill(it.lab, 'sm')}<span class="chg-name">${escapeHtml(it.nombre || '—')}</span></div>`;
  }

  function chgItemChanged(it) {
    const campos = (it.campos || []).map((c) =>
      `<span class="chg-field"><span class="chg-field-name">${escapeHtml(c.campo)}:</span> `
      + `<span class="chg-before">${escapeHtml(String(c.antes))}</span>`
      + `<i class="fa-solid fa-arrow-right"></i>`
      + `<span class="chg-after">${escapeHtml(String(c.ahora))}</span></span>`
    ).join('');
    return `<div class="chg-item chg-item-changed">
      <div class="chg-item-top">${labPill(it.lab, 'sm')}<span class="chg-name">${escapeHtml(it.nombre || '—')}</span></div>
      <div class="chg-fields">${campos}</div>
    </div>`;
  }

  // Tarjeta detallada de un módulo modificado. Izquierda: valores anteriores.
  // Derecha (tras la línea): valores nuevos, solo donde cambió (guión si no).
  function chgModuloCard(mod) {
    const meta = State.labMeta(mod.lab);
    const uni = (v) => (v == null ? '—' : 'x' + v);
    const pct = (v) => (v == null ? '—' : (Math.round(v * 1000) / 10) + '%');

    const filas = (mod.productos || []).map((p) => {
      let rowStyle = '', etiqueta = '', nombreHtml = escapeHtml(p.nombre || '—');
      if (p.estado === 'nuevo') {
        rowStyle = 'background:var(--discount-soft);';
        etiqueta = `<span class="chg-tag add"><i class="fa-solid fa-plus"></i> Nuevo en módulo</span>`;
      } else if (p.estado === 'quitado') {
        rowStyle = 'background:var(--chg-danger-soft);';
        etiqueta = `<span class="chg-tag del"><i class="fa-solid fa-minus"></i> Quitado de módulo</span>`;
        nombreHtml = `<span style="color:var(--text-faint);text-decoration:line-through;">${nombreHtml}</span>`;
      }
      const strike = p.estado === 'quitado' ? 'text-decoration:line-through;color:var(--text-faint);' : '';
      // 'nuevo' y 'nuevo-modulo': no había valores anteriores → izquierda en guión.
      const sinPrevio = (p.estado === 'nuevo' || p.estado === 'nuevo-modulo');
      const cantVieja = sinPrevio ? '—' : uni(p.cantVieja);
      const descVieja = sinPrevio ? '—' : pct(p.descVieja);

      let cantNT = '—', descNT = '—', cantNC = 'chg-old', descNC = 'chg-old';
      if (sinPrevio) {
        cantNT = uni(p.cantNueva); cantNC = 'chg-new';
        descNT = pct(p.descNueva); descNC = 'chg-new';
      } else {
        if (p.cantNueva != null) { cantNT = uni(p.cantNueva); cantNC = 'chg-new'; }
        if (p.descNueva != null) { descNT = pct(p.descNueva); descNC = 'chg-new'; }
      }

      return `<div class="cmc-row" style="${rowStyle}">
        <span class="cmc-prod">${nombreHtml}${etiqueta}</span>
        <span class="cmc-cell cmc-old" style="${strike}">${cantVieja}</span>
        <span class="cmc-cell cmc-old" style="${strike}">${descVieja}</span>
        <div class="cmc-mod">
          <span class="cmc-cell ${cantNC}">${cantNT}</span>
          <span class="cmc-cell ${descNC}">${descNT}</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="cmc-card" style="border-top:3px solid ${meta.bg};">
      <div class="cmc-head">
        <span class="lab-pill" style="background:${meta.bg};color:${meta.text};font-size:11px;padding:2px 10px;">${escapeHtml(mod.lab)}</span>
        <span class="cmc-name">${escapeHtml(mod.nombre || '—')}</span>
        <span class="cmc-badge">${escapeHtml(mod.observacion || 'Modificado')}</span>
      </div>
      <div class="cmc-row cmc-head-row">
        <span class="cmc-prod">Producto</span>
        <span class="cmc-cell">Unid.</span>
        <span class="cmc-cell">Desc.</span>
        <div class="cmc-mod">
          <span class="cmc-cell">Unid.</span>
          <span class="cmc-cell">Desc.</span>
        </div>
      </div>
      ${filas}
    </div>`;
  }

  function changesBodyHtml(diff) {
    if (!diff || !diff.total) {
      return emptyState('fa-solid fa-check', 'Sin cambios', 'No hay diferencias respecto de la última versión que viste.');
    }
    const mesTxt = (diff.mesAntes && diff.mesAhora && diff.mesAntes !== diff.mesAhora)
      ? `<div class="chg-mes"><i class="fa-regular fa-calendar"></i> Período: <b>${escapeHtml(diff.mesAntes)}</b> <i class="fa-solid fa-arrow-right"></i> <b>${escapeHtml(diff.mesAhora)}</b></div>`
      : '';

    const resumen = `<div class="chg-summary">
      ${diff.productosNuevos.length ? `<span class="chg-pill add">+${diff.productosNuevos.length} productos</span>` : ''}
      ${diff.productosCambiados.length ? `<span class="chg-pill mod">${diff.productosCambiados.length} descuentos cambiados</span>` : ''}
      ${diff.productosQuitados.length ? `<span class="chg-pill del">−${diff.productosQuitados.length} productos</span>` : ''}
      ${diff.modulosCambiados.length ? `<span class="chg-pill mod">${diff.modulosCambiados.length} ${diff.modulosCambiados.length === 1 ? 'módulo' : 'módulos'}</span>` : ''}
      ${diff.bonificaciones && diff.bonificaciones.length ? `<span class="chg-pill mod">${diff.bonificaciones.length} ${diff.bonificaciones.length === 1 ? 'bonificación' : 'bonificaciones'}</span>` : ''}
      ${diff.modulosQuitados.length ? `<span class="chg-pill del">−${diff.modulosQuitados.length} ${diff.modulosQuitados.length === 1 ? 'módulo' : 'módulos'}</span>` : ''}
    </div>`;

    const modulosModHtml = (diff.modulosCambiados && diff.modulosCambiados.length)
      ? `<div class="chg-section-open">
          <div class="chg-section-head plain"><i class="fa-solid fa-pen"></i> Módulos modificados <span class="chg-count">${diff.modulosCambiados.length}</span></div>
          <div class="cmc-list">${diff.modulosCambiados.map(chgModuloCard).join('')}</div>
        </div>`
      : '';

    const bonifHtml = (diff.bonificaciones && diff.bonificaciones.length)
      ? `<div class="chg-section-open">
          <div class="chg-section-head plain"><i class="fa-solid fa-gift"></i> Bonificaciones <span class="chg-count">${diff.bonificaciones.length}</span></div>
          <div class="cmc-list">${diff.bonificaciones.map(chgModuloCard).join('')}</div>
        </div>`
      : '';

    return `<div class="chg-wrap">
      ${mesTxt}
      ${resumen}
      ${changesSectionHtml('Descuentos modificados', 'fa-solid fa-pen', diff.productosCambiados, chgItemChanged)}
      ${changesSectionHtml('Productos nuevos', 'fa-solid fa-plus', diff.productosNuevos, chgItemSimple)}
      ${changesSectionHtml('Productos dados de baja', 'fa-solid fa-minus', diff.productosQuitados, chgItemSimple)}
      ${modulosModHtml}
      ${bonifHtml}
      ${changesSectionHtml('Módulos dados de baja', 'fa-solid fa-minus', diff.modulosQuitados, chgItemSimple)}
    </div>`;
  }

  function showChangesModal(diff) {
    const titulo = `<i class="fa-solid fa-bell" style="color:var(--brand);margin-right:8px;"></i>Novedades de esta versión`;
    const modalEl = showModal(titulo, changesBodyHtml(diff),
      `<button class="btn btn-primary btn-sm" id="btn-chg-ok">Entendido</button>`);
    function ack() {
      State.acknowledgeChanges();
      if (window.Router && Router.showChangesBadge) Router.showChangesBadge(false);
    }
    const btn = modalEl.querySelector('#btn-chg-ok');
    if (btn) btn.addEventListener('click', () => {
      ack();
      const inst = bootstrap.Modal.getInstance(modalEl);
      if (inst) inst.hide();
    });
    modalEl.addEventListener('hidden.bs.modal', ack, { once: true });
    return modalEl;
  }

  const UI = {
    escapeHtml, fmtPctDirect, fmtPctFraction,
    dchip, discountOrDash, labPill, labLogo, obsPill,
    emptyState, toast, favToggleHtml, favToggleModHtml, initFavoriteDelegation, showModal,
    changesBodyHtml, showChangesModal,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = UI;
  else global.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
