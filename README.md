# Política Comercial — División Farmacias

Aplicación web para que la fuerza de ventas consulte descuentos, módulos
comerciales y cuentas especiales, sin tener que abrir ni recorrer el Excel.

Funciona 100% en el navegador: no hay servidor, no hay base de datos. Toda la
información se lee directamente del archivo Excel que está en la carpeta
`excel/`.

## Cómo abrirla

**Opción recomendada — compartida en una carpeta de red / intranet / SharePoint:**
Si esta carpeta se publica en un servidor interno (intranet, SharePoint, un
simple `python -m http.server`, etc.), la app detecta y carga el Excel
automáticamente al abrir `index.html`. Esta es la opción ideal porque permite
que todo el equipo vea siempre la última versión sin hacer nada.

**Opción simple — doble clic en `index.html`:**
Algunos navegadores (sobre todo Chrome) bloquean por seguridad que una página
abierta así (`file://`) lea otros archivos de la carpeta automáticamente. Si
pasa esto, la app va a mostrar una pantalla para que selecciones el archivo
Excel manualmente (arrastrándolo o con el botón "Cargar archivo"). Es un paso
extra de un clic, una sola vez por sesión del navegador.

En ambos casos, una vez cargado, los datos quedan también guardados en el
navegador (favoritos y una copia de respaldo de los datos), así que si la
próxima vez el Excel no se puede leer automáticamente, la app muestra la
última versión cargada en lugar de quedar en blanco.

## Cómo actualizar la información cada mes

1. Reemplazá el archivo `excel/Politica_Comercial_FFVV.xlsx` por el Excel
   nuevo del mes — **manteniendo exactamente ese mismo nombre de archivo**.
2. No hace falta tocar ningún código. La próxima vez que alguien abra la app
   (o recargue la página), va a leer el archivo nuevo automáticamente.
3. Si alguien ya tiene la app abierta, puede usar el botón **"Actualizar
   Excel"** del menú lateral para cargar el archivo nuevo sin recargar la
   página.
4. Opcional: si querés que el mes mostrado en la app ("Julio 2026") cambie,
   editá la constante `MES_NOMBRE` al principio de `assets/js/state.js`.

La estructura interna del Excel (nombres de hojas, columnas) tiene que
mantenerse igual a la de este mes para que la lectura automática funcione.
Si el laboratorio agrega o quita una hoja de módulos, hay que agregar o
quitar esa hoja en la lista `MODULE_SHEETS` de `assets/js/excelParser.js`.

## Qué información incluye

- **Descuentos** (hoja `Grupo Roemmers`): Descuento Especial, Publicado y Exclusivo por producto.
- **Módulos** (hojas `Modulos Roemmers/Siegfried/Millet/Ethical/Sidus`):
  combos comerciales con sus productos, cantidades, descuentos y
  observaciones, presentados como tarjetas. El bloque "PUBLICADO" de la hoja
  de Siegfried (a la derecha, con sus propios módulos) no se muestra, por el
  mismo motivo que el punto anterior.
- **Cuentas Especiales** (hoja `Desc. Clientes`): condiciones negociadas con
  cuentas puntuales (farmacias / distribuidoras). Esto se agregó a pedido,
  además de lo que cubría el brief original.
- **No incluido:** la hoja `Detalle Pack` no forma parte de esta versión. Si
  se necesita más adelante, se puede agregar siguiendo el mismo patrón que
  `parseDescClientes` en `assets/js/excelParser.js`.

## Logos

Los logos institucionales son un placeholder (iniciales sobre un color por
laboratorio) listo para reemplazar. Para usar los logos reales, alcanza con
pisar estos archivos manteniendo el mismo nombre (SVG o PNG):

```
assets/logos/division-farmacias.svg
assets/logos/roemmers.svg
assets/logos/ethical.svg
assets/logos/millet.svg
assets/logos/sidus.svg
assets/logos/siegfried.svg
```

Si subís un PNG en lugar de SVG, cambiá la extensión en `labLogoPath()`
dentro de `assets/js/state.js`.

## Estructura del proyecto

```
index.html                  Punto de entrada — abrir este archivo
assets/
  css/styles.css            Diseño visual (colores, tipografía, layout)
  js/
    excelParser.js          Lee las hojas del Excel y las transforma en datos
    state.js                Configuración (colores por lab, mes, claves de localStorage)
    ui.js                   Componentes visuales reutilizables (chips, modales, etc.)
    pages.js                Cada sección de la app (Inicio, Descuentos, Módulos, ...)
    app.js                  Arranque: carga el Excel y inicializa todo lo anterior
  logos/                    Logos institucionales (placeholders, reemplazables)
excel/
  Politica_Comercial_FFVV.xlsx   El Excel que lee la app — reemplazar cada mes
```

## Funciones disponibles

- Buscador instantáneo (por nombre de producto, laboratorio o código EAN/SAP).
- Favoritos guardados en el navegador (estrella ⭐ en cualquier producto).
- Modo oscuro, recordado entre visitas.
- Filtros por laboratorio, categoría y texto libre en Descuentos y Módulos.
- Imprimir / Generar PDF: el botón "Imprimir / PDF" usa el diálogo de
  impresión del navegador (con la opción "Guardar como PDF"), incluyendo una
  vista de impresión limpia, sin menú lateral ni filtros.
- Responsive: pensada para notebook, tablet y celular.

## Tecnologías usadas

Bootstrap 5 (layout y modal), DataTables (tablas de Descuentos y Cuentas
Especiales, con orden/filtro/paginación y encabezado fijo), SheetJS / xlsx.js
(lectura del Excel en el navegador), Font Awesome (iconos) y JavaScript
simple (sin frameworks pesados), cargados desde CDN público — por eso se
necesita conexión a internet la primera vez que se abre, aunque no haga falta
servidor propio.

## Soporte

Esta es una primera versión funcional sobre el Excel de Julio 2026. Para
reportar un problema o pedir un ajuste, lo más simple es señalar la pantalla
y la acción exacta que se hizo (por ejemplo: "en Módulos, al filtrar por
Sidus, el módulo X muestra mal la cantidad").
