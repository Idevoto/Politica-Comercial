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
    const path = State.labLogoPath(lab);
    const initials = meta.initials;
    return `<div class="lab-logo-wrap" style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.26)}px;background:${meta.bg};color:${meta.text};display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">`
      + `<img src="${path}" alt="${escapeHtml(lab)}" style="width:62%;height:62%;object-fit:contain;" `
      + `onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'${initials}',style:'font-weight:800;font-size:${Math.round(size * 0.33)}px;'}))">`
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

  // Delegación global para favoritos (un solo listener para toda la app)
  function initFavoriteDelegation() {
    document.addEventListener('click', function (e) {
      const t = e.target.closest('.fav-toggle');
      if (!t) return;
      e.stopPropagation();
      const lab = t.getAttribute('data-fav-lab');
      const ean = t.getAttribute('data-fav-ean');
      const isFav = State.toggleFavorite(lab, ean);
      t.classList.toggle('is-fav', isFav);
      t.classList.toggle('fa-solid', isFav);
      t.classList.toggle('fa-regular', !isFav);
      toast(isFav ? 'Agregado a favoritos' : 'Quitado de favoritos');
      document.dispatchEvent(new CustomEvent('pf:favorites-changed'));
    });
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

  const UI = {
    escapeHtml, fmtPctDirect, fmtPctFraction,
    dchip, discountOrDash, labPill, labLogo, obsPill,
    emptyState, toast, favToggleHtml, initFavoriteDelegation, showModal,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = UI;
  else global.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
