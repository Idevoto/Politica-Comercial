/**
 * excelParser.js
 * Convierte las hojas crudas del Excel de Política Comercial en un modelo de datos
 * listo para la UI. No modifica reglas comerciales: solo reorganiza y formatea.
 *
 * Funciona tanto en el navegador (window.ExcelParser) como en Node (para tests).
 */
(function (global) {
  'use strict';

  // ---------- Helpers genéricos ----------

  function norm(s) {
    return String(s == null ? '' : s)
      .trim()
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isBlankRow(row, cols) {
    if (!row) return true;
    const checkCols = cols && cols.length ? cols : row.map((_, i) => i);
    return checkCols.every((i) => row[i] === null || row[i] === undefined || row[i] === '');
  }

  function eanKey(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return String(Math.round(v));
    const s = String(v).trim();
    const n = Number(s);
    return Number.isFinite(n) ? String(Math.round(n)) : s;
  }

  function asNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // Busca, dentro de las primeras `maxRows` filas, la fila que contiene `headerText`
  // en alguna columna dentro de [colStart, colEnd]. Devuelve {rowIndex, colIndex} o null.
  function findHeaderCell(rows, headerText, maxRows, colStart, colEnd) {
    const target = norm(headerText);
    const limit = Math.min(maxRows, rows.length);
    for (let r = 0; r < limit; r++) {
      const row = rows[r] || [];
      const end = Math.min(colEnd, row.length - 1);
      for (let c = colStart; c <= end; c++) {
        if (norm(row[c]) === target) return { rowIndex: r, colIndex: c };
      }
    }
    return null;
  }

  // ---------- 1) Hoja "Grupo Roemmers" (descuentos individuales) ----------

  function parseDescuentos(rows) {
    const head = findHeaderCell(rows, 'LAB', 6, 0, 3);
    if (!head) throw new Error('No se encontró el encabezado de la hoja de descuentos individuales.');
    const headerRow = rows[head.rowIndex].map(norm);
    const col = {};
    headerRow.forEach((label, idx) => {
      if (label === 'LAB') col.lab = idx;
      else if (label.indexOf('CODIGO DE BARRAS') === 0 || label === 'EAN') col.ean = idx;
      else if (label.indexOf('CODIGO SAP') === 0) col.sap = idx;
      else if (label === 'DESCRIPCION') col.producto = idx;
      else if (label.indexOf('DTO ESPECIAL') === 0) col.especial = idx;
      else if (label.indexOf('DTO PUBLICADO') === 0) col.publicado = idx;
      else if (label.indexOf('DTO EXCLUSIVO') === 0) col.exclusivo = idx;
      // MINIMO se ignora deliberadamente (columna sin datos en la hoja fuente)
    });

    const productos = [];
    for (let r = head.rowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const lab = row[col.lab];
      const producto = row[col.producto];
      if (!lab || !producto) continue;
      productos.push({
        id: 'D' + r,
        lab: String(lab).trim(),
        producto: String(producto).trim(),
        ean: eanKey(row[col.ean]),
        sap: row[col.sap] != null ? String(row[col.sap]).trim() : null,
        especial: asNumber(row[col.especial]),
        publicado: asNumber(row[col.publicado]),
        exclusivo: asNumber(row[col.exclusivo]),
      });
    }
    return productos;
  }

  // ---------- 2) Hojas "Modulos <Lab>" ----------

  // Detecta el bloque de columnas a partir de la primera ocurrencia de "NOMBRE MODULO"
  // dentro de las primeras 10 filas y las primeras `colLimit` columnas (para ignorar,
  // por ejemplo, el bloque "PUBLICADO" de Siegfried que está más a la derecha).
  function detectModuleColumns(rows, colLimit) {
    const head = findHeaderCell(rows, 'NOMBRE MODULO', 10, 0, colLimit);
    if (!head) return null;
    const headerRow = rows[head.rowIndex];
    const nombreCol = head.colIndex;
    const codCol = nombreCol - 1 >= 0 ? nombreCol - 1 : null;
    const eanCol = nombreCol + 1;
    const descripcionCol = nombreCol + 2;
    const cantCol = nombreCol + 3;
    const descCol = nombreCol + 4;
    // La columna de "condición / observación" suele estar 2 columnas a la derecha del
    // descuento (con una columna vacía de separación en medio), igual en todas las hojas.
    const condCol = descCol + 2;
    return { headerRowIndex: head.rowIndex, codCol, nombreCol, eanCol, descripcionCol, cantCol, descCol, condCol };
  }

  function parseModulosSheet(rows, lab, opts) {
    opts = opts || {};
    const colLimit = opts.colLimit != null ? opts.colLimit : 10;
    const cols = detectModuleColumns(rows, colLimit);
    if (!cols) return [];

    const modulos = [];
    let currentCategoria = null;
    let currentModulo = null;
    let modIndex = 0;

    const dataStart = cols.headerRowIndex + 1;

    for (let r = dataStart; r < rows.length; r++) {
      const row = rows[r] || [];
      const nombre = row[cols.nombreCol];
      const ean = row[cols.eanCol];
      const cant = row[cols.cantCol];
      const desc = row[cols.descCol];

      const rowIsBlank = isBlankRow(row, [cols.codCol, cols.nombreCol, cols.eanCol, cols.descripcionCol, cols.cantCol, cols.descCol].filter((x) => x != null));
      if (rowIsBlank) continue;

      // Fila de re-encabezado en medio de la hoja (p.ej. "NOMBRE MODULO" repetido)
      if (nombre && norm(nombre) === 'NOMBRE MODULO') continue;

      // Banner de categoría: solo texto en la columna nombre, sin EAN/cantidad/descuento
      if (nombre && ean == null && cant == null && desc == null) {
        currentCategoria = String(nombre).trim();
        continue;
      }

      if (nombre) {
        // Nueva línea de módulo
        modIndex += 1;
        currentModulo = {
          id: lab + '-' + modIndex,
          codigo: row[cols.codCol] != null ? String(row[cols.codCol]).trim() : null,
          lab: lab,
          categoria: currentCategoria,
          nombre: String(nombre).trim(),
          descuentoPrincipal: asNumber(desc),
          observacion: row[cols.condCol] != null ? String(row[cols.condCol]).trim() : null,
          productos: [],
        };
        modulos.push(currentModulo);
      }

      if (!currentModulo) continue; // línea huérfana sin módulo abierto: se descarta

      if (ean != null || row[cols.descripcionCol] != null) {
        const lineDesc = asNumber(desc);
        currentModulo.productos.push({
          ean: eanKey(ean),
          producto: row[cols.descripcionCol] != null ? String(row[cols.descripcionCol]).trim() : null,
          cantidad: asNumber(cant),
          // Solo se guarda como "override" si es una línea distinta a la que abrió el módulo
          descuentoLinea: currentModulo.productos.length === 0 ? null : lineDesc,
        });
      }
    }

    // cantidadTotal: suma de las cantidades de todas las líneas del módulo
    modulos.forEach((m) => {
      m.cantidadTotal = m.productos.reduce((acc, p) => acc + (p.cantidad || 0), 0) || null;
    });

    return modulos;
  }

  // ---------- 3) Hoja "Desc. Clientes" (cuentas especiales) ----------

  function parseDescClientes(rows) {
    const head = findHeaderCell(rows, 'LAB', 6, 0, 4);
    if (!head) return [];
    const headerRow = rows[head.rowIndex].map(norm);
    const col = {};
    headerRow.forEach((label, idx) => {
      if (label === 'LAB') col.lab = idx;
      else if (label === 'CLIENTE') col.cliente = idx;
      else if (label.indexOf('CODIGO DE BARRAS') === 0) col.ean = idx;
      else if (label.indexOf('CODIGO SAP') === 0) col.sap = idx;
      else if (label === 'DESCRIPCION') col.producto = idx;
      else if (label === 'DTO') col.descuento = idx;
    });

    const out = [];
    for (let r = head.rowIndex + 1; r < rows.length; r++) {
      const row = rows[r] || [];
      const lab = row[col.lab];
      const cliente = row[col.cliente];
      const producto = row[col.producto];
      if (!lab || !cliente || !producto) continue;
      out.push({
        lab: String(lab).trim(),
        cliente: String(cliente).trim(),
        ean: eanKey(row[col.ean]),
        sap: row[col.sap] != null ? String(row[col.sap]).trim() : null,
        producto: String(producto).trim(),
        descuento: asNumber(row[col.descuento]),
      });
    }
    return out;
  }

  // ---------- 4) Hoja "Detalle Pack" (EANs que son packs) ----------

  // Recibe un array plano con los valores crudos de la columna C (uno por fila),
  // ya extraídos por dirección absoluta de celda en app.js.
  function parsePackEans(columnValues) {
    const set = new Set();
    (columnValues || []).forEach((raw) => {
      const key = eanKey(raw);
      // Se descartan valores que no parecen un código de barras real
      // (por ejemplo, si la celda tiene texto de encabezado).
      if (key && /^\d{6,}$/.test(key)) set.add(key);
    });
    return set;
  }

  // ---------- 5) Mes vigente (fila 1 de "Grupo Roemmers") ----------

  // Antes se leía de una celda fija (I1). Ahora se busca en toda la fila 1 la
  // celda que tenga forma de "Mes-Año" (texto tipo "Agosto-2026" / "Agosto 2026")
  // o una fecha serial de Excel. Así, si en el Excel se agregan/mueven columnas,
  // el mes se sigue detectando sin depender de la posición.
  function parseMesLabel(rows) {
    const row = rows && rows[0];
    if (!row) return null;

    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    // Convierte una fecha serial de Excel a "Mes AAAA".
    function fromSerial(raw) {
      if (typeof raw === 'number' && typeof XLSX !== 'undefined' && XLSX.SSF) {
        const parsed = XLSX.SSF.parse_date_code(raw);
        if (parsed && parsed.m >= 1 && parsed.m <= 12) {
          const nombre = meses[parsed.m - 1];
          if (nombre) return nombre.charAt(0).toUpperCase() + nombre.slice(1) + ' ' + parsed.y;
        }
      }
      return null;
    }

    // ¿El texto tiene forma de mes+año? (p.ej. "Agosto-2026", "Agosto 2026", "AGOSTO/26")
    function looksLikeMonth(txt) {
      const t = norm(txt); // MAYÚSCULAS, sin acentos
      const mesesUp = meses.map((mm) => norm(mm));
      return mesesUp.some((mm) => t.indexOf(mm) !== -1) && /\d{2,4}/.test(t);
    }

    // Recorremos la fila 1 de derecha a izquierda: el mes suele estar a la
    // derecha, y así evitamos confundirlo con el título largo (que está en B1).
    for (let c = row.length - 1; c >= 0; c--) {
      const raw = row[c];
      if (raw === null || raw === undefined || raw === '') continue;

      // 1) Fecha serial
      const serial = fromSerial(raw);
      if (serial) return serial;

      // 2) Texto con forma de mes+año (y que no sea el título largo de la política)
      if (typeof raw === 'string') {
        const s = raw.trim();
        // Evitamos el título ("POLITICA COMERCIAL ... AGOSTO 26"): es una frase larga.
        if (s.length <= 20 && looksLikeMonth(s)) return s;
      }
    }
    return null;
  }

  // ---------- Orquestador ----------

  const MODULE_SHEETS = [
    { sheet: 'Modulos Roemmers', lab: 'Roemmers' },
    { sheet: 'Modulos Siegfried', lab: 'Siegfried', colLimit: 8 }, // ignora bloque "Publicado"
    { sheet: 'Modulos Millet', lab: 'Millet' },
    { sheet: 'Modulos Ethical', lab: 'Ethical' },
    { sheet: 'Modulos Sidus', lab: 'Sidus' },
    { sheet: 'Modulos Craveri', lab: 'Craveri' },
  ];

  function buildModel(sheets) {
    const descuentos = parseDescuentos(sheets['Grupo Roemmers'] || []);
    const mesLabel = parseMesLabel(sheets['Grupo Roemmers'] || []);
    const packEans = Array.from(parsePackEans(sheets['Detalle Pack'] || []));

    const modulosPorLab = {};
    MODULE_SHEETS.forEach((def) => {
      const rows = sheets[def.sheet];
      modulosPorLab[def.lab] = rows ? parseModulosSheet(rows, def.lab, { colLimit: def.colLimit }) : [];
    });

    // Orden alfabético por nombre de módulo. Se ignora el prefijo "MOD" / "MOD."
    // (algunos vienen con punto y otros sin punto en el Excel) para que esa
    // inconsistencia de puntuación no altere el orden A-Z real.
    function moduleSortKey(nombre) {
      return String(nombre || '').replace(/^MOD\.?\s*/i, '').trim();
    }
    Object.keys(modulosPorLab).forEach((lab) => {
      modulosPorLab[lab].sort((a, b) => moduleSortKey(a.nombre).localeCompare(moduleSortKey(b.nombre), 'es', { sensitivity: 'base' }));
    });

    const cuentasEspeciales = sheets['Desc. Clientes'] ? parseDescClientes(sheets['Desc. Clientes']) : [];

    // Índice de productos: por (lab, ean) combina descuento individual + módulos donde participa
    const index = new Map();
    descuentos.forEach((p) => {
      const key = p.lab + '|' + (p.ean || p.producto);
      index.set(key, { lab: p.lab, producto: p.producto, ean: p.ean, sap: p.sap, especial: p.especial, publicado: p.publicado, exclusivo: p.exclusivo, modulos: [], cuentas: 0 });
    });

    Object.keys(modulosPorLab).forEach((lab) => {
      modulosPorLab[lab].forEach((mod) => {
        mod.productos.forEach((line) => {
          if (!line.ean) return;
          const key = lab + '|' + line.ean;
          let entry = index.get(key);
          if (!entry) {
            entry = { lab: lab, producto: line.producto, ean: line.ean, sap: null, especial: null, publicado: null, exclusivo: null, modulos: [], cuentas: 0 };
            index.set(key, entry);
          }
          entry.modulos.push({ id: mod.id, nombre: mod.nombre });
        });
      });
    });

    cuentasEspeciales.forEach((c) => {
      if (!c.ean) return;
      const key = c.lab + '|' + c.ean;
      const entry = index.get(key);
      if (entry) entry.cuentas += 1;
    });

    const labs = Array.from(new Set(descuentos.map((p) => p.lab))).sort();

    return {
      labs,
      mesLabel,
      descuentos,
      modulosPorLab,
      cuentasEspeciales,
      packEans,
      productIndex: Array.from(index.values()),
    };
  }

  const ExcelParser = {
    norm,
    eanKey,
    asNumber,
    parseDescuentos,
    parseModulosSheet,
    parseDescClientes,
    parsePackEans,
    parseMesLabel,
    buildModel,
    MODULE_SHEETS,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelParser;
  } else {
    global.ExcelParser = ExcelParser;
  }
})(typeof window !== 'undefined' ? window : globalThis);
