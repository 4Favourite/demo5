/* ==========================================================
   MY BUILD ARCHIVE — scroll-driven freight experience
   Vanilla JS, no dependencies.
   Scenes (P = 0..1 across the pinned track):
     0.00 intro/hero  ·  0.07 reach stacker lifts container
     0.17 truck arrives, container lowered  ·  0.285 truck drives
     0.34 dark road + services  ·  0.455 reliability "doors"
     0.60 ocean / container ship  ·  0.82 clouds + plane  ·  1.0 tools
   ========================================================== */
(() => {
'use strict';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;
const NS = 'http://www.w3.org/2000/svg';
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = $('#stage'), track = $('#track');
const ground = $('#ground');

/* shared SVG filter for the ripple reflection */
document.body.insertAdjacentHTML('beforeend',
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ripple" x="-5%" y="-5%" width="110%" height="110%">
   <feTurbulence type="turbulence" baseFrequency="0.012 0.09" numOctaves="2" result="t"><animate attributeName="baseFrequency" dur="7s" values="0.012 0.09;0.018 0.13;0.012 0.09" repeatCount="indefinite"/></feTurbulence>
   <feDisplacementMap in="SourceGraphic" in2="t" scale="24"/></filter></svg>`);

/* ==========================================================
   1. GROUND SCENE — reach stacker, containers, truck
   ========================================================== */
function contBody(w, h, col, extra = '') {
  let r = '';
  for (let x = 12; x < w - 10; x += 10) r += `<rect x="${x}" y="9" width="3.4" height="${h - 18}" fill="rgba(0,0,0,.17)"/><rect x="${x + 3.4}" y="9" width="1.6" height="${h - 18}" fill="rgba(255,255,255,.2)"/>`;
  return `<rect width="${w}" height="${h}" rx="3" fill="${col}"/>${r}
    <rect width="${w}" height="7" fill="rgba(0,0,0,.26)"/><rect y="${h - 7}" width="${w}" height="7" fill="rgba(0,0,0,.34)"/>
    <rect width="10" height="${h}" fill="rgba(0,0,0,.22)"/><rect x="${w - 10}" width="10" height="${h}" fill="rgba(0,0,0,.22)"/>${extra}`;
}
function wheel(cx, cy, r, cls = '') {
  let sp = '';
  for (let i = 0; i < 5; i++) sp += `<rect x="-2.5" y="${-r * .5}" width="5" height="${r * .5}" fill="#59636a" transform="rotate(${i * 72})"/>`;
  return `<g transform="translate(${cx} ${cy})"><circle r="${r}" fill="#15171a"/><circle r="${r * .82}" fill="#23272b"/><circle r="${r * .55}" fill="#a3acb1"/><g class="sp ${cls}">${sp}</g><circle r="${r * .14}" fill="#2b3237"/></g>`;
}
const GREY = '#bfc2ba', BLUE = '#2347b8', RED = '#e0442a';
const cargoLabel = `<text x="150" y="53" text-anchor="middle" font-family="Archivo,Arial Black,sans-serif" font-weight="900" font-size="25" fill="#16181a" textLength="262" lengthAdjust="spacingAndGlyphs">MY BUILD ARCHIVE</text>
  <rect x="26" y="20" width="26" height="4" rx="2" fill="#ff5a1f"/><text x="274" y="26" text-anchor="end" font-family="JetBrains Mono,monospace" font-size="9" fill="#16181a" opacity=".6">MBAU 482016 · 4</text>`;

ground.innerHTML = `
<defs>
  <linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="#fff3c4" stop-opacity=".75"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></linearGradient>
  <linearGradient id="cabg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a737c"/><stop offset="1" stop-color="#3d444b"/></linearGradient>
  <linearGradient id="tealg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2cc0e6"/><stop offset="1" stop-color="#1089a8"/></linearGradient>
</defs>
<rect id="band" x="-8000" y="1500" width="26000" height="6000" fill="#0b0c0d"/>
<rect x="-8000" y="600" width="26000" height="3" fill="rgba(0,0,0,.22)"/>
<g id="dashes" fill="rgba(255,255,255,.3)"></g>
<g id="streaks" fill="rgba(255,255,255,.35)"></g>

<!-- container stack -->
<g id="stack">
  <ellipse cx="860" cy="602" rx="470" ry="8" fill="rgba(0,0,0,.14)"/>
  <g transform="translate(560 520)">${contBody(300, 80, BLUE, `<text x="150" y="50" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="15" fill="#fff" opacity=".8" letter-spacing="3">MBAU 774210</text><rect x="26" y="18" width="40" height="5" rx="2" fill="#ff5a1f"/>`)}</g>
  <g transform="translate(870 520)">${contBody(300, 80, RED, `<text x="150" y="50" text-anchor="middle" font-family="JetBrains Mono,monospace" font-size="15" fill="#fff" opacity=".85" letter-spacing="3">MBAU 905533</text>`)}</g>
</g>

<!-- reach stacker -->
<g id="stacker">
  <ellipse cx="260" cy="602" rx="190" ry="8" fill="rgba(0,0,0,.18)"/>
  <rect x="124" y="498" width="260" height="50" rx="9" fill="url(#tealg)"/>
  <rect x="318" y="466" width="70" height="44" rx="6" fill="#0f7b99"/>
  <path d="M132 500V452Q132 438 146 438H206Q218 438 222 450L238 500Z" fill="url(#tealg)"/>
  <path d="M144 450H207L222 490H144Z" fill="#0d2a35" opacity=".88"/>
  <path d="M148 454H178L172 486H148Z" fill="rgba(255,255,255,.12)"/>
  <rect x="236" y="520" width="70" height="10" rx="3" fill="#0f6f8a"/>
  <text x="252" y="528" font-family="Archivo,sans-serif" font-weight="900" font-size="9" fill="#e8fbff" letter-spacing="1.5">MBA</text>
  <circle cx="350" cy="470" r="13" fill="#0b5a72"/>
  ${wheel(180, 564, 38)}${wheel(335, 564, 38)}
  <line id="cyl" x1="296" y1="498" x2="500" y2="400" stroke="#9ba5ab" stroke-width="9" stroke-linecap="round"/>
  <line id="cyl2" x1="296" y1="498" x2="400" y2="450" stroke="#dfe5e8" stroke-width="5" stroke-linecap="round"/>
  <g id="boom"><rect id="boomA" x="-24" y="-13" width="400" height="26" rx="6" fill="url(#tealg)"/><rect id="boomB" x="200" y="-9" width="400" height="18" rx="5" fill="#0b6985"/><rect id="boomC" x="0" y="-13" width="40" height="26" fill="#0d7592"/><circle id="boomTip" cx="600" cy="0" r="9" fill="#cfd8dc"/></g>
  <circle cx="350" cy="470" r="7" fill="#cfd8dc"/>
</g>

<!-- spreader (follows boom tip) -->
<g id="spread">
  <line id="cab1" stroke="#222" stroke-width="2.4"/><line id="cab2" stroke="#222" stroke-width="2.4"/>
  <circle r="8" fill="#cfd8dc"/>
  <rect id="sfr" x="-150" y="28" width="300" height="9" rx="2" fill="#2b2f33"/>
  <rect x="-150" y="24" width="14" height="14" fill="#ffb300"/><rect x="136" y="24" width="14" height="14" fill="#ffb300"/>
</g>

<!-- the cargo container (grey, branded) -->
<g id="cargo" transform="translate(560 440)">${contBody(300, 80, GREY, cargoLabel)}</g>

<!-- truck -->
<g id="truckWrap" transform="translate(-900 655)"><g id="truck" class="truck">
  <rect x="0" y="-8" width="520" height="8" rx="4" fill="rgba(0,0,0,.0)"/>
  <ellipse cx="250" cy="0" rx="270" ry="8" fill="rgba(0,0,0,.35)"/>
  <!-- trailer -->
  <rect x="-4" y="-68" width="340" height="11" rx="3" fill="#2d3135"/>
  <rect x="18" y="-58" width="270" height="9" fill="#1c1f22"/>
  <rect x="-8" y="-64" width="9" height="24" rx="2" fill="#4b5157"/>
  <rect x="238" y="-52" width="7" height="30" fill="#2f3438"/>
  <rect x="40" y="-50" width="230" height="5" fill="#ff5a1f" opacity=".9"/>
  ${wheel(62, -26, 26, 'tw')}${wheel(112, -26, 26, 'tw')}${wheel(162, -26, 26, 'tw')}
  <!-- tractor -->
  <rect x="300" y="-72" width="70" height="10" rx="3" fill="#3a4046"/>
  <rect x="340" y="-62" width="150" height="15" fill="#1d2023"/>
  <rect x="372" y="-58" width="50" height="22" rx="10" fill="#a3aab0"/>
  <rect x="392" y="-212" width="7" height="68" rx="3" fill="#a9b0b5"/><rect x="404" y="-206" width="6" height="62" rx="3" fill="#8b9399"/>
  <path d="M388 -62V-170Q388 -186 404 -186H450Q464 -186 471 -174L500 -128Q505 -118 505 -106V-62Z" fill="url(#cabg)" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>
  <path d="M402 -170H449L489 -126H402Z" fill="#0d1a22"/>
  <path d="M408 -164H436L416 -132H408Z" fill="rgba(255,255,255,.14)"/>
  <rect x="398" y="-120" width="62" height="3" fill="rgba(0,0,0,.35)"/>
  <rect x="404" y="-112" width="30" height="10" rx="2" fill="rgba(255,255,255,.08)"/>
  <text x="440" y="-84" font-family="Archivo,sans-serif" font-weight="900" font-size="11" fill="#ff7a45" letter-spacing="1.5" text-anchor="middle">MBA</text>
  <rect x="494" y="-102" width="13" height="40" fill="#15171a"/>
  <rect x="496" y="-96" width="11" height="9" rx="2" fill="#fff3c4"/>
  <rect x="496" y="-80" width="11" height="3" fill="#ff5a1f"/>
  <rect x="486" y="-64" width="24" height="6" rx="3" fill="#8e969b"/>
  <rect x="382" y="-142" width="9" height="22" rx="3" fill="#2b3035"/>
  ${wheel(372, -27, 27, 'tw')}${wheel(424, -27, 27, 'tw')}${wheel(478, -27, 27, 'tw')}
  <polygon id="beamPoly" points="506,-90 1250,-230 1250,40 506,-70" fill="url(#beam)" opacity="0"/>
</g></g>
`;

/* dashes + speed streaks */
(() => {
  let d = ''; for (let x = -2000; x < 12000; x += 150) d += `<rect x="${x}" y="738" width="76" height="6" rx="3"/>`;
  $('#dashes').innerHTML = d + `<rect x="-8000" y="790" width="26000" height="3" fill="rgba(255,255,255,.18)"/>`;
  let s = ''; for (let i = 0; i < 12; i++) s += `<rect data-i="${i}" height="2.5" rx="1.2" width="${160 + (i * 53) % 280}" y="${560 + (i * 41) % 230}"/>`;
  $('#streaks').innerHTML = s;
})();

const el = {
  band: $('#band'), boom: $('#boom'), boomA: $('#boomA'), boomB: $('#boomB'), boomC: $('#boomC'), boomTip: $('#boomTip'),
  cyl: $('#cyl'), cyl2: $('#cyl2'), spread: $('#spread'), cab1: $('#cab1'), cab2: $('#cab2'),
  cargo: $('#cargo'), truckWrap: $('#truckWrap'), truck: $('#truck'), beam: $('#beamPoly'),
  stack: $('#stack'), stacker: $('#stacker'), dashes: $('#dashes'), streaks: $$('#streaks rect'),
  tw: $$('#truck .tw')
};
const PIV = { x: 350, y: 470 };

/* ==========================================================
   2. SHIP, PLANE, CLOUDS (generated art)
   ========================================================== */
function buildShip(svg, detail = true) {
  const r = rng(11), pal = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#ec407a', '#f4f4f4', '#fb8c00', '#8e24aa', '#00acc1', '#e53935', '#2740ff', '#f4f4f4', '#ff7043'];
  let h = `<path d="M70 0C104 30 130 110 132 210L132 690Q132 748 112 756H28Q8 748 8 690L8 210C10 110 36 30 70 0Z" fill="#17384a"/>
  <path d="M70 6C100 34 126 112 128 212L128 690Q128 744 110 752H30Q12 744 12 690L12 212C14 112 40 34 70 6Z" fill="#e53935" opacity=".9"/>
  <path d="M70 14C98 42 122 116 124 212L124 690Q124 738 108 746H32Q16 738 16 690L16 212C18 116 42 42 70 14Z" fill="#285468"/>`;
  const bay = (y0, cols, rows, x0) => {
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const col = pal[Math.floor(r() * pal.length)], x = x0 + c * 19.5, y = y0 + rr * 12;
      h += `<rect x="${x}" y="${y}" width="18" height="11" fill="${col}"/><rect x="${x}" y="${y}" width="18" height="2" fill="rgba(0,0,0,.3)"/>` +
        (detail ? `<rect x="${x + 2}" y="${y + 3.5}" width="14" height="0.9" fill="rgba(0,0,0,.18)"/><rect x="${x + 2}" y="${y + 6.3}" width="14" height="0.9" fill="rgba(0,0,0,.18)"/>` : '');
    }
  };
  bay(146, 3, 4, 41.5);
  for (let b = 0; b < 5; b++) { const y0 = 206 + b * 96; h += `<rect x="14" y="${y0 - 6}" width="112" height="3" fill="#0e2230"/><rect x="14" y="${y0 - 6}" width="4" height="3" fill="#ff5a1f"/><rect x="122" y="${y0 - 6}" width="4" height="3" fill="#ff5a1f"/>`; bay(y0, 5, 7, 22); }
  h += `<rect x="38" y="684" width="64" height="54" rx="3" fill="#ececec"/><rect x="38" y="684" width="64" height="8" fill="#e53935"/>
  <rect x="42" y="696" width="56" height="5" fill="#243245"/><rect x="42" y="706" width="56" height="5" fill="#243245"/>
  <rect x="58" y="720" width="24" height="18" fill="#e53935"/><rect x="58" y="726" width="24" height="3" fill="#f4f4f4"/>
  <text x="70" y="171" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="900" font-size="0" fill="#fff"></text>`;
  svg.innerHTML = h;
}
buildShip($('#ship'));
buildShip($('#tinyShip svg'), false);

function buildPlane(svg) {
  svg.innerHTML = `<defs>
   <linearGradient id="fus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef1f5"/><stop offset="1" stop-color="#c8d0da"/></linearGradient>
   <linearGradient id="wng" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6eaf0"/><stop offset="1" stop-color="#fbfcfe"/></linearGradient></defs>
  <g>
   <path d="M520 242L318 12L384 10L662 230Z" fill="url(#wng)" stroke="#c4ccd6" stroke-width="2"/>
   <path d="M520 278L318 508L384 510L662 290Z" fill="url(#wng)" stroke="#c4ccd6" stroke-width="2"/>
   <path d="M118 250L34 176L76 172L168 240Z" fill="url(#wng)" stroke="#c4ccd6" stroke-width="2"/>
   <path d="M118 270L34 344L76 348L168 280Z" fill="url(#wng)" stroke="#c4ccd6" stroke-width="2"/>
   <g fill="#aeb7c2" stroke="#7d8793" stroke-width="2"><rect x="500" y="150" width="86" height="26" rx="13" transform="rotate(-48 543 163)"/><rect x="430" y="82" width="86" height="26" rx="13" transform="rotate(-48 473 95)"/><rect x="500" y="344" width="86" height="26" rx="13" transform="rotate(48 543 357)"/><rect x="430" y="412" width="86" height="26" rx="13" transform="rotate(48 473 425)"/></g>
   <path d="M44 246C300 232 640 228 786 240C852 246 884 255 888 260C884 265 852 274 786 280C640 292 300 288 44 274Z" fill="url(#fus)" stroke="#c4ccd6" stroke-width="2"/>
   <path d="M60 262H800" stroke="#ff5a1f" stroke-width="6" opacity=".9"/>
   <text x="300" y="256" font-family="Archivo,sans-serif" font-weight="900" font-size="17" letter-spacing="5" fill="#243245">MY BUILD ARCHIVE · AIR CARGO</text>
   <path d="M796 248Q810 260 796 272" fill="none" stroke="#10161d" stroke-width="5" stroke-linecap="round"/>
   <path d="M806 252Q816 260 806 268" fill="none" stroke="#10161d" stroke-width="3" stroke-linecap="round"/>
  </g>`;
}
buildPlane($('#plane'));

function scatterClouds(layer, n, minS, maxS, seed, avoid) {
  const r = rng(seed); let h = '';
  for (let i = 0; i < n; i++) {
    let x, y, tries = 0;
    do { x = r() * 100; y = r() * 100; tries++; } while (avoid && x > avoid[0] && x < avoid[1] && y > avoid[2] && y < avoid[3] && tries < 20);
    const s = lerp(minS, maxS, r());
    h += `<div class="c" style="left:${x}%;top:${y}%;width:${s}px;height:${s * (.45 + r() * .3)}px;transform:translate(-50%,-50%)"></div>`;
  }
  layer.innerHTML = h;
}
scatterClouds($('#cl1'), 22, 380, 800, 3);
scatterClouds($('#cl2'), 16, 360, 760, 8, [58, 84, 42, 80]);
scatterClouds($('#cl3'), 8, 520, 980, 21, [0, 0, 0, 0]);

/* water texture */
(() => {
  const tile = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'><filter id='f' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='0.007 0.024' numOctaves='3' seed='6' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.9 -0.82'/></filter><rect width='100%' height='100%' filter='url(%23f)'/></svg>`;
  const u = `url("data:image/svg+xml;utf8,${tile.replace(/#/g, '%23').replace(/"/g, "'")}")`;
  const w2 = $('.w2'); w2.style.backgroundImage = u; w2.style.backgroundSize = '640px 640px'; w2.style.opacity = '.8';
})();

/* ==========================================================
   3. SCROLL ENGINE
   ========================================================== */
const heroEl = $('#hero'), introSky = $('#introSky'), services = $('#services'), svcs = $$('.svc'), spot = $('#spot');
const doors = $('#doors'), panelL = $('#panelL'), panelR = $('#panelR'), gap = $('#gap'), swoosh = $('#swoosh');
const ocean = $('#ocean'), shipWrap = $('#shipWrap'), oceanCopy = $('#oceanCopy'), oceanTags = $$('.tag'), oceanLabel = $('#oceanLabel');
const clouds = $('#clouds'), plane = $('#plane'), tinyShip = $('#tinyShip'), skyCopy = $('#skyCopy');
const cl1 = $('#cl1'), cl2 = $('#cl2'), cl3 = $('#cl3');
const nav = $('.nav'), railEl = $('#rail'), cue = $('#cue'), progBar = $('#progBar');
const statEls = $$('[data-count]');
const miles = $$('.miles li');

const state = { cur: 0, prev: 0, vel: 0, P: 0, night: false, rain: false, sound: false, tour: false, honks: 0, lastDrive: 0 };
let maxScroll = 1, VW = innerWidth, VH = innerHeight;
function measure() { VW = innerWidth; VH = innerHeight; maxScroll = Math.max(1, track.offsetHeight - VH); }
addEventListener('resize', measure); measure();

function setCam(cx, lift = 0) {
  const r = VW / VH, Hv = Math.max(760, 950 / r), W = Hv * r, y0 = 655 - (.82 - lift) * Hv;
  ground.setAttribute('viewBox', `${cx - W / 2} ${y0} ${W} ${Hv}`);
  return { W, Hv, y0 };
}
const mouse = { x: .5, y: .5 };
addEventListener('pointermove', e => {
  mouse.x = e.clientX / VW; mouse.y = e.clientY / VH;
  spot.style.setProperty('--mx', e.clientX + 'px'); spot.style.setProperty('--my', e.clientY + 'px');
}, { passive: true });

let statsDone = false;
function runStats() {
  if (statsDone) return; statsDone = true;
  statEls.forEach(e => {
    const to = +e.dataset.count, dec = +e.dataset.dec, t0 = performance.now();
    (function step(t) { const k = clamp((t - t0) / 1400); e.textContent = (to * easeOut(k)).toFixed(dec); if (k < 1) requestAnimationFrame(step); })(t0);
  });
}

function render(P, dt) {
  state.P = P;
  const velAbs = Math.abs(state.cur - state.prev);
  state.vel = lerp(state.vel, velAbs, .15);

  /* --- intro / hero --- */
  introSky.style.opacity = 1 - seg(P, .0, .045);
  const hOut = seg(P, .05, .11);
  heroEl.style.opacity = 1 - seg(P, .065, .11);
  heroEl.style.transform = `translateY(${-hOut * 28}vh)`;
  heroEl.style.visibility = P > .12 ? 'hidden' : 'visible';
  cue.style.opacity = 1 - seg(P, 0, .03);

  /* --- ground scene --- */
  const gOn = P > .04 && P < .535;
  ground.style.visibility = gOn ? 'visible' : 'hidden';
  if (gOn) {
    ground.style.opacity = seg(P, .045, .085) * (1 - seg(P, .515, .53));
    const t1 = ease(seg(P, .07, .11)), t2 = ease(seg(P, .11, .13)), t3 = ease(seg(P, .13, .17)),
      t4 = ease(seg(P, .17, .22)), t5 = ease(seg(P, .22, .26)), t6 = ease(seg(P, .26, .285));
    let tx = lerp(600, 710, t1), ty = lerp(330, 380, t1);
    ty = lerp(ty, 404, t2); ty = lerp(ty, 190, t3);
    tx = lerp(tx, 1000, t4); ty -= 46 * Math.sin(Math.PI * t4);
    ty = lerp(ty, 477, t5); ty = lerp(ty, 205, t6);
    // boom
    const dx = tx - PIV.x, dy = PIV.y - ty, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    el.boom.setAttribute('transform', `translate(${PIV.x} ${PIV.y}) rotate(${-ang})`);
    el.boomA.setAttribute('width', Math.min(L + 24, 360));
    el.boomB.setAttribute('x', 160); el.boomB.setAttribute('width', Math.max(10, L - 150));
    el.boomTip.setAttribute('cx', L);
    const ux = dx / L, uy = -dy / L; // unit vector in world
    el.cyl.setAttribute('x2', PIV.x + ux * L * .32 - uy * 0); el.cyl.setAttribute('y2', PIV.y + uy * L * .32 + 14);
    el.cyl2.setAttribute('x2', PIV.x + ux * L * .2); el.cyl2.setAttribute('y2', PIV.y + uy * L * .2 + 12);
    // spreader
    el.spread.setAttribute('transform', `translate(${tx} ${ty})`);
    el.cab1.setAttribute('x1', 0); el.cab1.setAttribute('y1', 0); el.cab1.setAttribute('x2', -138); el.cab1.setAttribute('y2', 28);
    el.cab2.setAttribute('x1', 0); el.cab2.setAttribute('y1', 0); el.cab2.setAttribute('x2', 138); el.cab2.setAttribute('y2', 28);
    // truck
    const arrive = lerp(-900, 835, easeOut(seg(P, .17, .24)));
    const drive = 4200 * ease(seg(P, .285, .5));
    const rearX = arrive + drive;
    const bounce = P > .285 ? Math.sin(performance.now() / 55) * Math.min(1.4, state.vel * .3 + .2) : 0;
    el.truckWrap.setAttribute('transform', `translate(${rearX} ${655 + bounce})`);
    const wdeg = (rearX / 26) * 57.3;
    el.tw.forEach(w => w.setAttribute('transform', `rotate(${wdeg})`));
    // cargo
    if (P >= .26) el.cargo.setAttribute('transform', `translate(${rearX + 15} ${513 + bounce})`);
    else if (t2 >= 1) el.cargo.setAttribute('transform', `translate(${tx - 150} ${ty + 36})`);
    else el.cargo.setAttribute('transform', 'translate(560 440)');
    // camera
    const camX = lerp(700, 1000, ease(seg(P, .17, .23))) + drive + 85 * ease(seg(P, .285, .33)) + (mouse.x - .5) * 36;
    const cam = setCam(camX, .36 * ease(seg(P, .33, .40)) * (1 - ease(seg(P, .46, .5))));
    // dark flood
    const flood = ease(seg(P, .31, .385));
    el.band.setAttribute('y', lerp(lerp(1500, 625, ease(seg(P, .165, .215))), cam.y0 - 80, flood));
    // dashes parallax: fine as world objects; streaks
    const sv = clamp(state.vel / 40) * (P > .285 ? 1 : 0) + (P > .3 && P < .48 ? .25 : 0);
    el.streaks.forEach(s => { const i = +s.dataset.i, wrap = cam.W + 700; const x = ((i * 257 - drive * 2.2) % wrap + wrap) % wrap; s.setAttribute('x', camX - cam.W / 2 - 350 + x); s.style.opacity = clamp(sv) * (.25 + (i % 4) * .15); });
    // headlight
    const dark = flood;
    el.beam.setAttribute('opacity', Math.max(state.night ? .95 : 0, dark * .55));
  }

  /* --- services --- */
  const sv1 = seg(P, .375, .415), sv2 = 1 - seg(P, .455, .485);
  services.style.opacity = sv1 * sv2;
  services.style.visibility = (sv1 * sv2) > 0 ? 'visible' : 'hidden';
  svcs.forEach((s, i) => { const k = ease(seg(P, .385 + i * .012, .42 + i * .012)); s.style.opacity = k; s.style.transform = `translateY(${(1 - k) * 36}px)`; });
  spot.style.opacity = sv1 * sv2;

  /* --- doors (reliability) --- */
  const rise = ease(seg(P, .455, .505)), open = ease(seg(P, .565, .645));
  const dOn = P > .45 && P < .66;
  doors.style.visibility = dOn ? 'visible' : 'hidden';
  doors.style.opacity = dOn ? 1 : 0;
  if (dOn) {
    const ty = (1 - rise) * 105;
    panelL.style.transform = `translate(${-open * 102}%,${ty}%)`;
    panelR.style.transform = `translate(${open * 102}%,${ty}%)`;
    gap.style.transform = `translateY(${ty}%) scaleX(${1 - open * .6})`;
    gap.style.opacity = 1 - open;
    swoosh.style.transform = `translateX(${-seg(P, .50, .56) * 115}%)`;
    swoosh.style.opacity = rise > 0 ? 1 - seg(P, .52, .56) : 0;
    if (P > .51) runStats();
    const mi = P > .56 ? 4 : P > .535 ? 3 : 2;
    miles.forEach((m, i) => m.classList.toggle('on', i <= mi - 0));
  }

  /* --- ocean --- */
  const oOn = P > .54 && P < .9;
  ocean.style.visibility = oOn ? 'visible' : 'hidden';
  if (oOn) {
    ocean.style.opacity = (seg(P, .54, .56)) * (1 - seg(P, .845, .895));
    const z = ease(seg(P, .585, .775));
    const sc = lerp(3.6, .66, z), sy = lerp(-260, 10, z) * (VH / 900);
    const base = Math.min(VH / 900, VW / 900 + .35);
    shipWrap.style.transform = `translate(${(mouse.x - .5) * -14}px,${sy}px) scale(${sc * Math.max(.7, base)})`;
    const wy = P * 7000;
    $('.w1').style.backgroundPosition = `0 ${wy * .6}px`; $('.w2').style.backgroundPosition = `${wy * .1}px ${wy}px`;
    const tOn = seg(P, .735, .775) * (1 - seg(P, .825, .85));
    oceanCopy.style.opacity = tOn; oceanCopy.style.transform = `translateY(${-62 + (1 - tOn) * 6}%)`;
    oceanTags.forEach((t, i) => { const k = seg(P, .765 + i * .012, .795 + i * .012) * (1 - seg(P, .83, .855)); t.style.opacity = k; });
    oceanLabel.style.opacity = seg(P, .62, .66) * (1 - seg(P, .8, .83));
    state.oceanSc = sc * Math.max(.7, base); state.oceanSy = sy;
  }

  /* --- clouds + plane --- */
  const cOn = P > .8;
  clouds.style.visibility = cOn ? 'visible' : 'hidden';
  if (cOn) {
    clouds.style.opacity = seg(P, .81, .86) * (1 - seg(P, .965, .995));
    const u = ease(seg(P, .825, .955));
    cl1.style.transform = `translateX(${-u * 14}%) scale(1.05)`;
    cl2.style.transform = `translateX(${-u * 34}%)`;
    cl3.style.transform = `translateX(${-u * 70}%) translateY(${u * 8}%)`;
    const pw = plane.getBoundingClientRect().width || VW * .7;
    plane.style.transform = `translate(${lerp(-pw * 1.05, VW * 1.05, u)}px,${lerp(VH * .12, VH * .34, u)}px) rotate(${lerp(-4, 9, u)}deg) scale(${lerp(1.25, .62, u)})`;
    tinyShip.style.left = '70%'; tinyShip.style.top = '56%';
    tinyShip.style.transform = `translateY(${-u * 40}px) rotate(8deg) scale(${lerp(1, 1.25, u)})`;
    const sk = seg(P, .885, .915) * (1 - seg(P, .95, .97));
    skyCopy.style.opacity = sk; skyCopy.style.transform = `translateY(${(1 - sk) * 24}px)`;
  }

  /* --- chrome --- */
  progBar.style.width = (state.cur / (document.documentElement.scrollHeight - VH) * 100) + '%';
  const darkUI = !state.night && ((P > .33 && P < .455) || (P > .6 && P < .85));
  nav.classList.toggle('dark', darkUI); railEl.classList.toggle('dark', darkUI);
  updateRail(P);
  updateAudio(P);
}

/* rail */
const CHAPTERS = [['Intro', 0], ['Yard', .13], ['Truck', .25], ['Services', .42], ['Reliability', .53], ['Sea', .72], ['Air', .9]];
railEl.innerHTML = CHAPTERS.map(([n, p], i) => `<a href="#" data-goto="${p}" data-i="${i}"><i></i><span>${n}</span></a>`).join('');
let railIdx = -1;
function updateRail(P) {
  let idx = 0; CHAPTERS.forEach(([, p], i) => { if (P >= p - .03) idx = i; });
  if (state.cur > maxScroll + 40) idx = -1;
  if (idx !== railIdx) { railIdx = idx; $$('a', railEl).forEach((a, i) => a.classList.toggle('on', i === idx)); }
}
function goto(p, smooth = true) {
  stopTour();
  const y = p * maxScroll;
  smooth ? smoothTo(y, Math.min(2600, 500 + Math.abs(y - scrollY) * .35)) : scrollTo(0, y);
}
document.addEventListener('click', e => {
  const a = e.target.closest('[data-goto]'); if (!a) return;
  e.preventDefault(); goto(parseFloat(a.dataset.goto));
});
let anim = null;
function smoothTo(y, ms) {
  const y0 = scrollY, t0 = performance.now(); anim && cancelAnimationFrame(anim.id);
  const run = t => { const k = clamp((t - t0) / ms); scrollTo(0, lerp(y0, y, ease(k))); if (k < 1) anim.id = requestAnimationFrame(run); else anim = null; };
  anim = { id: requestAnimationFrame(run) };
}
$$('a[href="#tools"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); stopTour(); smoothTo($('#tools').offsetTop - 10, 1800); }));

/* main loop */
let lastT = performance.now();
function loop(t) {
  const dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
  state.prev = state.cur;
  state.cur += (scrollY - state.cur) * (reduceMotion ? 1 : .11);
  if (Math.abs(scrollY - state.cur) < .15) state.cur = scrollY;
  render(clamp(state.cur / maxScroll), dt);
  fxFrame(dt);
  requestAnimationFrame(loop);
}

/* ==========================================================
   4. FX CANVAS: rain, foam, confetti
   ========================================================== */
const fx = $('#fx'), fctx = fx.getContext('2d'), foam = $('#foam'), gctx = foam.getContext('2d');
function sizeCanvas() { [fx, foam].forEach(c => { c.width = innerWidth; c.height = innerHeight; }); }
addEventListener('resize', sizeCanvas); sizeCanvas();
const rain = Array.from({ length: 170 }, () => ({ x: Math.random(), y: Math.random(), l: 10 + Math.random() * 18, s: .9 + Math.random() * .9 }));
const foamP = [], confetti = [];
function fxFrame(dt) {
  fctx.clearRect(0, 0, fx.width, fx.height);
  if (state.rain) {
    fctx.strokeStyle = 'rgba(190,210,235,.45)'; fctx.lineWidth = 1.2; fctx.beginPath();
    rain.forEach(d => { const x = d.x * fx.width, y = d.y * fx.height; fctx.moveTo(x, y); fctx.lineTo(x - d.l * .25, y + d.l); d.y += dt * d.s * 1.4; d.x -= dt * .06; if (d.y > 1) { d.y = -.05; d.x = Math.random() * 1.1; } });
    fctx.stroke();
    fctx.fillStyle = 'rgba(10,20,40,.10)'; fctx.fillRect(0, 0, fx.width, fx.height);
  }
  confetti.forEach((c, i) => {
    c.vy += 900 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.r += c.vr * dt; c.life -= dt;
    fctx.save(); fctx.translate(c.x, c.y); fctx.rotate(c.r); fctx.fillStyle = c.col; fctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); fctx.fillStyle = 'rgba(0,0,0,.25)'; fctx.fillRect(-c.w / 2, -c.h / 2, c.w, 2); fctx.restore();
    if (c.life <= 0 || c.y > fx.height + 40) confetti.splice(i, 1);
  });
  // foam around the ship
  gctx.clearRect(0, 0, foam.width, foam.height);
  if (ocean.style.visibility === 'visible' && +ocean.style.opacity > .05) {
    const s = state.oceanSc || 1, cx = foam.width / 2 + (mouse.x - .5) * -14, cy = foam.height / 2 + (state.oceanSy || 0);
    const n = Math.round(6 + 10 * Math.min(1, s)), hw = 60 * s, top = -372 * s, bot = 372 * s;
    for (let i = 0; i < n; i++) {
      const side = Math.random() < .5 ? -1 : 1, yy = Math.random();
      const y = lerp(top + 40 * s, bot, yy);
      foamP.push({ x: cx + side * (hw * (.96 + Math.random() * .1)), y: cy + y, vx: side * (8 + Math.random() * 26) * s, vy: (70 + Math.random() * 120) * Math.min(1.4, s + .2), r: (2 + Math.random() * 5) * Math.min(s, 1.1), life: .9 + Math.random() * .9, max: 1.8 });
    }
    for (let i = 0; i < 3; i++) { const a = (Math.random() - .5) * 2; foamP.push({ x: cx + a * hw * .6, y: cy + top + 28 * s, vx: a * 70 * s, vy: 140 * s, r: (3 + Math.random() * 5) * Math.min(s, 1.1), life: 1, max: 1.6 }); }
    // stern wake
    for (let i = 0; i < 6; i++) { const side = Math.random() < .5 ? -1 : 1; foamP.push({ x: cx + side * hw * .5, y: cy + bot, vx: side * (30 + Math.random() * 60) * s, vy: (120 + Math.random() * 90) * Math.min(1.2, s + .2), r: (3 + Math.random() * 6) * Math.min(s, 1.1), life: 1.4, max: 2 }); }
    for (let i = foamP.length - 1; i >= 0; i--) {
      const p = foamP[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985;
      if (p.life <= 0) { foamP.splice(i, 1); continue; }
      gctx.fillStyle = `rgba(255,255,255,${clamp(p.life / p.max) * .5})`; gctx.beginPath(); gctx.arc(p.x, p.y, p.r * (1 + (1 - p.life / p.max) * .6), 0, 6.283); gctx.fill();
    }
    if (foamP.length > 1800) foamP.splice(0, foamP.length - 1800);
  } else foamP.length = 0;
}
function burst(x, y, n = 90) {
  const cols = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#ec407a', '#f4f4f4', '#fb8c00', '#ff5a1f'];
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = 250 + Math.random() * 600; confetti.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 450, r: Math.random() * 6, vr: (Math.random() - .5) * 14, w: 14 + Math.random() * 14, h: 7 + Math.random() * 6, col: cols[i % cols.length], life: 2.6 }); }
}

/* ==========================================================
   5. AUDIO (WebAudio — synthesized, no files)
   ========================================================== */
let AC = null, eng = null, sea = null, wind = null;
function noiseBuf(ctx) { const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function initAudio() {
  if (AC) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
  AC = new C(); const nb = noiseBuf(AC), mk = (type, freq, q) => { const s = AC.createBufferSource(); s.buffer = nb; s.loop = true; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q; const g = AC.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(AC.destination); s.start(); return { g, f }; };
  sea = mk('lowpass', 500); wind = mk('highpass', 1200, .5);
  const o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g = AC.createGain();
  o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = 48; o2.frequency.value = 24; lp.type = 'lowpass'; lp.frequency.value = 260; g.gain.value = 0;
  o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(AC.destination); o.start(); o2.start(); eng = { o, o2, g, lp };
}
function updateAudio(P) {
  if (!AC || !state.sound) return;
  const t = AC.currentTime, truck = (P > .17 && P < .49) ? 1 : 0.0, drive = seg(P, .285, .35) * (1 - seg(P, .46, .5));
  eng.g.gain.setTargetAtTime(truck * (.05 + drive * .08) * (1 + clamp(state.vel / 30)), t, .1);
  eng.o.frequency.setTargetAtTime(44 + drive * 30 + clamp(state.vel / 30) * 24, t, .15);
  eng.lp.frequency.setTargetAtTime(220 + drive * 300, t, .15);
  sea.g.gain.setTargetAtTime(seg(P, .58, .64) * (1 - seg(P, .83, .88)) * .22, t, .3);
  wind.g.gain.setTargetAtTime(seg(P, .82, .87) * (1 - seg(P, .96, .99)) * .07, t, .3);
}
function honk() {
  if (!state.sound) setSound(true);
  if (AC) {
    const t = AC.currentTime, g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .03); g.gain.setTargetAtTime(0, t + .45, .06); g.connect(AC.destination);
    [311, 392, 466].forEach(f => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; o.connect(lp); lp.connect(g); o.start(t); o.stop(t + .9); });
  }
  const r = el.cargo.getBoundingClientRect(), b = $('#bubble');
  if (ground.style.visibility === 'visible' && r.width) {
    b.style.left = clamp(r.right + r.width * .22, 80, VW - 80) + 'px'; b.style.top = Math.max(70, r.top - r.height * .1) + 'px';
    b.textContent = ['BEEP BEEP!', 'HONK!', 'MOVING FREIGHT!', 'OWN THE OUTCOME!'][state.honks % 4];
    b.animate([{ opacity: 0, transform: 'translate(-50%,-80%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-110%) scale(1)', offset: .15 }, { opacity: 1, offset: .75 }, { opacity: 0, transform: 'translate(-50%,-130%) scale(1)' }], { duration: 1400, fill: 'forwards' });
    el.truck.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 420 });
  }
  if (++state.honks % 5 === 0) burst(VW / 2, VH / 2, 120);
}
$('#truck').addEventListener('click', honk);

/* ==========================================================
   6. HUD buttons, keys, tour
   ========================================================== */
function setPressed(id, on) { $(id).setAttribute('aria-pressed', on ? 'true' : 'false'); }
function setSound(on) { state.sound = on; if (on) { initAudio(); AC && AC.resume(); } else if (AC) { eng.g.gain.value = sea.g.gain.value = wind.g.gain.value = 0; } setPressed('#bSound', on); }
function setNight(on) { state.night = on; document.documentElement.classList.toggle('night', on); setPressed('#bNight', on); }
function setRain(on) { state.rain = on; setPressed('#bRain', on); }
$('#bSound').onclick = () => setSound(!state.sound);
$('#bNight').onclick = () => setNight(!state.night);
$('#bRain').onclick = () => setRain(!state.rain);
$('#bTour').onclick = () => state.tour ? stopTour() : startTour();
$('#heroTour').onclick = e => { e.preventDefault(); startTour(); };
let tourRAF = 0;
function startTour() {
  if (state.tour) return; state.tour = true; setPressed('#bTour', true);
  let last = performance.now();
  const step = t => {
    if (!state.tour) return; const dt = (t - last) / 1000; last = t;
    const P = scrollY / maxScroll; // slow down for key beats
    let v = 1; if (P > .12 && P < .3) v = .8; if (P > .56 && P < .65) v = .8; if (P > .74 && P < .82) v = .7;
    scrollTo(0, scrollY + dt * VH * .55 * v);
    if (scrollY >= maxScroll - 2) { stopTour(); return; }
    tourRAF = requestAnimationFrame(step);
  };
  tourRAF = requestAnimationFrame(step);
}
function stopTour() { state.tour = false; cancelAnimationFrame(tourRAF); setPressed('#bTour', false); }
['wheel', 'touchstart'].forEach(ev => addEventListener(ev, () => { if (state.tour) stopTour(); anim && (cancelAnimationFrame(anim.id), anim = null); }, { passive: true }));
addEventListener('keydown', e => {
  if (/input|textarea/i.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === ' ' && !e.target.closest('button,a')) { e.preventDefault(); state.tour ? stopTour() : startTour(); }
  else if (k === 's') setSound(!state.sound);
  else if (k === 'n') setNight(!state.night);
  else if (k === 'r') setRain(!state.rain);
  else if (k === 'h') honk();
  else if (['arrowdown', 'arrowup', 'pagedown', 'pageup'].includes(k)) stopTour();
});
$('#ctaBtn').addEventListener('click', e => { const r = e.target.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 140);  });
/* fx canvas needs to be visible over page content for CTA confetti */
document.body.appendChild(fx);

/* ==========================================================
   7. TOOLS: quote + tracker
   ========================================================== */
(() => {
  const RATE = { road: .115, sea: .011, air: .88 }, CO2 = { road: .062, sea: .016, air: .602 }, SPEED = { road: 700, sea: 640, air: 8200 }, FIX = { road: 1, sea: 5, air: 1 };
  let mode = 'road', lastQ = { p: 0, e: 0, c: 0 };
  const fmt = n => n.toLocaleString('en-US'), $w = $('#wIn'), $d = $('#dIn'), $e = $('#expIn');
  const anim = (elm, from, to, f) => { const t0 = performance.now(); (function s(t) { const k = clamp((t - t0) / 450); elm.textContent = f(lerp(from, to, easeOut(k))); if (k < 1) requestAnimationFrame(s); })(t0); };
  function calc() {
    const kg = +$w.value, km = +$d.value, exp = $e.checked ? 1.35 : 1;
    $('#wOut').textContent = fmt(kg) + ' kg'; $('#dOut').textContent = fmt(km) + ' km';
    const t = kg / 1000, price = Math.max(120, t * km * RATE[mode] + 85) * exp, days = FIX[mode] + km / SPEED[mode] / (exp > 1 ? 1.4 : 1), co2 = t * km * CO2[mode];
    anim($('#qPrice'), lastQ.p, price, v => '$' + fmt(Math.round(v))); anim($('#qEta'), lastQ.e, days, v => (v < 1.5 ? '1 day' : Math.round(v) + ' days')); anim($('#qCo2'), lastQ.c, co2, v => fmt(Math.round(v)) + ' kg');
    lastQ = { p: price, e: days, c: co2 };
    const all = Object.keys(CO2).map(m => [m, t * km * CO2[m]]), mx = Math.max(...all.map(a => a[1]), 1);
    $('#co2bars').innerHTML = all.map(([m, v]) => `<div class="${m === mode ? 'cur' : ''}"><span>${m}</span><i style="width:${Math.max(2, v / mx * 100)}%"></i><em style="font-style:normal;text-align:right">${fmt(Math.round(v))} kg</em></div>`).join('');
  }
  $$('#modeSeg button').forEach(b => b.onclick = () => { mode = b.dataset.mode; $$('#modeSeg button').forEach(x => x.classList.toggle('on', x === b)); calc(); });
  [$w, $d, $e].forEach(i => i.addEventListener('input', calc)); calc();

  /* tracker */
  const ROUTES = [
    { pts: [[40, 200], [150, 120], [300, 150], [420, 70], [520, 60]], names: ['Phoenix, AZ', 'Long Beach, CA', 'Pacific crossing', 'Busan, KR', 'Shanghai, CN'], modes: ['road', 'sea', 'sea', 'sea'] },
    { pts: [[50, 80], [160, 150], [290, 110], [410, 190], [520, 150]], names: ['Rotterdam, NL', 'Frankfurt, DE', 'Istanbul, TR', 'Mumbai, IN', 'Dubai, AE'], modes: ['road', 'air', 'air', 'sea'] },
    { pts: [[40, 140], [130, 90], [250, 120], [380, 80], [520, 120]], names: ['Dallas, TX', 'Memphis, TN', 'Atlanta, GA', 'Charlotte, NC', 'New York, NY'], modes: ['road', 'road', 'road', 'road'] }
  ];
  const EVT = ['Booking confirmed', 'Picked up at origin', 'Customs cleared', 'Departed hub', 'In transit', 'Arrived destination hub', 'Delivered'];
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  function track(code) {
    const h = hash(code.toUpperCase()), R = ROUTES[h % ROUTES.length], prog = .25 + (h % 61) / 100, svg = $('#trkMap');
    const P = R.pts, d = `M${P[0]} ` + P.slice(1).map((p, i) => { const a = P[i]; return `C${a[0] + 50} ${a[1]} ${p[0] - 50} ${p[1]} ${p[0]} ${p[1]}`; }).join(' ');
    svg.innerHTML = `<defs><pattern id="dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.2" fill="currentColor" opacity=".13"/></pattern></defs><rect width="560" height="260" fill="url(#dots)"/>
      <path id="rt" d="${d}" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>
      <path id="rtd" d="${d}" fill="none" stroke="#ff5a1f" stroke-width="3.5" stroke-linecap="round"/>` +
      P.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${i / (P.length - 1) <= prog ? '#ff5a1f' : 'currentColor'}"/><text x="${p[0]}" y="${p[1] + (i % 2 ? -12 : 20)}" text-anchor="middle" font-size="10" font-family="JetBrains Mono,monospace" fill="currentColor" opacity=".7">${R.names[i]}</text>`).join('') +
      `<g id="veh"><circle r="14" fill="#ff5a1f" opacity=".25"><animate attributeName="r" values="8;18;8" dur="1.8s" repeatCount="indefinite"/></circle><circle r="7" fill="#ff5a1f" stroke="#fff" stroke-width="2"/></g>`;
    const path = $('#rt'), L = path.getTotalLength(), dp = $('#rtd'); dp.style.strokeDasharray = L; dp.style.strokeDashoffset = L; const veh = $('#veh');
    const t0 = performance.now(); (function s(t) { const k = easeOut(clamp((t - t0) / 1800)) * prog, pt = path.getPointAtLength(L * k); dp.style.strokeDashoffset = L * (1 - k); veh.setAttribute('transform', `translate(${pt.x} ${pt.y})`); if (clamp((t - t0) / 1800) < 1) requestAnimationFrame(s); })(t0);
    const n = Math.round(prog * (EVT.length - 1)) + 1, now = Date.now(), list = $('#trkList');
    list.innerHTML = EVT.map((e, i) => { const ts = new Date(now - (n - 1 - i) * 3600e3 * (5 + (h >> i) % 9)); return `<li class="${i < n ? 'on' : ''}"><time>${ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</time><b>${e}</b></li>`; }).join('');
  }
  $('#trkForm').addEventListener('submit', e => { e.preventDefault(); track($('#trkIn').value.trim() || 'MBA-2026-0042'); });
  track($('#trkIn').value);
})();

/* ==========================================================
   8. BOOT
   ========================================================== */
(function boot() {
  document.body.classList.add('lock');
  history.scrollRestoration = 'manual'; scrollTo(0, 0);
  let n = 0; const num = $('#loadNum'), bar = $('#loadBar'), ld = $('#loader');
  const fontsReady = (document.fonts && document.fonts.ready) ? Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1800))]) : Promise.resolve();
  let ready = false; fontsReady.then(() => ready = true);
  const iv = setInterval(() => {
    n = Math.min(100, n + (ready ? 6 : 2) + Math.random() * 3); if (!ready && n > 88) n = 88;
    num.textContent = Math.round(n); bar.style.width = n + '%';
    if (n >= 100) { clearInterval(iv); setTimeout(() => { ld.classList.add('done'); document.body.classList.remove('lock'); }, 250); }
  }, 40);
  measure(); requestAnimationFrame(loop);
  addEventListener('load', measure);
})();

/* expose for debugging / screenshots */
window.__mba = { goto, state, render };
})();
