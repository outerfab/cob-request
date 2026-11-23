// CoB request form: one question per screen, everything stays in the browser.
(function () {
  'use strict';
  const { Q, S, WARN, boardSource } = window.COB;
  const $ = s => document.querySelector(s);
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === false || v == null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k);
    return n;
  };
  const KEY = 'cob-request-v1';
  const byId = Object.fromEntries(Q.map(q => [q.id, q]));

  // state: a = answers (id -> value), x = extra input per question, pos = current question id or 'intro'/'result'
  let st = { a: {}, x: {}, pos: 'intro' };
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.a && s.pos) st = s; } catch (_) { /* fresh start */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) { /* private mode */ } };

  const visible = () => Q.filter(q => !q.show || q.show(st.a));
  const answered = q => q.type === 'info' ? st.a[q.id] === 'seen' : st.a[q.id] !== undefined;

  function go(pos) { st.pos = pos; save(); render(); window.scrollTo(0, 0); }
  function next() {
    const v = visible(); const i = v.findIndex(q => q.id === st.pos);
    go(i < 0 || i === v.length - 1 ? 'result' : v[i + 1].id);
  }
  function back() {
    const v = visible();
    if (st.pos === 'result') return go(v[v.length - 1].id);
    const i = v.findIndex(q => q.id === st.pos);
    go(i <= 0 ? 'intro' : v[i - 1].id);
  }

  // ---- header progress -------------------------------------------------
  function renderProgress() {
    const v = visible();
    const secs = [...new Set(v.map(q => q.sec))];
    const cur = st.pos === 'result' ? null : (byId[st.pos] || {}).sec;
    const done = st.pos === 'result' ? v.length : Math.max(0, v.findIndex(q => q.id === st.pos));
    const nav = $('#steps'); nav.replaceChildren();
    if (st.pos === 'intro') { $('#bar').style.width = '0%'; $('#count').textContent = ''; return; }
    for (const s of secs) {
      const first = v.find(q => q.sec === s);
      const reached = v.filter(q => q.sec === s).some(answered) || s === cur;
      nav.append(el('button', { type: 'button', class: 'step' + (s === cur ? ' is-cur' : '') + (reached ? '' : ' is-off'), disabled: !reached,
        onclick: () => go(first.id), text: S[s] }));
    }
    nav.append(el('button', { type: 'button', class: 'step' + (st.pos === 'result' ? ' is-cur' : ' is-off'), disabled: true, text: 'Result' }));
    $('#bar').style.width = Math.round(100 * done / v.length) + '%';
    $('#count').textContent = st.pos === 'result' ? `${v.length} questions answered` : `question ${done + 1} of ${v.length}`;
  }

  // ---- screens ------------------------------------------------------------
  function render() {
    if (st.pos !== 'intro' && st.pos !== 'result' && !visible().some(q => q.id === st.pos)) st.pos = 'intro';
    renderProgress();
    const main = $('#stage'); main.replaceChildren();
    if (st.pos === 'intro') return main.append(intro());
    if (st.pos === 'result') return main.append(result());
    const q = byId[st.pos];
    main.append(q.type === 'info' ? info(q) : q.type === 'contact' ? contact(q) : question(q));
    const f = main.querySelector('[data-focus]') || main.querySelector('input:checked') || main.querySelector('input,button');
    if (f) f.focus({ preventScroll: true });
  }

  function intro() {
    const has = Object.keys(st.a).length > 0;
    return el('section', { class: 'card hero' },
      el('div', { class: 'eyebrow', text: 'outerfab · chip-on-board' }),
      el('h1', { text: 'get your chip bonded' }),
      el('p', { class: 'lead', text: 'You have a bare die, or you will have one soon. We glue it onto a board, wire bond it and send it back ready to power up.' }),
      el('p', { text: 'This form asks what we need to know for a quote. Most people see 35 to 45 short questions and need about ten minutes. You can answer "Not sure" almost everywhere.' }),
      el('ul', { class: 'facts' },
        el('li', { text: 'Nothing is uploaded. Your answers stay in this browser.' }),
        el('li', { text: 'At the end you get one JSON document to copy and send to us.' })),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn primary', 'data-focus': true, onclick: () => go(has ? firstOpen() : visible()[0].id), text: has ? 'continue' : 'start' }),
        has ? el('button', { type: 'button', class: 'btn ghost', onclick: reset, text: 'start over' }) : null));
  }
  const firstOpen = () => { const q = visible().find(q => !answered(q)); return q ? q.id : 'result'; };
  function reset() { st = { a: {}, x: {}, pos: 'intro' }; save(); render(); }

  const head = q => [
    el('div', { class: 'eyebrow', text: `${S[q.sec].toLowerCase()} · ${q.id}` }),
    el('h2', { id: 'qtitle', text: q.q || q.title }),
    q.help ? el('p', { class: 'help', text: q.help }) : null];
  const nav = (onNext, label = 'next') => el('div', { class: 'actions' },
    el('button', { type: 'button', class: 'btn ghost', onclick: back, text: 'back' }),
    el('button', { type: 'submit', class: 'btn primary', onclick: onNext ? e => { e.preventDefault(); onNext(); } : null, text: label }));

  function info(q) {
    return el('form', { class: 'card', onsubmit: e => { e.preventDefault(); st.a[q.id] = 'seen'; next(); } },
      head(q), q.body.map(t => el('p', { text: t })), nav(null, 'got it'));
  }

  function question(q) {
    const err = el('p', { class: 'err', role: 'alert' });
    const list = el('div', { class: 'opts', role: 'radiogroup', 'aria-labelledby': 'qtitle' });
    const form = el('form', { class: 'card', novalidate: true, onsubmit: e => { e.preventDefault(); submit(); } }, head(q), list, err, nav());
    const extras = {};
    q.opts.forEach((o, i) => {
      const id = `o${i}`;
      const radio = el('input', { type: 'radio', name: 'opt', id, value: o.v, checked: st.a[q.id] === o.v });
      const row = el('div', { class: 'opt' + (o.v === 'unspecified' ? ' is-ns' : '') }, radio, el('label', { for: id, text: o.l }));
      if (o.input) {
        const x = el('div', { class: 'extra' });
        if (o.input === 'file') {
          const inp = el('input', { type: 'file', accept: o.accept || false, 'aria-label': o.l + ': file' });
          const note = el('span', { class: 'fname', text: st.a[q.id] === o.v && st.x[q.id] ? `selected: ${st.x[q.id]}` : '' });
          inp.addEventListener('change', () => { radio.checked = true; sync(); readFile(q, inp.files[0], note); });
          x.append(inp, note); if (o.note) x.append(el('span', { class: 'fnote', text: o.note }));
          extras[o.v] = { file: inp };
        } else {
          const inp = el('input', { type: o.input === 'number' ? 'number' : o.input === 'date' ? 'date' : 'text', placeholder: o.ph || false,
            step: o.input === 'number' ? 'any' : false, min: o.input === 'number' ? '0' : false, 'aria-label': o.l,
            value: st.a[q.id] === o.v && st.x[q.id] != null ? st.x[q.id] : false });
          inp.addEventListener('focus', () => { radio.checked = true; sync(); });
          x.append(inp); if (o.unit) x.append(el('span', { class: 'unit', text: o.unit }));
          extras[o.v] = { inp };
        }
        row.append(x);
      }
      radio.addEventListener('change', () => { sync(); const e = extras[o.v]; if (e && e.inp) e.inp.focus(); });
      // a plain option needs no second click
      row.querySelector('label').addEventListener('click', () => { if (!o.input) setTimeout(submit, 120); });
      list.append(row);
    });
    function sync() { list.querySelectorAll('.opt').forEach(r => r.classList.toggle('is-on', r.querySelector('input[type=radio]').checked)); err.textContent = ''; }
    function submit() {
      const sel = list.querySelector('input[type=radio]:checked');
      if (!sel) { err.textContent = 'Please pick one answer. "Not sure" is fine where it is offered.'; return; }
      const o = q.opts.find(o => o.v === sel.value); const e = extras[o.v];
      if (e && e.inp) {
        const val = e.inp.value.trim();
        if (!val) { err.textContent = 'Please fill in the field, or pick another answer.'; e.inp.focus(); return; }
        st.x[q.id] = o.input === 'number' ? Number(val) : val;
        if (o.input === 'number' && !(st.x[q.id] >= 0)) { err.textContent = 'Please enter a number.'; e.inp.focus(); return; }
      } else if (e && e.file) {
        if (!st.x[q.id]) { err.textContent = 'Please choose a file, or pick another answer.'; return; }
      } else delete st.x[q.id];
      st.a[q.id] = o.v;
      if (q.id === 'q49') {
        if (o.v === 'no') delete st.a._upload;
        else if (st.a._upload) st.a._upload.complete = o.v === 'complete' && st.a._upload.valid && st.a._upload.unspecified === 0;
      }
      next();
    }
    sync();
    return form;
  }

  // Reads a chosen file. For Q49 the JSON is parsed and kept; for other questions only the name is noted.
  function readFile(q, file, note) {
    if (!file) return;
    st.x[q.id] = file.name; note.textContent = `selected: ${file.name}`;
    if (q.id !== 'q49') { save(); return; }
    const r = new FileReader();
    r.onload = () => {
      let data = null, valid = false, n = 0;
      try { data = JSON.parse(r.result); valid = data !== null && typeof data === 'object'; } catch (_) { /* not JSON */ }
      if (valid) n = (JSON.stringify(data).match(/"unspecified"/g) || []).length;
      st.a._upload = { name: file.name, valid, unspecified: n, complete: st.a.q49 === 'complete' && valid && n === 0, data: valid ? data : null };
      note.textContent = !valid ? `${file.name}: this is not a JSON document` : `${file.name}: read, ${n} value${n === 1 ? '' : 's'} marked "unspecified"`;
      save();
    };
    r.readAsText(file);
  }

  function contact(q) {
    const cur = st.a[q.id] || {};
    const err = el('p', { class: 'err', role: 'alert' });
    const inputs = q.fields.map(f => el('input', { type: f.type || 'text', id: 'f_' + f.id, autocomplete: f.ac, value: cur[f.id] || false }));
    return el('form', { class: 'card', novalidate: true, onsubmit: e => {
      e.preventDefault();
      const v = Object.fromEntries(q.fields.map((f, i) => [f.id, inputs[i].value.trim()]));
      if (!v.name || !v.email) { err.textContent = 'Please give at least a name and an e-mail address.'; return; }
      if (!/^\S+@\S+\.\S+$/.test(v.email)) { err.textContent = 'That e-mail address does not look right.'; return; }
      st.a[q.id] = v; next();
    } }, head(q), el('div', { class: 'fields' }, q.fields.map((f, i) => el('div', { class: 'field' }, el('label', { for: 'f_' + f.id, text: f.l }), inputs[i]))),
    err, nav(null, 'show result'));
  }

  // ---- result -------------------------------------------------------------
  function build() {
    const a = st.a, out = { format: 'outerfab.cob-request', version: '0.1', created: new Date().toISOString().slice(0, 10) };
    const open = [];
    const set = (path, val) => { const p = path.split('.'); let o = out; while (p.length > 1) { const k = p.shift(); o = o[k] = o[k] || {}; } o[p[0]] = val; };
    const shown = new Set(visible().map(q => q.id));
    for (const q of Q) {
      if (q.type === 'info') continue;
      if (!shown.has(q.id)) { set(q.key, q.type === 'contact' ? 'unspecified' : (q.skip || 'not applicable')); continue; }
      const v = a[q.id];
      if (v === undefined) { set(q.key, 'unspecified'); open.push({ question: q.id.toUpperCase(), text: q.q, reason: 'not answered' }); continue; }
      if (q.type === 'contact') { set(q.key, v); continue; }
      const o = q.opts.find(o => o.v === v);
      if (v === 'unspecified') open.push({ question: q.id.toUpperCase(), text: q.q, reason: 'not sure' });
      if (o && o.input === 'file') set(q.key, { answer: v, file: st.x[q.id] || 'unspecified' });
      else if (o && o.input) set(q.key, o.unit ? { answer: v, value: st.x[q.id], unit: o.unit } : { answer: v, value: st.x[q.id] });
      else set(q.key, v);
    }
    out.board.provided_by = boardSource(a);
    out.open_cob_json = a._upload && a._upload.valid ? a._upload.data : 'none';
    out.open_points = open;
    const up = a._upload ? (!a._upload.valid ? 'not a JSON document' : `${a._upload.unspecified} values are "unspecified"`) : '';
    out.warnings = WARN.filter(([test]) => test(a)).map(([, t]) => t.replace('%upload%', up));
    return out;
  }

  function highlight(json) {
    const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    return esc(json).replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?/g, (m, str, colon, lit) =>
      str ? (colon ? `<span class="k">${str}</span>${colon}` : `<span class="${str === '"unspecified"' ? 'u' : 's'}">${str}</span>`)
        : `<span class="n">${m}</span>`);
  }

  function result() {
    const data = build(); const json = JSON.stringify(data, null, 2);
    const code = el('code'); code.innerHTML = highlight(json);
    const copied = el('span', { class: 'copied', role: 'status' });
    const copy = async () => {
      try { await navigator.clipboard.writeText(json); copied.textContent = 'copied'; }
      catch (_) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copied.textContent = 'selected, press Ctrl+C'; }
      setTimeout(() => { copied.textContent = ''; }, 2500);
    };
    const download = () => {
      const u = URL.createObjectURL(new Blob([json + '\n'], { type: 'application/json' }));
      const l = el('a', { href: u, download: 'cob-request.json' }); document.body.append(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000);
    };
    const list = (title, cls, items, empty) => el('div', { class: 'note ' + cls },
      el('h3', { text: title }), items.length ? el('ul', {}, items.map(t => el('li', { text: t }))) : el('p', { text: empty }));
    return el('section', { class: 'card wide' },
      el('div', { class: 'eyebrow', text: 'result' }),
      el('h2', { text: 'your chip-on-board request' }),
      el('p', { class: 'lead', text: 'Copy this document and send it to your contact at outerfab. It contains everything you answered, and nothing else left this browser.' }),
      el('div', { class: 'notes' },
        list('to check before a quote', 'warn', data.warnings, 'Nothing stands in the way of a quote.'),
        list('open points', 'open', data.open_points.map(p => `${p.question}: ${p.text}`), 'No open points. You answered everything.')),
      el('div', { class: 'codebar' },
        el('span', { class: 'fn', text: 'cob-request.json' }), copied,
        el('button', { type: 'button', class: 'btn', 'data-focus': true, onclick: copy, text: 'copy' }),
        el('button', { type: 'button', class: 'btn ghost', onclick: download, text: 'download' })),
      el('pre', { tabindex: '0', 'aria-label': 'request as JSON' }, code),
      el('div', { class: 'actions' },
        el('button', { type: 'button', class: 'btn ghost', onclick: back, text: 'back' }),
        el('button', { type: 'button', class: 'btn ghost', onclick: reset, text: 'start over' })));
  }

  render();
})();
