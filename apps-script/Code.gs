/**
 * ZUBIAZPI RURAL FEST 2026 · backend
 * ----------------------------------
 * Este script vive DENTRO del Google Sheet de respuestas del Forms
 * (Extensiones → Apps Script). Expone una mini-API que la app PWA usa para:
 *   GET  ?action=all            → respuestas del forms + pagos + gastos + habitas + checks
 *   POST {action:'addPago'|'delPago'|'addGasto'|'delGasto'|'setHabita'|'setCheck'|'uploadTicket', payload:{…}}
 *
 * Crea automáticamente las pestañas "Pagos", "Gastos", "Habitas", "Checks" si no existen.
 * Las fotos de los tickets se guardan en una carpeta de Drive llamada "ZRF 2026 tickets".
 *
 * DESPLIEGUE: Implementar → Nueva implementación → Aplicación web
 *   Ejecutar como: Yo · Acceso: Cualquier usuario (anónimo)  → copiar la URL /exec en la app.
 * Cada vez que cambies el código: Implementar → Gestionar implementaciones → editar → Nueva versión.
 */

const SHEET_RESPUESTAS = 'Respuestas de formulario 1';
const FOLDER_TICKETS = 'ZRF 2026 tickets';
const TABS = {
  Pagos:   ['id', 'nombre', 'tipo', 'importe', 'metodo', 'fecha', 'nota', 'who', 'creado'],
  Gastos:  ['id', 'fecha', 'concepto', 'partida', 'importe', 'quien', 'nota', 'foto', 'who', 'creado'],
  Habitas: ['nombre', 'habita', 'who', 'creado'],
  Checks:  ['i', 'on', 'who', 'creado'],
};

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'all';
  try {
    if (action === 'all') return json_(readAll_());
    return json_({ error: 'acción desconocida' });
  } catch (err) { return json_({ error: String(err) }); }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const p = body.payload || {}; const who = body.who || '';
    switch (body.action) {
      case 'addPago':   upsert_('Pagos', p, who); break;
      case 'updPago':   remove_('Pagos', 'id', p.id); upsert_('Pagos', p, who); break;
      case 'updGasto':  remove_('Gastos', 'id', p.id); upsert_('Gastos', p, who); break;
      case 'setPagado': setPagado_(p.nombre, p.ts, p.valor); break;
      case 'delPago':   remove_('Pagos', 'id', p.id); break;
      case 'addGasto':  upsert_('Gastos', p, who); break;
      case 'delGasto':  remove_('Gastos', 'id', p.id); break;
      case 'setHabita': remove_('Habitas', 'nombre', p.nombre); if (p.habita) upsert_('Habitas', p, who); break;
      case 'setCheck':  remove_('Checks', 'i', p.i); upsert_('Checks', p, who); break;
      case 'uploadTicket': return json_({ ok: true, url: uploadTicket_(p) });
      default: return json_({ error: 'acción desconocida: ' + body.action });
    }
    return json_({ ok: true });
  } catch (err) { return json_({ error: String(err) });
  } finally { lock.releaseLock(); }
}

/* ---------- lectura ---------- */
function readAll_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resp = sheetToObjects_(ss.getSheetByName(SHEET_RESPUESTAS));
  const pagos = sheetToObjects_(tab_('Pagos'));
  const gastos = sheetToObjects_(tab_('Gastos'));
  const habitas = {};
  sheetToObjects_(tab_('Habitas')).forEach(r => { if (r.nombre && r.habita) habitas[norm_(r.nombre)] = String(r.habita); });
  const checks = {};
  sheetToObjects_(tab_('Checks')).forEach(r => { checks[r.i] = (r.on === true || r.on === 'true' || r.on === 'TRUE'); });
  return { respuestas: resp, pagos, gastos, habitas, checks, ts: Date.now() };
}

function sheetToObjects_(sh) {
  if (!sh) return [];
  const v = sh.getDataRange().getValues(); if (v.length < 2) return [];
  const h = v[0].map(String);
  return v.slice(1).filter(r => r.some(c => c !== '' && c !== null)).map(r => {
    const o = {}; h.forEach((k, i) => { let c = r[i]; if (c instanceof Date) c = Utilities.formatDate(c, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); o[k] = c; }); return o;
  });
}

/* ---------- escritura ---------- */
function tab_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(TABS[name]); sh.setFrozenRows(1); }
  return sh;
}
function upsert_(name, obj, who) {
  const sh = tab_(name); const cols = TABS[name];
  sh.appendRow(cols.map(c => c === 'who' ? (obj.who || who) : c === 'creado' ? new Date() : (obj[c] === undefined ? '' : obj[c])));
}
function remove_(name, key, value) {
  const sh = tab_(name); const v = sh.getDataRange().getValues(); const ki = v[0].indexOf(key);
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][ki]) === String(value) || (key === 'nombre' && norm_(v[i][ki]) === norm_(value))) sh.deleteRow(i + 1);
}
function uploadTicket_(p) {
  const m = /^data:(image\/\w+);base64,(.+)$/.exec(p.data || ''); if (!m) throw new Error('foto inválida');
  const folders = DriveApp.getFoldersByName(FOLDER_TICKETS);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(FOLDER_TICKETS);
  const ext = m[1].split('/')[1] === 'jpeg' ? 'jpg' : m[1].split('/')[1];
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], (p.id || Date.now()) + '_' + (p.name || 'ticket').replace(/[^\w\-]+/g, '_') + '.' + ext);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?sz=w1200&id=' + file.getId();
}

/**
 * Marca la columna "Pagado?" (3ª columna, C) de la fila del forms de esa persona.
 * Busca primero por marca temporal (si viene) y si no por nombre normalizado.
 */
function setPagado_(nombre, ts, valor) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_RESPUESTAS);
  const v = sh.getDataRange().getValues();
  const hdr = v[0].map(String);
  let colPag = hdr.findIndex(h => /^pagado\?/i.test(h.trim())); if (colPag < 0) colPag = 2; // columna C
  const colNom = hdr.findIndex(h => /tu nombre/i.test(h)); const colTs = 0;
  let row = -1;
  if (ts) { const t = String(ts).slice(0, 19); for (let i = 1; i < v.length; i++) { const c = v[i][colTs]; const cs = c instanceof Date ? Utilities.formatDate(c, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss") : String(c); if (cs.slice(0, 19) === t) { row = i; break; } } }
  if (row < 0) for (let i = 1; i < v.length; i++) if (norm_(v[i][colNom]) === norm_(nombre)) { row = i; break; }
  if (row < 0) throw new Error('No encuentro a ' + nombre + ' en el forms');
  sh.getRange(row + 1, colPag + 1).setValue(valor);
}

/* ---------- utilidades ---------- */
function norm_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
