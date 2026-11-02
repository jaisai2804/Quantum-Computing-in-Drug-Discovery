'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

/* ---------- Water geometry (EDIT to match Team 1's geometry) ---------- */
const GEOM = {
  OH: 0.9572,   // O–H bond length, Å
  angle: 104.5, // H–O–H angle, degrees
  note: 'Display geometry: standard reference water geometry used for visualisation only. Replace GEOM in script.js with the geometry used by the Hamiltonian team.'
};

/* ---------- Router ---------- */
const views = $$('.view');
function route() {
  const id = location.hash.slice(1) || 'home';
  const v = views.find(x => x.id === id) || views[0];
  views.forEach(x => x.classList.toggle('active', x === v));
  $$('nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + v.id));
  $('#nav').classList.remove('open'); $('#menuBtn').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
  v.id === 'water' ? water.start() : water.stop();
  if (v.id === 'output') loadResults();
}
$('#menuBtn').onclick = () => { const o = $('#nav').classList.toggle('open'); $('#menuBtn').setAttribute('aria-expanded', o); };

/* ---------- 3D water molecule (canvas, no libraries) ---------- */
const water = (() => {
  const stage = $('#stage'), cv = $('#molCanvas'), ctx = cv.getContext('2d');
  const calm = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let yaw = .6, pitch = .25, zoom = 1, auto = !calm, labels = true, raf = 0, drag = null, W = 0, H = 0;
  const half = GEOM.angle * Math.PI / 360;
  const P = [[0, 0, 0], [GEOM.OH * Math.sin(half), GEOM.OH * Math.cos(half), 0], [-GEOM.OH * Math.sin(half), GEOM.OH * Math.cos(half), 0]];
  const cy = (P[0][1] + P[1][1] + P[2][1]) / 3; P.forEach(p => p[1] -= cy);
  const A = [
    { n: 'O', r: .5, c: ['#ff9a9e', '#e5484d', '#7a1218'] },
    { n: 'H₁', r: .3, c: ['#ffffff', '#dfe8ff', '#7d93d1'] },
    { n: 'H₂', r: .3, c: ['#ffffff', '#dfe8ff', '#7d93d1'] }];
  const d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const ang = Math.acos(P[1].reduce((s, v, i) => s + (v - P[0][i]) * (P[2][i] - P[0][i]), 0) / (d(P[1], P[0]) * d(P[2], P[0]))) * 180 / Math.PI;

  // geometry panel
  const rows = [['O–H₁ bond', d(P[0], P[1]).toFixed(4) + ' Å'], ['O–H₂ bond', d(P[0], P[2]).toFixed(4) + ' Å'], ['H–O–H angle', ang.toFixed(1) + '°'], ['H···H distance', d(P[1], P[2]).toFixed(4) + ' Å']];
  rows.forEach(([k, v]) => { $('#geom').append(el('dt', '', k), el('dd', '', v)); });
  $('#geomNote').textContent = GEOM.note;
  $('#hud').innerHTML = '<b>H₂O</b>Water molecule<br>' + rows.map(r => r.join(': ')).join('<br>');

  function rot([x, y, z]) {
    const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
    const x1 = x * cY + z * sY, z1 = -x * sY + z * cY;
    return [x1, y * cP - z1 * sP, y * sP + z1 * cP];
  }
  function resize() {
    const r = devicePixelRatio || 1; W = stage.clientWidth; H = stage.clientHeight;
    cv.width = W * r; cv.height = H * r; ctx.setTransform(r, 0, 0, r, 0, 0);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const u = Math.min(W, H) / 4.2 * zoom, F = 8;
    const pts = P.map((p, i) => { const q = rot(p), s = F / (F - q[2]); return { x: W / 2 + q[0] * u * s, y: H / 2 - q[1] * u * s, z: q[2], s, i }; });
    const items = [];
    [1, 2].forEach(k => items.push({ z: (pts[0].z + pts[k].z) / 2, f: () => {
      const a = pts[0], b = pts[k], g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, '#e5484d'); g.addColorStop(1, '#dfe8ff');
      ctx.strokeStyle = g; ctx.lineWidth = 9 * zoom * (a.s + b.s) / 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (labels) { ctx.fillStyle = '#67e8f9'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(GEOM.OH.toFixed(3) + ' Å', (a.x + b.x) / 2 + 6, (a.y + b.y) / 2 - 12); }
    } }));
    pts.forEach(p => items.push({ z: p.z, f: () => {
      const a = A[p.i], r = a.r * u * p.s * .62, g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .35, r * .1, p.x, p.y, r);
      g.addColorStop(0, a.c[0]); g.addColorStop(.5, a.c[1]); g.addColorStop(1, a.c[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 7); ctx.fill();
      if (labels) { ctx.fillStyle = '#e6edff'; ctx.font = '700 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText(a.n, p.x, p.y - r - 8); }
    } }));
    items.sort((a, b) => a.z - b.z).forEach(i => i.f());
    if (labels) { ctx.fillStyle = '#67e8f9'; ctx.font = '600 13px system-ui'; ctx.textAlign = 'center'; ctx.fillText(ang.toFixed(1) + '°', pts[0].x, pts[0].y + 42 * zoom); }
  }
  function loop() { if (auto && !drag) yaw += .008; draw(); raf = requestAnimationFrame(loop); }

  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drag) return; yaw += (e.clientX - drag.x) * .01; pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - drag.y) * .01)); drag = { x: e.clientX, y: e.clientY }; });
  ['pointerup', 'pointercancel'].forEach(t => cv.addEventListener(t, () => drag = null));
  cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.5, Math.min(2.5, zoom * (e.deltaY < 0 ? 1.08 : .92))); }, { passive: false });
  const tog = (b, get, set) => b.onclick = () => { set(!get()); b.setAttribute('aria-pressed', get()); };
  tog($('#bLabels'), () => labels, v => labels = v);
  tog($('#bSpin'), () => auto, v => auto = v);
  $('#bSpin').setAttribute('aria-pressed', auto);
  $('#bZoomIn').onclick = () => zoom = Math.min(2.5, zoom * 1.15);
  $('#bZoomOut').onclick = () => zoom = Math.max(.5, zoom / 1.15);
  $('#bReset').onclick = () => { yaw = .6; pitch = .25; zoom = 1; };
  $('#fsBtn').onclick = () => {
    if (stage.requestFullscreen) document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen().catch(() => stage.classList.toggle('fs'));
    else stage.classList.toggle('fs');
  };
  document.addEventListener('fullscreenchange', () => { $('#fsBtn').textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
  addEventListener('keydown', e => { if (e.key === 'Escape') stage.classList.remove('fs'); });
  new ResizeObserver(resize).observe(stage);
  return { start() { resize(); if (!raf) loop(); }, stop() { cancelAnimationFrame(raf); raf = 0; } };
})();

/* ---------- Input: local file viewer (nothing is uploaded) ---------- */
const fileList = $('#files'), inEmpty = $('#inEmpty');
const parseCSV = t => t.trim().split(/\r?\n/).map(l => { const r = []; let c = '', q = 0; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { r.push(c); c = ''; } else c += ch; } r.push(c); return r; });
const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
function addFile(f) {
  inEmpty.hidden = true;
  const card = el('div', 'file'), ext = (f.name.split('.').pop() || '').toLowerCase();
  card.append(el('h4', '', f.name), el('small', '', kb(f.size) + (f.type ? ' · ' + f.type : '')));
  fileList.append(card);
  if (/^(png|jpe?g|svg|gif|webp)$/.test(ext)) { const i = el('img'); i.src = URL.createObjectURL(f); i.alt = f.name; card.append(i); return; }
  if (!/^(json|csv|txt|md|ipynb)$/.test(ext)) { card.append(el('p', 'note', 'Stored in this session only. No preview for this file type.')); return; }
  const rd = new FileReader();
  rd.onerror = () => card.append(el('p', 'note', 'Could not read this file.'));
  rd.onload = () => {
    const t = String(rd.result);
    try {
      if (ext === 'csv') {
        const rows = parseCSV(t), tb = el('table'), w = el('div', 'tw');
        rows.slice(0, 51).forEach((r, i) => { const tr = el('tr'); r.forEach(c => tr.append(el(i ? 'td' : 'th', '', c))); tb.append(tr); });
        card.append(el('p', 'note', rows.length - 1 + ' data rows, ' + rows[0].length + ' columns' + (rows.length > 51 ? ' (first 50 shown)' : '')), w); w.append(tb);
      } else if (ext === 'json' || ext === 'ipynb') {
        const j = JSON.parse(t);
        const s = Array.isArray(j) ? 'Array with ' + j.length + ' items' : j && typeof j === 'object' ? 'Object with keys: ' + Object.keys(j).slice(0, 12).join(', ') + (Object.keys(j).length > 12 ? '…' : '') : String(typeof j);
        const out = JSON.stringify(j, null, 2);
        card.append(el('p', 'note', s), el('pre', '', out.length > 3000 ? out.slice(0, 3000) + '\n… (truncated)' : out));
      } else card.append(el('pre', '', t.length > 3000 ? t.slice(0, 3000) + '\n… (truncated)' : t));
    } catch (e) { card.append(el('p', 'note', 'Parse error: ' + e.message), el('pre', '', t.slice(0, 1500))); }
  };
  rd.readAsText(f);
}
const drop = $('#drop');
$('#fileIn').onchange = e => { [...e.target.files].forEach(addFile); e.target.value = ''; };
['dragover', 'dragenter'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => [...e.dataTransfer.files].forEach(addFile));
drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileIn').click(); } });
$('#clearIn').onclick = () => { $$('.file', fileList).forEach(x => x.remove()); inEmpty.hidden = false; };

/* ---------- Output: real results only, from data/results.json ---------- */
const LABELS = [['molecule', 'Molecule'], ['method', 'Method'], ['ansatz', 'Ansatz'], ['optimizer', 'Optimizer'], ['backend', 'Backend'], ['electronic_energy', 'Electronic energy (Ha)'], ['nuclear_repulsion', 'Nuclear repulsion (Ha)'], ['total_energy', 'Total energy (Ha)'], ['evaluations', 'Evaluations']];
let results = null, loaded = false;
async function loadResults() {
  if (loaded) return; loaded = true;
  try {
    const r = await fetch('data/results.json', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    results = await r.json(); renderResults(results);
  } catch (e) { loaded = false; /* keep placeholder; retry next visit */ }
}
function renderResults(d) {
  $('#outEmpty').hidden = true; $('#outData').hidden = false;
  const st = $('#stats'); st.replaceChildren();
  LABELS.forEach(([k, l]) => { if (d[k] != null) { const c = el('div'); c.append(el('span', '', l), el('b', '', String(d[k]))); st.append(c); } });
  const hist = Array.isArray(d.history) ? d.history.filter(Number.isFinite) : [];
  $('#convBox').hidden = !hist.length;
  $('#convNote').textContent = hist.length ? hist.length + ' recorded evaluations (electronic energy, Ha).' : 'No convergence history was provided in results.json, so no graph is shown.';
  const rf = $('#refs'); rf.replaceChildren();
  if (Array.isArray(d.references) && d.references.length) {
    const tb = el('table'), hr = el('tr'), tot = Number(d.total_energy);
    ['Reference', 'Value (Ha)', 'Source', 'Difference from total (Ha)'].forEach(h => hr.append(el('th', '', h))); tb.append(hr);
    d.references.forEach(x => { const tr = el('tr'), v = Number(x.value); [x.name, x.value, x.source, Number.isFinite(v) && Number.isFinite(tot) ? (tot - v).toFixed(6) : '—'].forEach(c => tr.append(el('td', '', c ?? '—'))); tb.append(tr); });
    const w = el('div', 'tw'); w.append(tb); rf.append(w);
  } else rf.append(el('p', 'note', 'No reference values provided.'));
  $('#analysis').textContent = d.analysis || 'No analysis text provided.';
  drawChart(hist);
}
function drawChart(h) {
  const cv = $('#chart'); if (!h.length || cv.offsetParent === null) return;
  const r = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; cv.width = W * r; cv.height = H * r;
  const c = cv.getContext('2d'); c.setTransform(r, 0, 0, r, 0, 0); c.clearRect(0, 0, W, H);
  const m = { l: 70, r: 14, t: 14, b: 34 }, lo = Math.min(...h), hi = Math.max(...h), pad = (hi - lo || 1) * .08, y0 = lo - pad, y1 = hi + pad;
  const X = i => m.l + i / Math.max(h.length - 1, 1) * (W - m.l - m.r), Y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  c.font = '12px system-ui'; c.fillStyle = '#9fb0dc'; c.strokeStyle = '#24366f'; c.lineWidth = 1;
  for (let k = 0; k <= 4; k++) { const v = y0 + (y1 - y0) * k / 4, y = Y(v); c.beginPath(); c.moveTo(m.l, y); c.lineTo(W - m.r, y); c.stroke(); c.textAlign = 'right'; c.fillText(v.toFixed(3), m.l - 6, y + 4); }
  c.textAlign = 'center'; c.fillText('Evaluation', (W + m.l) / 2, H - 8); c.fillText('1', m.l, H - 20); c.fillText(String(h.length), W - m.r, H - 20);
  c.strokeStyle = '#22d3ee'; c.lineWidth = 2; c.beginPath(); h.forEach((v, i) => i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v))); c.stroke();
}
addEventListener('resize', () => { if (results && $('#output').classList.contains('active')) drawChart((results.history || []).filter(Number.isFinite)); });

addEventListener('hashchange', route);
route();
