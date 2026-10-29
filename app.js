/* ==========================================================
   MY BUILD ARCHIVE — scroll-driven freight experience (v2, real photos)
   Vanilla JS, no dependencies.
   Scenes (P = 0..1 across the pinned track):
     .00 hero · .07 reach stacker lifts the container · .15 truck arrives
     .225 container lowered onto the truck · .285 truck drives off, dark road wipes in
     .39 services · .445 truck crosses again, "doors" wipe in · .565 doors open
     .585 container ship zooms out · .80 truck crosses a third time, clouds wipe in
     .86 plane through clouds · 1.0 loop → fleet + tools
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
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = $('#stage'), track = $('#track');

/* shared SVG filter for the ripple reflection */
document.body.insertAdjacentHTML('beforeend',
  `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ripple" x="-5%" y="-5%" width="110%" height="110%">
   <feTurbulence type="turbulence" baseFrequency="0.012 0.09" numOctaves="2" result="t"><animate attributeName="baseFrequency" dur="7s" values="0.012 0.09;0.018 0.13;0.012 0.09" repeatCount="indefinite"/></feTurbulence>
   <feDisplacementMap in="SourceGraphic" in2="t" scale="24"/></filter></svg>`);

/* ==========================================================
   1. WORLD GEOMETRY (yard scene, design units)
   ========================================================== */
const S = .2555;                       // container / stacker photo scale
const TS = .3005;                      // truck photo scale (container on truck == held container size)
const STK = { px: 2292, py: 1493, cx: -2, cy: 858 };   // stacker pivot (rear tyre contact) + held-container slot, in stacker px
const TRK = { ground: 1027, cx: 40, cy: 48, W: 2400, H: 1032 };
const PHI_CARRY = 4, PHI_PLACE = 1.2;
const RX = (STK.cx - STK.px) * S, RY = (STK.cy - STK.py) * S;
const rad = d => d * Math.PI / 180;
// world position of the held container's top-left for stacker-left SX and boom angle phi (deg)
function heldTL(SX, phi) {
  const c = Math.cos(rad(phi)), s = Math.sin(rad(phi));
  return { x: SX + STK.px * S + RX * c - RY * s, y: RX * s + RY * c };
}
const PLACE_TOP = heldTL(0, PHI_PLACE);
const YT = PLACE_TOP.y + (TRK.ground - TRK.cy) * TS;   // truck wheel line (world y)
const TL_REST = 250;                                    // truck left x when loading
const SX_PLACE = TL_REST + TRK.cx * TS - PLACE_TOP.x;   // stacker x when container is on the deck
const SX_PICK = 1150;                                   // stacker x when it grips the grey box
const GROUND_TL = heldTL(SX_PICK, 0);

const el = {
  yard: $('#yard'), floor: $('#floor'), stacker: $('#stacker'), cGround: $('#cGround'), cBlue: $('#cBlue'), cRed: $('#cRed'),
  rigB: $('#rigB'), shStack: $('#shStack'), shStacker: $('#shStacker'),
  truckBox: $('#truckBox'), truck: $('#truck'), truckL: $('#truckL'), tShadow: $('#tShadow'), roadbar: $('#roadbar'),
  dark: $('#dark'), darkPhoto: $('.dark-photo'), streaks: $('#streaks')
};

/* ==========================================================
   2. SKY puffs (extra depth over the real cloud photo)
   ========================================================== */
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
scatterClouds($('#cl1'), 14, 380, 800, 3);
scatterClouds($('#cl2'), 10, 360, 760, 8, [58, 84, 42, 80]);
scatterClouds($('#cl3'), 7, 520, 980, 21, [0, 0, 0, 0]);

/* ==========================================================
   3. SCROLL ENGINE
   ========================================================== */
const heroEl = $('#hero'), introSky = $('#introSky'), services = $('#services'), svcs = $$('.svc'), spot = $('#spot');
const doors = $('#doors'), panelL = $('#panelL'), panelR = $('#panelR'), gap = $('#gap');
const ocean = $('#ocean'), shipWrap = $('#shipWrap'), shipPhoto = $('#shipPhoto'), oceanCopy = $('#oceanCopy'), oceanTags = $$('.tag'), oceanLabel = $('#oceanLabel');
const clouds = $('#clouds'), plane = $('#plane'), tinyShip = $('#tinyShip'), skyCopy = $('#skyCopy'), skyPhoto = $('#skyPhoto');
const cl1 = $('#cl1'), cl2 = $('#cl2'), cl3 = $('#cl3');
const nav = $('.nav'), railEl = $('#rail'), cue = $('#cue'), progBar = $('#progBar');
const statEls = $$('[data-count]');
const miles = $$('.miles li');

const state = { cur: 0, prev: 0, vel: 0, P: 0, rain: false, sound: false, tour: false, honks: 0, truckOn: false };
let SIMG = 1000, maxScroll = 1, VW = innerWidth, VH = innerHeight, K = 1, GY = 400, WT = 600;
function measure() {
  VW = innerWidth; VH = innerHeight; maxScroll = Math.max(1, track.offsetHeight - VH);
  K = Math.min(VH * .00105, VW / 880);
  GY = VH * (VW < 760 ? .6 : .56);
  WT = TRK.W * TS * K;
  el.floor.style.setProperty('--fy', ((GY + (YT - 60) * K) / VH * 100) + '%');
  sizeCanvas && sizeCanvas();
  SIMG = VW > VH ? VH * 1.3 : Math.max(VH * 1.3, VW * 1.15);
  shipPhoto.style.width = shipPhoto.style.height = SIMG + 'px';
  plane.style.width = Math.min(VW * .9, 1250) + 'px';
}
addEventListener('resize', measure);
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

/* place an image / box at a world position (top-left) and uniform world scale */
let camX = 0;
const sxOf = wx => VW / 2 + (wx - camX) * K;
const syOf = wy => GY + wy * K;
function placeW(node, wx, wy, u) { node.style.transform = `translate(${sxOf(wx)}px,${syOf(wy)}px) scale(${K * u})`; }
/* shared transform for stacker + held container: rotate about the rear-tyre pivot */
function rigTransform(SX, phi) {
  const s = K * S, ox = STK.px, oy = STK.py;
  const tlx = sxOf(SX), tly = syOf(-STK.py * S);
  return { t: `translate(${tlx - ox * (1 - s)}px,${tly - oy * (1 - s)}px) rotate(${phi}deg) scale(${s})`, o: `${ox}px ${oy}px` };
}

const FADE_R = (node, pct) => { node.style.clipPath = `inset(0 ${(100 - clamp(pct) * 100).toFixed(2)}% 0 0)`; };

function render(P, dt) {
  state.P = P;
  const velAbs = Math.abs(state.cur - state.prev);
  state.vel = lerp(state.vel, velAbs, .15);

  /* --- intro / hero --- */
  introSky.style.opacity = clamp(1 - seg(P, .0, .045) + seg(P, .975, .998));
  const hOut = seg(P, .05, .11);
  heroEl.style.opacity = 1 - seg(P, .065, .11);
  heroEl.style.transform = `translateY(${-hOut * 28}vh)`;
  heroEl.style.visibility = P > .12 ? 'hidden' : 'visible';
  cue.style.opacity = 1 - seg(P, 0, .03);

  /* --- truck: one master variable, screen x of its rear --- */
  const camEnd = 700;
  const camStart = 1456;
  const cam = lerp(camStart, camEnd, ease(seg(P, .13, .22)));
  camX = cam + (mouse.x - .5) * 24 / K;
  const bounce = (P > .285 ? Math.sin(performance.now() / 55) * Math.min(1.6, state.vel * .25 + .35) : 0);
  let truckX = null, passP = 0, pass = 0;
  const sxRest = VW / 2 + (TL_REST - camEnd) * K;
  if (P >= .15 && P < .39) {
    if (P < .285) {
      const tl = lerp(-900, TL_REST, easeOut(seg(P, .15, .225)));
      truckX = VW / 2 + (tl - cam) * K;
    } else { pass = 1; passP = ease(seg(P, .285, .385)); truckX = lerp(sxRest, VW + 40, passP); }
  } else if (P >= .445 && P < .535) { pass = 2; passP = ease(seg(P, .447, .53)); truckX = lerp(-WT - 40, VW + 40, passP); }
  else if (P >= .80 && P < .885) { pass = 3; passP = ease(seg(P, .802, .875)); truckX = lerp(-WT - 40, VW + 40, passP); }

  /* --- YARD --- */
  const yOn = P > .04 && P < .39;
  el.yard.style.visibility = yOn ? 'visible' : 'hidden';
  if (yOn) {
    el.yard.style.opacity = seg(P, .045, .09);
    // stacker position + boom angle
    let SX = lerp(2700, SX_PICK, easeOut(seg(P, .07, .125)));
    SX = lerp(SX, SX_PLACE, ease(seg(P, .15, .215)));
    SX += 1000 * easeIn(seg(P, .248, .29));
    let phi = PHI_CARRY * ease(seg(P, .125, .15));
    phi = lerp(phi, PHI_PLACE, ease(seg(P, .19, .225)));
    const stkA = 1 - seg(P, .262, .288);
    const rg = rigTransform(SX, phi);
    el.stacker.style.transform = rg.t; el.stacker.style.transformOrigin = rg.o; el.stacker.style.opacity = stkA;
    el.rigB.style.transform = rg.t; el.rigB.style.transformOrigin = rg.o;
    const held = P >= .125 && P < .245;
    el.rigB.style.display = held ? 'block' : 'none';
    el.cGround.style.visibility = P < .125 ? 'visible' : 'hidden';
    placeW(el.cGround, GROUND_TL.x, GROUND_TL.y, S);
    // back-lane stack (blue over red)
    const u2 = S * .82, hh = 733 * u2 * .985;
    placeW(el.cRed, 1010, -60 - hh, u2);
    placeW(el.cBlue, 1010, -60 - hh * 2 + 4, u2);
    // soft ground shadows
    const ss = el.shStacker; ss.style.transform = `translate(${sxOf(SX + 40)}px,${syOf(-44)}px) scale(${K * (640 / 100)},${K * .5})`; ss.style.width = '100px'; ss.style.height = '100px'; ss.style.opacity = stkA * .9;
    const st = el.shStack; st.style.transform = `translate(${sxOf(960)}px,${syOf(-84)}px) scale(${K * 2.9},${K * .5})`; st.style.width = '100px'; st.style.height = '100px';
  }

  /* --- TRUCK element --- */
  const tOn = truckX !== null;
  el.truckBox.style.display = tOn ? 'block' : 'none';
  state.truckOn = tOn;
  el.roadbar.style.opacity = tOn ? (pass === 0 ? seg(P, .15, .18) : pass === 1 ? 1 - seg(P, .372, .39) : pass === 2 ? seg(P, .445, .456) * (1 - seg(P, .522, .535)) : seg(P, .8, .81) * (1 - seg(P, .87, .884))) : 0;
  if (tOn) {
    const topY = syOf(YT - TRK.ground * TS) + bounce;
    el.truckBox.style.transform = `translate(${truckX}px,${topY}px)`;
    const sc = `scale(${K * TS})`;
    el.truck.style.transform = sc; el.truckL.style.transform = sc;
    const loaded = P >= .245;
    el.truck.style.opacity = loaded ? 0 : 1; el.truckL.style.opacity = loaded ? 1 : 0;
    el.tShadow.style.width = el.tShadow.style.height = '100px';
    el.tShadow.style.transform = `translate(${WT * .02}px,${(TRK.ground * TS - 6) * K}px) scale(${WT / 100 * .98},${K * .55})`;
    const rb = syOf(YT) - 34 * K;
    el.roadbar.style.top = rb + 'px'; el.roadbar.style.height = Math.max(0, VH - rb) + 'px';
    el.roadbar.style.setProperty('--rx', (-(P * 24000) % 120) + 'px');
  }

  /* --- DARK ROAD (wipe #1 follows the truck's rear) --- */
  const dOn = P > .3 && P < .54;
  el.dark.style.visibility = dOn ? 'visible' : 'hidden';
  if (dOn) {
    const pct = P >= .385 ? 1 : (pass === 1 ? clamp(truckX * Math.sqrt(passP) / VW) : 0);
    FADE_R(el.dark, pct);
    const z = seg(P, .3, .5);
    el.darkPhoto.style.transform = `scale(${1 + z * .12}) translateY(${-z * 2}%)`;
    el.streaks.style.setProperty('--sx', (-(P * 30000) % 340) + 'px');
  }

  /* --- services --- */
  const sv1 = seg(P, .39, .425), sv2 = 1 - seg(P, .452, .485);
  services.style.opacity = sv1 * sv2;
  services.style.visibility = (sv1 * sv2) > 0 ? 'visible' : 'hidden';
  svcs.forEach((s, i) => { const k = ease(seg(P, .395 + i * .012, .43 + i * .012)); s.style.opacity = k; s.style.transform = `translateY(${(1 - k) * 36}px)`; });
  spot.style.opacity = sv1 * sv2;

  /* --- DOORS (wipe #2 follows the truck, then the doors slide apart) --- */
  const open = ease(seg(P, .565, .645));
  const drOn = P > .445 && P < .655;
  doors.style.visibility = drOn ? 'visible' : 'hidden';
  if (drOn) {
    const pct = P >= .53 ? 1 : (pass === 2 ? clamp(truckX / VW) : 0);
    FADE_R(doors, pct);
    panelL.style.transform = `translateX(${-open * 102}%)`;
    panelR.style.transform = `translateX(${open * 102}%)`;
    gap.style.transform = `scaleX(${1 - open * .6})`;
    gap.style.opacity = 1 - open;
    if (P > .515) runStats();
    const mi = P > .6 ? 4 : P > .575 ? 3 : 2;
    miles.forEach((m, i) => m.classList.toggle('on', i <= mi));
  }

  /* --- OCEAN --- */
  const oOn = P > .535 && P < .9;
  ocean.style.visibility = oOn ? 'visible' : 'hidden';
  if (oOn) {
    ocean.style.opacity = 1;
    const z = ease(seg(P, .585, .775));
    const sc = lerp(2.5, .86, z), Simg = SIMG;
    const sy = (1 - z) * .26 * Simg * sc;
    shipWrap.style.transform = `translate(${(mouse.x - .5) * -14}px,${sy}px) scale(${sc})`;
    const tOn2 = seg(P, .735, .775) * (1 - seg(P, .825, .85));
    oceanCopy.style.opacity = tOn2; oceanCopy.style.transform = `translateY(${-62 + (1 - tOn2) * 6}%)`;
    oceanTags.forEach((t, i) => { const k = seg(P, .765 + i * .012, .795 + i * .012) * (1 - seg(P, .825, .85)); t.style.opacity = k; });
    oceanLabel.style.opacity = seg(P, .62, .66) * (1 - seg(P, .8, .83));
    state.shipPx = Simg * sc; state.shipSy = sy;
  }

  /* --- CLOUDS + PLANE (wipe #3 follows the truck) --- */
  const cOn = P > .8;
  clouds.style.visibility = cOn ? 'visible' : 'hidden';
  if (cOn) {
    const pct = P >= .875 ? 1 : (pass === 3 ? clamp(truckX / VW) : 0);
    FADE_R(clouds, pct);
    clouds.style.opacity = 1 - seg(P, .965, .995);
    const u = ease(seg(P, .84, .955));
    skyPhoto.style.transform = `scale(${lerp(1.0, 1.45, u)}) translateY(${lerp(0, 3, u)}%)`;
    cl1.style.transform = `translateX(${-u * 14}%) translateY(${u * 8}%) scale(1.05)`;
    cl2.style.transform = `translateX(${-u * 34}%) translateY(${u * 14}%)`;
    cl3.style.transform = `translateX(${-u * 70}%) translateY(${u * 30}%)`;
    const pw = plane.offsetWidth || Math.min(VW * .9, 1250), ph = pw * 702 / 2325;
    const s = lerp(.34, 1.0, easeOut(u));
    const px = lerp(VW * .62, VW * .5, u) - pw / 2 + (mouse.x - .5) * 24, py = lerp(VH * .55, VH * .22, u) - ph / 2;
    plane.style.transform = `translate(${px}px,${py}px) rotate(${lerp(-5, 2, u)}deg) scale(${s})`;
    tinyShip.style.left = (VW * .3) + 'px'; tinyShip.style.top = (VH * .62) + 'px';
    tinyShip.style.transform = `translateY(${-u * 40}px) rotate(${lerp(14, 8, u)}deg) scale(${lerp(1, 1.5, u)})`;
    tinyShip.style.opacity = 1 - seg(P, .93, .96);
    const sk = seg(P, .89, .92) * (1 - seg(P, .95, .97));
    skyCopy.style.opacity = sk; skyCopy.style.transform = `translateY(${(1 - sk) * 24}px)`;
  }

  /* --- chrome --- */
  progBar.style.width = (state.cur / (document.documentElement.scrollHeight - VH) * 100) + '%';
  const darkUI = (P > .385 && P < .5) || (P > .6 && P < .97);
  nav.classList.toggle('dark', darkUI); railEl.classList.toggle('dark', darkUI);
  updateRail(P);
  updateAudio(P);
}

/* rail */
const CHAPTERS = [['Intro', 0], ['Yard', .13], ['Truck', .24], ['Services', .41], ['Reliability', .56], ['Sea', .72], ['Air', .92]];
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
$$('a[href="#tools"],a[href="#fleet"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); stopTour(); smoothTo($(a.getAttribute('href')).offsetTop - 10, 1800); }));

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

/* fleet cards: pointer tilt */
$$('.tilt').forEach(c => {
  c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`; });
  c.addEventListener('pointerleave', () => { c.style.transform = ''; });
});

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
  // foam around the ship (photo) — particles hugging the hull
  gctx.clearRect(0, 0, foam.width, foam.height);
  if (ocean.style.visibility === 'visible' && state.shipPx) {
    const s = state.shipPx, cx = foam.width / 2 + (mouse.x - .5) * -14, cy = foam.height / 2 + (state.shipSy || 0);
    const hw = .125 * s, top = -.352 * s, bot = .395 * s, vis = Math.min(1, s / 900);
    const n = Math.round(5 + 9 * vis);
    for (let i = 0; i < n; i++) {
      const side = Math.random() < .5 ? -1 : 1, y = lerp(top + .05 * s, bot, Math.random());
      if (cy + y < -20 || cy + y > foam.height + 20) continue;
      foamP.push({ x: cx + side * hw * (.98 + Math.random() * .08), y: cy + y, vx: side * (8 + Math.random() * 26) * vis, vy: (60 + Math.random() * 110) * vis, r: (1.5 + Math.random() * 3.5) * (.5 + vis), life: .9 + Math.random() * .9, max: 1.8 });
    }
    for (let i = 0; i < 3; i++) { const a = (Math.random() - .5) * 2; foamP.push({ x: cx + a * hw * .5, y: cy + top + .03 * s, vx: a * 60 * vis, vy: 120 * vis, r: (2 + Math.random() * 4) * (.5 + vis), life: 1, max: 1.6 }); }
    for (let i = 0; i < 5; i++) { const side = Math.random() < .5 ? -1 : 1; foamP.push({ x: cx + side * hw * .45, y: cy + bot, vx: side * (30 + Math.random() * 60) * vis, vy: (100 + Math.random() * 80) * vis, r: (2 + Math.random() * 5) * (.5 + vis), life: 1.4, max: 2 }); }
    for (let i = foamP.length - 1; i >= 0; i--) {
      const p = foamP[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .985;
      if (p.life <= 0) { foamP.splice(i, 1); continue; }
      gctx.fillStyle = `rgba(255,255,255,${clamp(p.life / p.max) * .42})`; gctx.beginPath(); gctx.arc(p.x, p.y, p.r * (1 + (1 - p.life / p.max) * .6), 0, 6.283); gctx.fill();
    }
    if (foamP.length > 1400) foamP.splice(0, foamP.length - 1400);
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
  const t = AC.currentTime, truck = state.truckOn ? 1 : 0.0, drive = (P > .285 && P < .39 || P > .445 && P < .535 || P > .8 && P < .885) ? 1 : (P > .15 && P < .23 ? .5 : 0);
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
  const r = el.truck.getBoundingClientRect(), b = $('#bubble');
  if (state.truckOn && r.width) {
    b.style.left = clamp(r.left + r.width * .86, 80, VW - 80) + 'px'; b.style.top = Math.max(70, r.top + r.height * .02) + 'px';
    b.textContent = ['BEEP BEEP!', 'HONK!', 'MOVING FREIGHT!', 'OWN THE OUTCOME!'][state.honks % 4];
    b.animate([{ opacity: 0, transform: 'translate(-50%,-80%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-110%) scale(1)', offset: .15 }, { opacity: 1, offset: .75 }, { opacity: 0, transform: 'translate(-50%,-130%) scale(1)' }], { duration: 1400, fill: 'forwards' });
    el.truckBox.animate([{ marginTop: '0px' }, { marginTop: '-6px' }, { marginTop: '0px' }, { marginTop: '-3px' }, { marginTop: '0px' }], { duration: 420 });
  }
  if (++state.honks % 5 === 0) burst(VW / 2, VH / 2, 120);
}
$('#truck').addEventListener('click', honk); $('#truckL').addEventListener('click', honk);

/* ==========================================================
   6. HUD buttons, keys, tour
   ========================================================== */
function setPressed(id, on) { $(id).setAttribute('aria-pressed', on ? 'true' : 'false'); }
function setSound(on) { state.sound = on; if (on) { initAudio(); AC && AC.resume(); } else if (AC) { eng.g.gain.value = sea.g.gain.value = wind.g.gain.value = 0; } setPressed('#bSound', on); }
function setRain(on) { state.rain = on; setPressed('#bRain', on); }
$('#bSound').onclick = () => setSound(!state.sound);
$('#bRain').onclick = () => setRain(!state.rain);
$('#bTour').onclick = () => state.tour ? stopTour() : startTour();
$('#heroTour').onclick = e => { e.preventDefault(); startTour(); };
let tourRAF = 0;
function startTour() {
  if (state.tour) return; state.tour = true; setPressed('#bTour', true);
  let last = performance.now();
  const step = t => {
    if (!state.tour) return; const dt = (t - last) / 1000; last = t;
    const P = scrollY / maxScroll;
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
  else if (k === 'r') setRain(!state.rain);
  else if (k === 'h') honk();
  else if (['arrowdown', 'arrowup', 'pagedown', 'pageup'].includes(k)) stopTour();
});
$('#ctaBtn').addEventListener('click', e => { const r = e.target.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 140);  });
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
window.__mba = { goto, state, render, get K() { return K; }, get camX() { return camX; } };
})();
