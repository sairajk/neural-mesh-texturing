(function () {
  'use strict';

  // ---------- Config ----------
  const DATA_URL = 'data/papers.json'; // adjust if needed
  const FACETS = ['model','guidance','model_type','generation_strategy','texture_type'];
  const PRESET = {
    model: [],  // ['Diffusion','CLIP','GAN','Retrieval','Autoregressive'],
    guidance: [],  // ['Text','Image','Exemplar','CLIP','SDS','VSD'],
    model_type: [],  // ['Pretrained','Finetuned','Custom'],
    generation_strategy: [],  // ['Optimization','Iterative','Synchronized','Feed-Forward'],
    texture_type: [],  // ['RGB','PBR']
  };
  const FUSE_OPTIONS = {
    includeScore: true, threshold: 0.3, ignoreLocation: true,
    keys: [{name:'title',weight:.5},{name:'authors',weight:.3},{name:'venue',weight:.2},'year','tags',...FACETS]
  };

  // Pretty labels for chip keys (fallback to PascalCase)
  const LABELS = {
    model: 'Model',
    guidance: 'Guidance',
    model_type: 'ModelType',
    generation_strategy: 'GenerationStrategy',
    texture_type: 'TextureType',
    q: 'Search'
  };

  function toPascalCase(s) {
    // "texture_type" -> "TextureType"; "generation strategy" -> "GenerationStrategy"
    return String(s)
      .toLowerCase()
      .replace(/[_\s]+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^(.)/, (m) => m.toUpperCase());
  }

  function prettyKey(key) {
    return LABELS[key] || toPascalCase(key);
  }

  // ---------- State ----------
  let ALL = [];
  let fuse = null;
  const state = {
    q: '',
    filters: { model:new Set(), guidance:new Set(), model_type:new Set(), generation_strategy:new Set(), texture_type:new Set() },
    view: 'hybrid' // 'list' | 'table' | 'hybrid'
  };

  // ---------- Utils ----------
  const qs  = (s) => document.querySelector(s);
  const qsa = (s) => Array.from(document.querySelectorAll(s));
  const dedupe = (a) => Array.from(new Set(a.filter(Boolean)));
  const fromData = (f) => dedupe(ALL.flatMap(p => Array.isArray(p[f]) ? p[f] : (p[f] ? [p[f]] : [])).map(String));
  const facetVals = (f) => dedupe([...(PRESET[f]||[]), ...fromData(f)]).sort((a,b)=>String(a).localeCompare(String(b)));

  function showError(msg){
    console.error(msg);
    const c = qs('#cards');
    if (c) c.innerHTML = `<div style="color:#b00;text-align:center;">${String(msg)}</div>`;
  }

  // surface first runtime error visibly
  window.addEventListener('error', (e) => showError(e.message));

  function hydrateFromURL(){
    const p = new URLSearchParams(location.search);
    state.q = p.get('q') || '';
    state.view = p.get('view') || 'hybrid';
    FACETS.forEach(f => state.filters[f] = new Set((p.get(f)||'').split(',').filter(Boolean)));
  }
  function pushURL(){
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.view && state.view !== 'hybrid') p.set('view', state.view);
    FACETS.forEach(f => { const v=[...state.filters[f]]; if (v.length) p.set(f, v.join(',')); });
    history.replaceState({}, '', p.toString() ? `?${p}` : location.pathname);
  }

  // ---------- Filters (hover menus) ----------
  function renderFilters(){
    FACETS.forEach(f => {
      const menu = qs(`.filter-group[data-facet="${f}"] .menu`);
      if (!menu) return;
      menu.innerHTML = '';
      facetVals(f).forEach(val => {
        const id = `${f}-${val}`.replace(/\W+/g,'_');
        const checked = state.filters[f].has(String(val));
        menu.insertAdjacentHTML('beforeend', `
          <label style="display:flex;gap:8px;align-items:center;padding:6px 2px;">
            <input type="checkbox" id="${id}" data-facet="${f}" value="${val}" ${checked?'checked':''}>
            <span>${val}</span>
          </label>
        `);
      });
    });
  }
  function wireFacetChangeHandlers(){
    FACETS.forEach(f => {
      const menu = qs(`.filter-group[data-facet="${f}"] .menu`);
      if (!menu) return;
      menu.addEventListener('change', (e) => {
        if (!e.target.matches('input[type="checkbox"]')) return;
        const val = String(e.target.value);
        if (e.target.checked) state.filters[f].add(val); else state.filters[f].delete(val);
        update();
      });
    });
  }
  function wireHoverMenus(){
    const groups = qsa('.filter-group');
    const closeAll = (except) => groups.forEach(g => {
      if (g !== except){ g.classList.remove('is-open'); const b=g.querySelector('.menu-trigger'); if (b) b.setAttribute('aria-expanded','false'); }
    });
    groups.forEach(g => {
      const btn = g.querySelector('.menu-trigger');
      let enterTimer, leaveTimer;
      const open  = () => { clearTimeout(leaveTimer); closeAll(g); g.classList.add('is-open'); if (btn) btn.setAttribute('aria-expanded','true'); };
      const close = () => { clearTimeout(enterTimer); g.classList.remove('is-open'); if (btn) btn.setAttribute('aria-expanded','false'); };

      g.addEventListener('mouseenter', () => { enterTimer = setTimeout(open, 80); });
      g.addEventListener('mouseleave', () => { leaveTimer = setTimeout(close, 120); });
      if (btn) btn.addEventListener('click', (e) => e.preventDefault()); // hover-only
    });
    document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.filter-group')) closeAll(); });
  }

  // ---------- View switch ----------
  function setView(view){
    state.view = view;
    qsa('.view-btn').forEach(b => b.setAttribute('aria-checked', String(b.dataset.view === view)));
    update();
  }
  function wireViewSwitch(){
    const host = qs('.view-switch');
    if (!host) return;
    host.addEventListener('click', (e)=>{
      const btn = e.target.closest('.view-btn'); if (!btn) return;
      setView(btn.dataset.view);
    });
    host.addEventListener('keydown', (e)=>{
      const buttons = qsa('.view-btn');
      const idx = buttons.findIndex(b => b.dataset.view === state.view);
      if (idx < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){
        e.preventDefault();
        const dir = e.key === 'ArrowRight' ? 1 : -1;
        const next = (idx + dir + buttons.length) % buttons.length;
        setView(buttons[next].dataset.view);
        buttons[next].focus();
      } else if (e.key === ' ' || e.key === 'Spacebar'){
        e.preventDefault();
        const focused = document.activeElement.closest('.view-btn');
        if (focused && focused.dataset.view) setView(focused.dataset.view);
      }
    });
    // initialize
    setView(state.view);
  }

  // ---------- Search & Clear ----------
  function wireSearchAndClear(){
    const s = qs('#searchInput');
    if (s){ s.value = state.q; s.addEventListener('input', e => { state.q = e.target.value.trim(); update(); }); }
    const clearBtn = qs('#clearBtn');
    if (clearBtn){
      clearBtn.addEventListener('click', () => {
        state.q=''; FACETS.forEach(f => state.filters[f].clear());
        if (s) s.value = ''; renderFilters(); update();
      });
    }
    const chips = qs('#activeChips');
    if (chips){
      chips.addEventListener('click', (e) => {
        const b = e.target.closest('button.chip'); if (!b) return;
        const k = b.dataset.key, v = b.dataset.val;
        if (k==='q') state.q=''; else state.filters[k].delete(v);
        renderFilters(); update();
      });
    }
  }

  // ---------- Filtering & Search ----------
  function applyFilters(list){
    return list.filter(p =>
      FACETS.every(f => {
        const sel = state.filters[f]; if (!sel.size) return true;
        const values = Array.isArray(p[f]) ? p[f].map(String) : [String(p[f] ?? '')];
        return [...sel].some(v => values.includes(v));
      })
    );
  }
  function runSearch(base){
    if (!state.q) return base;
    const results = (fuse.search(state.q)||[]).map(r => r.item);
    const set = new Set(base);
    return results.filter(p => set.has(p));
  }

  // ---------- Renderers ----------
  function renderList(items){
    const c = qs('#cards'); if (!c) return;
    // neutralize any grid styles
    c.style.display = 'block'; c.style.gap = ''; c.style.gridTemplateColumns = '';

    if (!items.length){
      c.innerHTML = `<div style="opacity:.8; text-align:center;">No papers match your filters.</div>`;
      const cnt = qs('#count'); if (cnt) cnt.textContent = 'Showing 0 papers';
      return;
    }
    const sorted = [...items].sort((a,b)=>{
      const ya = Number(a.year)||0, yb = Number(b.year)||0;
      if (yb !== ya) return yb - ya;
      return String(a.title||'').localeCompare(String(b.title||''));
    });
    let html = `<ol class="paper-list" style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px;">`;
    let currentYear = null;
    const badge = (t)=>`<span style="display:inline-block;padding:2px 8px;border:1px solid #ddd;border-radius:999px;font-size:12px;margin-right:6px;">${t}</span>`;
    sorted.forEach(p=>{
      const y = p.year ?? '';
      if (y && y !== currentYear){
        currentYear = y;
        html += `<li aria-hidden="true" style="margin-top:4px;"><h4 style="margin:12px 0 4px;">${y}</h4></li>`;
      }
      const guidance = Array.isArray(p.guidance)?p.guidance:[p.guidance].filter(Boolean);
      const texture  = Array.isArray(p.texture_type)?p.texture_type:[p.texture_type].filter(Boolean);
      html += `
        <li style="padding:12px; border:1px solid #eee; border-radius:12px; background:#fff;">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div style="min-width:260px;">
              <div style="font-weight:600;">${p.title}</div>
              <div style="font-size:13px; opacity:.85;">${(p.authors||[]).join(', ')}</div>
              <div style="font-size:12px; opacity:.7; margin-top:2px;">${p.venue||''} ${p.year||''}</div>
              <div style="margin-top:6px;">
                ${[p.model, ...guidance, p.model_type, p.generation_strategy, ...texture].filter(Boolean).map(badge).join('')}
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              ${p?.links?.paper   ? `<a href="${p.links.paper}" target="_blank" rel="noopener">Paper</a>`   : ''}
              ${p?.links?.project ? `<a href="${p.links.project}" target="_blank" rel="noopener">Project</a>` : ''}
              ${p?.links?.code    ? `<a href="${p.links.code}" target="_blank" rel="noopener">Code</a>`    : ''}
            </div>
          </div>
        </li>`;
    });
    html += `</ol>`;
    c.innerHTML = html;
    const cnt = qs('#count'); if (cnt) cnt.textContent = `Showing ${items.length} paper${items.length===1?'':'s'}`;
  }

  function renderTable(items){
    const c = qs('#cards'); if (!c) return;
    // neutralize any grid styles
    c.style.display = 'block'; c.style.gap = ''; c.style.gridTemplateColumns = '';

    if (!items.length){
      c.innerHTML = `<div style="opacity:.8; text-align:center;">No papers match your filters.</div>`;
      const cnt = qs('#count'); if (cnt) cnt.textContent = 'Showing 0 papers';
      return;
    }
    const rows = [...items].sort((a,b)=>(Number(b.year)||0)-(Number(a.year)||0)).map(p=>{
      const g = Array.isArray(p.guidance)?p.guidance.join(', '):(p.guidance||'');
      const t = Array.isArray(p.texture_type)?p.texture_type.join(', '):(p.texture_type||'');
      return `
        <tr>
          <td>${p.title}</td>
          <td>${(p.authors||[]).join(', ')}</td>
          <td>${p.venue||''}</td>
          <td style="text-align:center;">${p.year||''}</td>
          <td>${p.model||''}</td>
          <td>${g}</td>
          <td>${p.model_type||''}</td>
          <td>${p.generation_strategy||''}</td>
          <td>${t}</td>
          <td>
            ${p?.links?.paper   ? `<a href="${p.links.paper}" target="_blank" rel="noopener">Paper</a>`   : ''}
            ${p?.links?.project ? ` · <a href="${p.links.project}" target="_blank" rel="noopener">Project</a>` : ''}
            ${p?.links?.code    ? ` · <a href="${p.links.code}" target="_blank" rel="noopener">Code</a>`    : ''}
          </td>
        </tr>`;
    }).join('');
    c.innerHTML = `
      <div style="overflow:auto;">
        <table style="width:100%; border-collapse:collapse; background:#fff;">
          <caption style="text-align:left; padding:8px 0; opacity:.8;">Filtered papers</caption>
          <thead>
            <tr>
              <th scope="col" style="text-align:left;">Title</th>
              <th scope="col" style="text-align:left;">Authors</th>
              <th scope="col" style="text-align:left;">Venue</th>
              <th scope="col" style="text-align:center;" aria-sort="descending">Year</th>
              <th scope="col" style="text-align:left;">Model</th>
              <th scope="col" style="text-align:left;">Guidance</th>
              <th scope="col" style="text-align:left;">Model Type</th>
              <th scope="col" style="text-align:left;">Generation</th>
              <th scope="col" style="text-align:left;">Texture</th>
              <th scope="col" style="text-align:left;">Links</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    const cnt = qs('#count'); if (cnt) cnt.textContent = `Showing ${items.length} paper${items.length===1?'':'s'}`;
  }

  function renderHybrid(items){
    const c = document.querySelector('#cards'); if (!c) return;
    c.style.display = 'block'; c.style.gap = ''; c.style.gridTemplateColumns = '';

    if (!items.length){
      c.innerHTML = `<div style="opacity:.8; text-align:center;">No papers match your filters.</div>`;
      const cnt = document.querySelector('#count'); if (cnt) cnt.textContent = 'Showing 0 papers';
      return;
    }

    // sort by year desc, then title
    const sorted = [...items].sort((a,b)=>{
      const ya = Number(a.year)||0, yb = Number(b.year)||0;
      if (yb !== ya) return yb - ya;
      return String(a.title||'').localeCompare(String(b.title||''));
    });

    // Header (center titles in each column)
    const header = `
      <div class="hyb-header">
        <div class="hyb-left-title">Title / Authors</div>
        <div class="hyb-attrs">
          <div>Model</div>
          <div>Guidance</div>
          <div>Model Type</div>
          <div>Generation</div>
          <div>Texture</div>
        </div>
        <div>Links</div>
      </div>`;


    const pill = (t)=> `<span class="pill">${t}</span>`;

    let currentYear = null;
    const rows = sorted.map(p=>{
      const guidance = Array.isArray(p.guidance) ? p.guidance : (p.guidance ? [p.guidance] : []);
      const texture  = Array.isArray(p.texture_type) ? p.texture_type : (p.texture_type ? [p.texture_type] : []);
      const y = p.year ?? '';
      let yearHeading = '';
      if (y && y !== currentYear){
        currentYear = y;
        yearHeading = `<div class="hyb-year">${y}</div>`;
      }
      return `${yearHeading}
        <div class="hyb-row">
          <!-- Left: paper info (left-aligned) -->
          <div class="hyb-left">
            <div class="paper-title">${p.title}</div>
            <div class="paper-authors">${(p.authors||[]).join(', ')}</div>
            <div class="paper-meta">${p.venue||''} ${p.year||''}</div>
          </div>

          <!-- Center: attributes (centered cells) -->
          <div class="hyb-attrs">
            <div>${p.model ? pill(p.model) : '—'}</div>
            <div>${guidance.length ? guidance.map(pill).join(' ') : '—'}</div>
            <div>${p.model_type ? pill(p.model_type) : '—'}</div>
            <div>${p.generation_strategy ? pill(p.generation_strategy) : '—'}</div>
            <div>${texture.length ? texture.map(pill).join(' ') : '—'}</div>
          </div>

          <!-- Right: links (stacked, right-aligned) -->
          <div class="hyb-links">
            ${p?.links?.paper   ? `<a href="${p.links.paper}" target="_blank" rel="noopener">Paper</a>`   : ''}
            ${p?.links?.project ? `<a href="${p.links.project}" target="_blank" rel="noopener">Project</a>` : ''}
            ${p?.links?.code    ? `<a href="${p.links.code}" target="_blank" rel="noopener">Code</a>`    : ''}
          </div>
        </div>`;
    }).join('');

    c.innerHTML = header + rows;
    const cnt = document.querySelector('#count'); if (cnt) cnt.textContent = `Showing ${items.length} paper${items.length===1?'':'s'}`;
  }

  // ---------- Update ----------
  function update(){
    pushURL();
    renderChips();
    const base = applyFilters(ALL);
    const out  = runSearch(base);
    if (state.view === 'table') renderTable(out);
    else if (state.view === 'hybrid') renderHybrid(out);
    else renderList(out);
  }

  function renderChips(){
    const host = qs('#activeChips'); if (!host) return;
    const chips = [];
    if (state.q) chips.push(chip('q', state.q));
    FACETS.forEach(f => state.filters[f].forEach(v => chips.push(chip(f,v))));
    host.innerHTML = chips.join('');
    function chip(key, val){
      return `<button class="chip" data-key="${key}" data-val="${val}"
        style="border:1px solid #ddd;border-radius:999px;padding:4px 10px;background:#fafafa;">
        ${prettyKey(key)}: ${val} ✕</button>`;
    }
  }

  // ---------- Init ----------
  (async function init(){
    hydrateFromURL();
    renderFilters();         // show presets immediately
    wireFacetChangeHandlers();
    wireHoverMenus();
    wireViewSwitch();
    wireSearchAndClear();

    try{
      const resp = await fetch(DATA_URL, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`${resp.status} loading ${DATA_URL}`);
      ALL = await resp.json();

      if (typeof Fuse === 'undefined') {
        throw new Error('Fuse.js not loaded — ensure the UMD script is before app.js');
      } // Fuse docs on builds: use the UMD/min build for browsers. :contentReference[oaicite:1]{index=1}

      fuse = new Fuse(ALL, FUSE_OPTIONS);
      renderFilters(); // merge any new facet values from data
      update();
      console.log('[papers]', ALL.length, 'loaded');
    }catch(err){
      showError(err.message);
    }
  })();
})();
