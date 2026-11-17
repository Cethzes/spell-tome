// Game data lives in data/*.json and is loaded by boot() at the bottom of this file.
let SPELLS = [];  // data/spells.json, sorted by level then name
let WIZARD;       // data/wizard.json: per-level progression and class features

// Display vocabulary (each school's ink colour is --s-<School> in styles.css)
const SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"];
const ORD = ["Cantrips", "1st Level", "2nd Level", "3rd Level", "4th Level", "5th Level", "6th Level", "7th Level", "8th Level", "9th Level"];
const ORDN = ["Cantrip", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th"];
const LVL_TXT = l => l === 0 ? "cantrip" : ORDN[l] + "-level";
const TAB_INK = ["#5b4a2a", "#7a2230", "#7a2230", "#6a2840", "#6a2840", "#4a2f5e", "#4a2f5e", "#24425e", "#24425e", "#2d4a33"];

const store = {
  get() { try { return new Set(JSON.parse(localStorage.getItem("tome-prepared") || "[]")); } catch { return new Set(); } },
  set(s) { try { localStorage.setItem("tome-prepared", JSON.stringify([...s])); } catch {} }
};
const prepared = store.get();
const filt = { q: "", schools: new Set(), conc: false, ritual: false, prep: false };

const chDefault = { name: "", level: 1, int: 16, ac: 12, hp: 8, hpMax: 8, temp: 0, amt: "", hd: 0, dsS: 0, dsF: 0, arc: 0, conc: "", slots: [0,0,0,0,0,0,0,0,0] };
const ch = (() => { try { return { ...chDefault, ...JSON.parse(localStorage.getItem("tome-character") || "{}") }; } catch { return { ...chDefault }; } })();
const saveCh = () => { try { localStorage.setItem("tome-character", JSON.stringify(ch)); } catch {} };
let pendingLong = false;
const sgn = n => (n >= 0 ? "+" : "") + n;
function calc() {
  const L = ch.level, row = WIZARD.progression[L - 1];
  const mod = Math.floor((ch.int - 10) / 2), pb = 2 + Math.floor((L - 1) / 4);
  return { L, mod, pb, dc: 8 + mod + pb, atk: mod + pb, slots: row.spellSlots, prep: row.preparedSpells, cant: row.cantrips };
}
// pips: filled = available (or marked, when inv). Clicking a filled pip spends/marks one; an empty pip restores.
const pips = (key, total, used, label, inv, cls = "") => `<span class="pips" role="group" aria-label="${label}">${
  Array.from({ length: total }, (_, i) => `<button class="pip ${cls} ${i < (inv ? used : total - used) ? "on" : ""}" data-pip="${key}" data-total="${total}" ${inv ? 'data-inv="1"' : ""} data-f="${key}#${i}" aria-label="${label} ${i + 1}"></button>`).join("")}</span>`;
const getU = k => k.startsWith("slots:") ? ch.slots[+k.slice(6)] : ch[k];
const setU = (k, v) => k.startsWith("slots:") ? (ch.slots[+k.slice(6)] = v) : (ch[k] = v);

const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let pages = [], closing = false, COVER = ""; // COVER: www/cover.svg markup, inlined so it can use the page fonts

function matches(s) {
  const q = filt.q.trim().toLowerCase();
  return (!q || s.name.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q))
    && (!filt.schools.size || filt.schools.has(s.school))
    && (!filt.conc || s.concentration) && (!filt.ritual || s.ritual)
    && (!filt.prep || prepared.has(s.name));
}

// Page list: title, contents, then per level a section page followed by one page per spell.
// Each section opens on a left-hand page (even index), padded with a blank page if needed.
function buildPages(list) {
  const out = [{ t: "title" }, { t: "toc" }, { t: "ledger" }, { t: "slots" }, { t: "prep" }];
  for (let l = 0; l <= 9; l++) {
    const sp = list.filter(s => s.level === l);
    if (!sp.length) continue;
    if (out.length % 2) out.push({ t: "blank" });
    out.push({ t: "sect", lvl: l, spells: sp });
    sp.forEach(s => out.push({ t: "spell", s }));
  }
  return out;
}

function render(i) {
  const p = pages[i];
  if (!p) return "";
  const folio = `<div class="folio">${i + 1}</div>`;
  const pgOf = s => pages.findIndex(x => x.s === s) + 1;
  let h = "";
  if (p.t === "title") {
    const n = pages.filter(x => x.t === "spell").length;
    h = `<div class="title-pg">
      <div class="orn">✦ ✦ ✦</div>
      <h2>Liber<br>Arcanorum</h2>
      <div class="sub">being the spells a wizard may scribe</div>
      <div class="orn">❧</div>
      <div class="count">${n} of ${SPELLS.length} spells shown</div>
      <p>Drag a page corner, or use your arrow keys. The ribbons jump to each level; the last one closes the book. Drag the leather to move it.</p>
    </div>`;
  } else if (p.t === "toc") {
    const front = { ledger: "Wizard's Ledger", slots: "Spell Slots", prep: "Prepared Spells" };
    const rows = pages.map((x, j) => x.t === "sect"
      ? `<li><button class="lead" data-go="${j}"><span class="n">${ORD[x.lvl]}<em>${x.spells.length} spells</em></span><span class="pg">${j + 1}</span></button></li>`
      : front[x.t] ? `<li><button class="lead" data-go="${j}"><span class="n">${front[x.t]}</span><span class="pg">${j + 1}</span></button></li>` : "").join("");
    const chip = (attr, on, label, c = "") => `<button class="chip" ${attr} data-f="chip-${label}" aria-pressed="${on}"${c && ` style="--c:var(--s-${c})"`}>${c ? '<span class="dot"></span>' : ""}${label}</button>`;
    const finder = `<div class="finder">
      <input type="search" data-q data-f="q" placeholder="Search spells or effects…" aria-label="Search spells" autocomplete="off" value="${esc(filt.q)}">
      <div class="chips" role="group" aria-label="Filter spells">${SCHOOLS.map(k => chip(`data-school="${k}"`, filt.schools.has(k), k, k)).join("")}
        ${chip('data-flag="conc"', filt.conc, "Concentration")}${chip('data-flag="ritual"', filt.ritual, "Ritual")}${chip('data-flag="prep"', filt.prep, "✦ Prepared")}
        <button class="chip clear" data-clear data-f="clear">Clear</button></div></div>`;
    h = `<div class="toc"><h2>Contents</h2>${finder}${rows ? `<ol>${rows}</ol>` : `<p class="empty">No spell in this tome matches your filters.</p>`}</div>`;
  } else if (p.t === "ledger") {
    const c = calc(), num = (k, label, min, max) => `<label class="fld"><span>${label}</span><input type="number" inputmode="numeric" data-k="${k}" data-f="${k}" min="${min}" max="${max}" value="${ch[k]}"></label>`;
    h = `<div class="sheet"><h2>Wizard's Ledger</h2><div class="orn">❦</div>
      <label class="fld name"><span>Name</span><input data-k="name" data-f="name" maxlength="40" placeholder="Your wizard's name" value="${esc(ch.name)}"></label>
      <div class="row">
        <label class="fld"><span>Level</span><select data-k="level" data-f="level">${Array.from({ length: 20 }, (_, i) => `<option ${i + 1 === c.L ? "selected" : ""}>${i + 1}</option>`).join("")}</select></label>
        ${num("int", "Intelligence", 1, 30)}${num("ac", "Armor Class", 0, 40)}
      </div>
      <div class="row derived">
        <div class="stat"><span>Int Mod</span><b data-out="mod">${sgn(c.mod)}</b></div>
        <div class="stat"><span>Proficiency</span><b>${sgn(c.pb)}</b></div>
        <div class="stat"><span>Save DC</span><b data-out="dc">${c.dc}</b></div>
        <div class="stat"><span>Spell Attack</span><b data-out="atk">${sgn(c.atk)}</b></div>
      </div>
      <h4>Hit Points</h4>
      <div class="row">${num("hp", "Current", 0, 999)}${num("hpMax", "Maximum", 1, 999)}${num("temp", "Temporary", 0, 999)}</div>
      <div class="hpline"><input type="number" inputmode="numeric" min="0" data-k="amt" data-f="amt" aria-label="Amount of damage or healing" placeholder="Amt" value="${ch.amt}">
        <button class="prep" data-act="dmg" data-f="dmg">Take damage</button><button class="prep" data-act="heal" data-f="heal">Heal</button></div>
      <h4>Hit Point Dice <small>d${WIZARD.hitDie} · ${c.L - ch.hd} of ${c.L} left</small></h4>${pips("hd", c.L, ch.hd, "Hit Point Die")}
      <h4>Death Saves</h4>
      <div class="ds"><span>Successes</span>${pips("dsS", 3, ch.dsS, "Success", true, "ok")}<span>Failures</span>${pips("dsF", 3, ch.dsF, "Failure", true)}</div>
      <h4>Concentration</h4>
      <p class="note">${ch.conc ? `Concentrating on <b>${esc(ch.conc)}</b> <button class="prep" data-act="drop" data-f="drop">End</button>` : "Not concentrating. Start from a spell's page."}</p>
    </div>`;
  } else if (p.t === "slots") {
    const c = calc();
    h = `<div class="sheet"><h2>Spell Slots</h2><div class="kicker">tap a filled pip to spend a slot, an empty one to restore it</div><div class="orn">❦</div>
      <div>${c.slots.map((t, i) => `<div class="slotrow"><span>${ORDN[i + 1]}</span>${pips("slots:" + i, t, ch.slots[i], ORDN[i + 1] + "-level slot")}<em>${t - ch.slots[i]}/${t}</em></div>`).join("")}</div>
      <h4>Arcane Recovery ${pips("arc", 1, ch.arc, "Arcane Recovery used", true)} <small>${ch.arc ? "used" : "available"}</small></h4>
      <p class="note">Once per Long Rest, when you finish a Short Rest, regain expended slots with a combined level of up to <b>${Math.ceil(c.L / 2)}</b>. None can be 6th level or higher.</p>
      <div class="acts"><button class="prep" data-act="long" data-f="long" aria-pressed="${pendingLong}">${pendingLong ? "Confirm: restore HP, dice and slots" : "Take a Long Rest"}</button></div>
      <h4>Class Features</h4>
      <ul class="feats">${WIZARD.features.filter(f => f.level <= c.L).map(f => `<li><b>${f.level}</b>${esc(f.name)}: ${esc(f.text)}</li>`).join("")}</ul>
    </div>`;
  } else if (p.t === "prep") {
    const c = calc(), mine = SPELLS.filter(s => prepared.has(s.name));
    const nc = mine.filter(s => !s.level).length, np = mine.length - nc;
    const groups = ORD.map((label, l) => {
      const sp = mine.filter(s => s.level === l);
      if (!sp.length) return "";
      return `<h4>${label}${l > c.slots.length ? " <small>no slots yet</small>" : ""}</h4><ul>${sp.map(s => {
        const pg = pgOf(s), inner = `<span class="n"><span class="sig" style="--c:var(--s-${s.school})"></span>${esc(s.name)}${s.concentration ? '<span class="mk">C</span>' : ""}${s.ritual ? '<span class="mk">R</span>' : ""}</span><span class="pg">${pg || "–"}</span>`;
        return `<li>${pg ? `<button class="lead" data-go="${pg - 1}">${inner}</button>` : `<span class="lead">${inner}</span>`}<button class="x" data-prep="${esc(s.name)}" aria-label="Unprepare ${esc(s.name)}">×</button></li>`;
      }).join("")}</ul>`;
    }).join("");
    h = `<div class="sheet prepd"><h2>Prepared Spells</h2>
      <div class="kicker ${np > c.prep || nc > c.cant ? "over" : ""}">${np} of ${c.prep} prepared · ${nc} of ${c.cant} cantrips</div><div class="orn">❦</div>
      ${groups || `<p class="empty">Nothing prepared yet. Open any spell's page and choose Prepare this spell.</p>`}
    </div>`;
  } else if (p.t === "sect") {
    const rows = p.spells.map(s => `<li><button class="lead" data-go="${pgOf(s) - 1}"><span class="n"><span class="sig" style="--c:var(--s-${s.school})"></span>${esc(s.name)}${s.concentration ? '<span class="mk" title="Concentration">C</span>' : ""}${s.ritual ? '<span class="mk" title="Ritual">R</span>' : ""}${prepared.has(s.name) ? ' <span class="star" title="Prepared">✦</span>' : ""}</span><span class="pg">${pgOf(s)}</span></button></li>`).join("");
    h = `<div class="sect"><h2>${ORD[p.lvl]}</h2><div class="kicker">${p.lvl ? "spells of the " + LVL_TXT(p.lvl).replace("-level", "") + " circle" : "minor workings, cast at will"}</div><div class="orn">❦</div><ul>${rows}</ul></div>`;
  } else if (p.t === "spell") {
    const s = p.s, c = `var(--s-${s.school})`, on = prepared.has(s.name);
    h = `<article class="spell" style="--c:${c}">
      <div class="lvl">${s.level ? `${LVL_TXT(s.level)} ${s.school.toLowerCase()}` : `${s.school.toLowerCase()} cantrip`}</div>
      <h3>${esc(s.name)}</h3>
      <dl class="stats">
        <div><dt>Casting Time</dt><dd>${s.castingTime}${s.ritual ? " or Ritual" : ""}</dd></div>
        <div><dt>Range</dt><dd>${s.range}</dd></div>
        <div><dt>Components</dt><dd>${s.components.join(", ")}</dd></div>
        <div><dt>Duration</dt><dd>${s.concentration ? "Concentration, up to " : ""}${s.duration}</dd></div>
      </dl>
      <div class="tags"><span class="tag school">${s.school}</span>${s.concentration ? '<span class="tag c">Concentration</span>' : ""}${s.ritual ? '<span class="tag r">Ritual</span>' : ""}</div>
      <p class="desc">${esc(s.summary)}</p>
      <div class="acts">
        <button class="prep" data-prep="${esc(s.name)}" data-f="prep" aria-pressed="${on}">${s.level ? (on ? "✦ Prepared" : "Prepare this spell") : (on ? "✦ Known" : "Mark as known")}</button>
        ${s.concentration ? `<button class="prep" data-act="conc" data-name="${esc(s.name)}" data-f="conc" aria-pressed="${ch.conc === s.name}">${ch.conc === s.name ? "Concentrating" : "Concentrate on this"}</button>` : ""}
      </div>
    </article>`;
  } else {
    h = `<div class="blank">❧</div>`;
  }
  return `<div class="inner">${h}</div>${folio}`;
}

// ---------- the book: turn.js owns page turning ----------
// Turn page 1 is the front cover (alone on the right), pages[i] is turn page i + 2, and the last turn page is
// the back cover (alone on the left). One turn.js instance lives for the whole session (it has no destroy);
// filter changes add/remove page elements at the end and every page's content is re-rendered in place.
const flip = window.jQuery && jQuery.fn.turn ? jQuery("#flip") : null;
const els = [null]; // els[p] is the element for turn page p
const html = [];    // last HTML written to each element, so unchanged pages are not touched
const total = () => pages.length + 2 + (pages.length % 2); // even, so the back cover sits alone on the left
const view = () => flip.turn("view");                      // e.g. [4, 5]; 0 marks an empty side

function renderAt(p) {
  if (p === 1) return COVER ? `<div class="cover-art">${COVER}</div>` : `<div class="cover-title">Liber<br>Arcanorum</div>`;
  if (p === total()) return `<div class="cover-title">❦</div>`;
  return render(p - 2) || `<div class="inner"><div class="blank">❧</div></div>`;
}

function show() {
  if (!WIZARD || !flip) return;
  const ae = document.activeElement, f = ae?.dataset?.f, caret = ae?.selectionStart; // keep focus + caret across re-render
  const host = ae?.closest?.(".page");
  for (let p = 1; p <= total(); p++) {
    const h = renderAt(p), el = els[p];
    if (html[p] === h) continue;
    html[p] = h;
    el.innerHTML = h;
    el.classList.toggle("cover", p === 1 || p === total());
    el.classList.toggle("cover-front", p === 1);
    el.classList.toggle("cover-back", p === total());
  }
  const [a, b] = view(), vis = [a - 2, b - 2].map(i => pages[i]).filter(Boolean);
  const lv = vis.find(p => p.t === "sect" || p.t === "spell");
  const L = vis.some(p => ["ledger", "slots", "prep"].includes(p.t)) ? -2 : lv ? (lv.lvl ?? lv.s.level) : vis.some(p => p.t === "toc") ? -3 : -1;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", +t.dataset.lvl === L));
  $("book").classList.toggle("shut-front", !a);
  $("book").classList.toggle("shut-back", !b);
  const el = f && host?.isConnected && host.querySelector(`[data-f="${CSS.escape(f)}"]`);
  if (el && el !== ae) { el.focus(); try { if (caret != null) el.setSelectionRange(caret, caret); } catch {} }
}

const go = i => flip.turn("page", Math.max(1, Math.min(total(), i + 2)));

function makePage() {
  const el = document.createElement("div"), p = els.length;
  el.className = "page " + (p % 2 ? "r" : "l");
  // turn.js grabs presses in its corner zones; let the page's own controls have them
  el.addEventListener("pointerdown", e => { if (e.target.closest("input, select, button, textarea")) e.stopPropagation(); });
  els.push(el);
  return el;
}

function rebuild(keep) {
  if (!WIZARD || !flip) return; // data or libraries still loading (or failed)
  const [a, b] = view(), anchor = keep ? pages[(a || b) - 2] : null;
  pages = buildPages(SPELLS.filter(matches));
  const T = total();
  while (els.length - 1 < T) flip.turn("addPage", makePage(), els.length - 1);
  // one at a time from the end: turn.js's own pages(n) shrink loop skips every other page
  while (els.length - 1 > T) { flip.turn("removePage", els.length - 1); els.pop(); }
  html.length = 0; // page numbering may have shifted; re-render everything once
  $("tabs").innerHTML = `<button class="tab" data-go="1" data-lvl="-3" style="--tab:#3e4a3a" title="Contents and search">❦</button><button class="tab" data-go="2" data-lvl="-2" style="--tab:#7a5a1e" title="Wizard's Ledger">✦</button>` + pages.map((p, j) => p.t === "sect"
    ? `<button class="tab" data-go="${j}" data-lvl="${p.lvl}" style="--tab:${TAB_INK[p.lvl]}" title="${ORD[p.lvl]}">${p.lvl || "C"}</button>` : "").join("") + `<button class="tab close" data-close title="Close the book">✕</button>`;
  show();
  if (anchor) {
    const back = pages.findIndex(p => anchor.s ? p.s === anchor.s : anchor.t === "sect" ? p.t === "sect" && p.lvl === anchor.lvl : p.t === anchor.t);
    if (back >= 0 && !view().includes(back + 2)) go(back);
  }
}

// navigation
document.addEventListener("click", e => {
  if (e.target.closest("[data-close]")) return closeBook();
  if (e.target.closest(".cover-front")) return flip.turn("next");
  if (e.target.closest(".cover-back")) return flip.turn("previous");
  const fc = e.target.closest("[data-school], [data-flag], [data-clear]");
  if (fc) {
    const d = fc.dataset;
    if ("clear" in d) { filt.schools.clear(); filt.conc = filt.ritual = filt.prep = false; filt.q = ""; }
    else if (d.school) filt.schools.has(d.school) ? filt.schools.delete(d.school) : filt.schools.add(d.school);
    else filt[d.flag] = !filt[d.flag];
    return rebuild(true);
  }
  const g = e.target.closest("[data-go]");
  if (g) return go(+g.dataset.go);
  const p = e.target.closest("[data-prep]");
  if (p) {
    const n = p.dataset.prep; prepared.has(n) ? prepared.delete(n) : prepared.add(n); store.set(prepared);
    filt.prep ? rebuild(true) : show();
    return;
  }
  const pip = e.target.closest("[data-pip]");
  if (pip) {
    const k = pip.dataset.pip, total = +pip.dataset.total;
    const spend = pip.classList.contains("on") !== !!pip.dataset.inv;
    setU(k, Math.max(0, Math.min(total, getU(k) + (spend ? 1 : -1))));
    saveCh(); show();
    return;
  }
  const a = e.target.closest("[data-act]");
  if (a) {
    const act = a.dataset.act, amt = Math.max(0, +ch.amt || 0);
    if (act !== "long") pendingLong = false;
    if (act === "dmg") { const t = Math.min(ch.temp, amt); ch.temp -= t; ch.hp = Math.max(0, ch.hp - (amt - t)); }
    if (act === "heal") { ch.hp = Math.min(ch.hpMax, ch.hp + amt); if (ch.hp > 0) ch.dsS = ch.dsF = 0; }
    if (act === "drop") ch.conc = "";
    if (act === "conc") ch.conc = ch.conc === a.dataset.name ? "" : a.dataset.name;
    if (act === "long") {
      if (pendingLong) Object.assign(ch, { hp: ch.hpMax, temp: 0, hd: 0, dsS: 0, dsF: 0, arc: 0, conc: "", slots: ch.slots.map(() => 0) });
      pendingLong = !pendingLong;
    }
    saveCh(); show();
  }
});
// sheet fields: store as you type; only level changes need a full re-render (slot table, hit dice)
let qt;
document.addEventListener("input", e => {
  if (e.target.closest("#book .page [data-q]")) { clearTimeout(qt); const v = e.target.value; qt = setTimeout(() => { filt.q = v; rebuild(true); }, 150); return; }
  const k = e.target.dataset?.k; if (!k) return;
  ch[k] = k === "name" || k === "amt" ? e.target.value : Math.max(0, +e.target.value || 0);
  if (k === "level") {
    ch.level = Math.min(20, Math.max(1, ch.level));
    ch.slots = ch.slots.map((u, i) => Math.min(u, WIZARD.progression[ch.level - 1].spellSlots[i] || 0));
    ch.hd = Math.min(ch.hd, ch.level);
    saveCh(); show(); return;
  }
  if (k === "int") {
    const c = calc();
    document.querySelectorAll('[data-out="mod"]').forEach(n => n.textContent = sgn(c.mod));
    document.querySelectorAll('[data-out="dc"]').forEach(n => n.textContent = c.dc);
    document.querySelectorAll('[data-out="atk"]').forEach(n => n.textContent = sgn(c.atk));
  }
  saveCh();
});
document.addEventListener("keydown", e => {
  if (e.target.matches("input, select")) return;
  if (e.key === "ArrowRight") flip.turn("next");
  if (e.key === "ArrowLeft") flip.turn("previous");
});

const native = !!window.NL_PORT && typeof Neutralino !== "undefined"; // false when opened in a plain browser

// Turn back to the front cover (turn.js animates the book shutting), fade, then quit.
function closeBook() {
  if (closing || !flip) return;
  closing = true;
  const quit = () => native ? Neutralino.app.exit() : location.reload(); // a browser tab can't quit, so reopen
  if (view()[0] === 0) return fadeOut(quit);
  flip.one("turned", () => fadeOut(quit));
  flip.turn("page", 1);
}
const fadeOut = then => { $("wrap").classList.add("closing"); setTimeout(then, 450); };

async function boot() {
  if (native) {
    Neutralino.init();
    Neutralino.window.setDraggableRegion("book", { exclude: ["flip"] }).catch(() => {});
  }
  if (!flip) { $("flip").innerHTML = `<p class="empty">The page-turning library didn't load.</p>`; return; }
  const load = async path => {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  };
  try {
    const cover = fetch("cover.svg").then(r => r.ok ? r.text() : "").catch(() => ""); // optional: falls back to a text title
    [SPELLS, WIZARD, COVER] = await Promise.all([load("data/spells.json"), load("data/wizard.json"), cover]);
  } catch (err) {
    // Browsers refuse fetch() for pages opened straight from disk (file://)
    $("flip").innerHTML = `<p class="empty">The spell data couldn't be loaded (${esc(err.message)}).<br><br>
      If you opened index.html straight from disk, serve the folder instead, e.g. <code>npx serve</code> or <code>python -m http.server</code>.</p>`;
    return;
  }
  SPELLS.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  // turn.js must start with its pages already inside #flip, or it never settles on page 1
  const box = $("flip");
  pages = buildPages(SPELLS.filter(matches));
  while (els.length - 1 < total()) box.appendChild(makePage());
  flip.turn({ width: box.clientWidth - box.clientWidth % 2, height: box.clientHeight, gradients: true, duration: 700, display: "double" });
  flip.bind("turning", (e, page, v) => { if (v[0] && v[1]) $("book").classList.remove("shut-front", "shut-back"); });
  flip.bind("turned", () => show());
  rebuild(false);

  // self-check: every spell gets one page, sections open on left pages, and the class table is complete
  const p2 = buildPages(SPELLS);
  console.assert(p2.filter(p => p.t === "spell").length === SPELLS.length, "spell page count");
  console.assert(p2.every((p, i) => p.t !== "sect" || i % 2 === 0), "sections open on left pages");
  console.assert(total() % 2 === 0 && els.length - 1 === total(), "book has an even page count with both covers");
  console.assert(new Set(SPELLS.map(s => s.name)).size === SPELLS.length, "duplicate spell names");
  console.assert(SPELLS.every(s => SCHOOLS.includes(s.school)), "unknown school in spells.json");
  console.assert(WIZARD.progression.length === 20 && WIZARD.progression.every((r, i) => r.level === i + 1), "wizard.json needs levels 1-20");
}
boot();
