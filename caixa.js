/* ============================================================
   FORMAS · A CAIXINHA DE MÚSICA (three.js) — seção antes da Irene
   Uma caixinha laqueada rosa com arabescos dourados, forro de
   veludo e medalhão acolchoado na tampa. Ao abrir, a bailarina sobe no
   pedestal e gira; depois dança os passos clássicos: plié,
   relevé, arabesque e pirouette. A chavinha dá corda.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";

const host = document.getElementById("caixa");
const cv = document.getElementById("c3dbox");
const MOB = !/[?&]q=high/.test(location.search) && (matchMedia("(max-width:760px)").matches || (navigator.hardwareConcurrency || 8) <= 4 || /[?&]q=low/.test(location.search));
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

let R;
try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }); }
catch (e) { host.classList.add("no3d"); window.dispatchEvent(new Event("caixa-fail")); throw e; }
R.setPixelRatio(Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75));
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = .9;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(R);
scene.environment = pm.fromScene(new RoomEnvironment(R), 0.04).texture;
scene.fog = new THREE.Fog(new THREE.Color().setRGB(.967, .8615, .839, THREE.LinearSRGBColorSpace), 12, 30);
const cam = new THREE.PerspectiveCamera(38, 1, 0.3, 260);

/* ---------- utilidades ---------- */
const phys = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ envMapIntensity: .55 }, o));
const SH = (m, cast = true, rec = true) => { m.castShadow = cast; m.receiveShadow = rec; return m; };
const sphere = (r, mat, ws = 32, hs = 20) => SH(new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat));
function canvasTex(w, h, draw, srgb = true) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function lathe(prof, mat, seg = 40) { const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(Math.max(p[0], 1e-4), p[1])), seg); g.computeVertexNormals(); return SH(new THREE.Mesh(g, mat)); }
function limbProf(len, r0, r1, shape) {
  const P = [[0, -len - r1 * .95], [r1 * .55, -len - r1 * .8], [r1 * .9, -len - r1 * .4]];
  for (let i = 18; i >= 0; i--) { const t = i / 18; P.push([r0 + (r1 - r0) * t + (shape ? shape(t) : 0), -t * len]); }
  P.push([r0 * .9, r0 * .4], [r0 * .55, r0 * .8], [0, r0 * .95]);
  return P;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const M = {
  gold: phys({ color: 0xE6C27A, metalness: 1, roughness: .2, envMapIntensity: 1.15 }),
  // caixinha
  lacquer: phys({ color: 0x5A2366, roughness: .22, clearcoat: 1, clearcoatRoughness: .04, sheen: .3, sheenColor: new THREE.Color(0xC9A6FF), envMapIntensity: 1.1 }),
  ivory: phys({ color: 0xFFF3EC, roughness: .38, clearcoat: .8, clearcoatRoughness: .12, envMapIntensity: .7 }),
  velvet: phys({ color: 0xD9708F, roughness: 1, sheen: 1, sheenRoughness: .45, sheenColor: new THREE.Color(0xFFB7CF), envMapIntensity: .3 }),
  pearl: phys({ color: 0xFFF8F1, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, iridescence: .7, iridescenceIOR: 1.5, sheen: .5, envMapIntensity: 1 }),
  // bailarina
  skin: phys({ color: 0xE9BC9C, roughness: .5, sheen: .5, sheenRoughness: .5, sheenColor: new THREE.Color(0xffd9cc), clearcoat: .2, clearcoatRoughness: .55 }),
  tights: phys({ color: 0xF2C6BE, roughness: .5, sheen: .9, sheenRoughness: .3, sheenColor: new THREE.Color(0xffeceb) }),
  hair: phys({ color: 0x3A2015, roughness: .38, sheen: 1, sheenRoughness: .3, sheenColor: new THREE.Color(0xb58060), clearcoat: .4 }),
  bodice: phys({ color: 0xC9973F, metalness: .7, roughness: .3, clearcoat: .8, clearcoatRoughness: .2, sheen: .5, sheenColor: new THREE.Color(0xfff0d0) }),
  tutuA: phys({ color: 0xE2B98A, roughness: .7, sheen: 1, sheenRoughness: .25, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
  tutuB: phys({ color: 0xF6E2C8, roughness: .7, sheen: 1, sheenRoughness: .25, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
  shoe: phys({ color: 0xEFA3B0, roughness: .16, sheen: 1, sheenRoughness: .12, sheenColor: new THREE.Color(0xffffff), clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: .9 }),
  gem: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFE7C2, emissiveIntensity: 2.4, roughness: .1 }),
  ribbon: phys({ color: 0xE8A3B6, roughness: .22, sheen: 1, sheenRoughness: .15, sheenColor: new THREE.Color(0xffffff), clearcoat: 1, clearcoatRoughness: .1 }),
  sole: phys({ color: 0xC98E6B, roughness: .7 }),
};

let pearls;
/* ============================================================
   O FUNDO: luz quente de penteadeira, com bokeh ao longe
   ============================================================ */
const bg = new THREE.Mesh(new THREE.SphereGeometry(200, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  uniforms: { fogC: { value: scene.fog.color } },
  vertexShader: "varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: `uniform vec3 fogC;varying vec3 vP;
    void main(){float y=vP.y;
      vec3 c=mix(fogC,vec3(.95,.64,.74),smoothstep(.02,.35,y));
      c=mix(c,vec3(.68,.56,.93),smoothstep(.35,.9,y));
      vec3 sd=normalize(vec3(.45,.25,-1.));float s=max(dot(vP,sd),0.);
      c+=vec3(1.,.84,.66)*(pow(s,10.)*.2+pow(s,3.)*.06)*smoothstep(.02,.25,y);
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`,
}));
scene.add(bg);

/* ---------- a mesa (cetim) com pétalas ---------- */
const SC = .72;
const table = SH(new THREE.Mesh(new THREE.CircleGeometry(120, 96), phys({ color: 0xF1DAD6, roughness: .45, clearcoat: .35, clearcoatRoughness: .4, sheen: .6, sheenColor: new THREE.Color(0xFFE6EC) })), false, true);
table.rotation.x = -Math.PI / 2; table.position.y = -1.71 * SC; scene.add(table);
{
  const pg = new THREE.SphereGeometry(.16, 14, 8, 0, Math.PI * 2, 0, Math.PI * .45); pg.scale(1, .25, .7);
  const pm2 = phys({ color: 0xF2A3BE, roughness: .55, sheen: 1, sheenColor: new THREE.Color(0xFFE0EA), side: THREE.DoubleSide });
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI * 2, r = 2.3 + rnd() * 2.4; const p = SH(new THREE.Mesh(pg, pm2), true, true);
    p.position.set(Math.cos(a) * r * 1.2, -1.71 * SC + .01 + rnd() * .02, Math.sin(a) * r * .8 + .7); p.rotation.set((rnd() - .5) * .5, rnd() * 6.28, (rnd() - .5) * .5); p.scale.setScalar(.7 + rnd() * .6); scene.add(p);
  }
}

/* ---------- profundidade: sombra de contato sob a caixinha ---------- */
{
  const t = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, "rgba(50,14,34,.85)"); gr.addColorStop(.45, "rgba(50,14,34,.45)"); gr.addColorStop(1, "rgba(60,20,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }, false);
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(6.4 * SC, 4.8 * SC), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  cs.rotation.x = -Math.PI / 2; cs.position.y = -1.71 * SC + .004; cs.renderOrder = -1; scene.add(cs);
}
/* ---------- profundidade: brilhos desfocados em primeiro plano ---------- */
const fgBokeh = [];
{
  const bt = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 30, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(.8, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, false);
  const cols = [0xFFC2D6, 0xFFE2B0, 0xE7D4FF];
  for (let i = 0; i < (MOB ? 5 : 8); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bt, color: cols[i % 3], transparent: true, opacity: .22 + rnd() * .14, depthWrite: false, fog: false }));
    const s = .35 + rnd() * .55; sp.scale.set(s, s, 1);
    const p = new THREE.Vector3((rnd() - .5) * 7, -.6 + rnd() * 3.4, 3.3 + rnd() * 1.6); sp.position.copy(p); scene.add(sp); fgBokeh.push({ sp, p, ph: rnd() * 6.28 });
  }
}
/* ============================================================
   A CAIXINHA DE MÚSICA
   ============================================================ */
const BW = 4.4, BD = 3.0, TW = .16;
const stage = new THREE.Group(); stage.scale.setScalar(SC); scene.add(stage);
const rbox = (w, h, d, r, mat) => SH(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat));
function deco(w, h, draw) {
  const t = canvasTex(w, h, (g) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.strokeStyle = "#fff"; g.fillStyle = "#fff"; g.lineCap = "round"; draw(g, w, h); }, false);
  return phys({ color: 0xE9C27C, metalness: 1, roughness: .22, envMapIntensity: 1.2, alphaMap: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
}
function curl(g, x, y, r, dir, rot, turns = 2.4) { g.beginPath(); for (let i = 0; i <= 70; i++) { const t = i / 70, a = rot + dir * t * Math.PI * turns, rr = r * (1 - t * .82); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
function scroll(g, x, y, s, dir) { g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + dir * 40 * s, y - 34 * s, x + dir * 90 * s, y + 30 * s, x + dir * 130 * s, y); g.stroke(); curl(g, x + dir * 130 * s, y - 16 * s, 16 * s, -dir, Math.PI / 2 * dir, 1.6); curl(g, x + dir * 52 * s, y - 2 * s, 12 * s, dir, -Math.PI / 2, 1.4); }
{
  // base com molduras douradas
  const plinth = rbox(BW + .26, .16, BD + .26, .05, M.lacquer); plinth.position.y = -1.47; stage.add(plinth);
  const gb = rbox(BW + .3, .045, BD + .3, .02, M.gold); gb.position.y = -1.375; stage.add(gb);
  const body = rbox(BW, 1.0, BD, .07, M.lacquer); body.position.y = -.9; stage.add(body);
  const belt = rbox(BW + .025, .05, BD + .025, .02, M.gold); belt.position.y = -.46; stage.add(belt);
  // paredes da borda (deixam ver o veludo lá dentro)
  for (const s of [-1, 1]) {
    const f = rbox(BW, .34, TW, .03, M.lacquer); f.position.set(0, -.27, s * (BD / 2 - TW / 2)); stage.add(f);
    const l = rbox(TW, .34, BD - TW * 2 + .02, .03, M.lacquer); l.position.set(s * (BW / 2 - TW / 2), -.27, 0); stage.add(l);
    const gf = rbox(BW + .02, .03, TW + .02, .012, M.gold); gf.position.set(0, -.095, s * (BD / 2 - TW / 2)); stage.add(gf);
    const gl = rbox(TW + .02, .03, BD + .02, .012, M.gold); gl.position.set(s * (BW / 2 - TW / 2), -.095, 0); stage.add(gl);
  }
  // veludo do interior
  const IW = BW - TW * 2, ID = BD - TW * 2;
  const floor = SH(new THREE.Mesh(new THREE.PlaneGeometry(IW, ID), M.velvet), false, true); floor.rotation.x = -Math.PI / 2; floor.position.y = -.385; stage.add(floor);
  for (const s of [-1, 1]) {
    const a = SH(new THREE.Mesh(new THREE.PlaneGeometry(IW, .32), M.velvet), false, true); a.position.set(0, -.25, s * (ID / 2 - .002)); a.rotation.y = s > 0 ? Math.PI : 0; stage.add(a);
    const b = SH(new THREE.Mesh(new THREE.PlaneGeometry(ID, .32), M.velvet), false, true); b.position.set(s * (IW / 2 - .002), -.25, 0); b.rotation.y = -s * Math.PI / 2; stage.add(b);
  }
  // sombra interna: escurece o veludo junto às paredes (dá fundo à caixinha)
  { const t = canvasTex(512, 352, (g, w, h) => { g.clearRect(0, 0, w, h); const e = 70; const add = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(30,4,18,.7)"); gr.addColorStop(1, "rgba(30,4,18,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }; add(0, 0, e, 0); add(w, 0, w - e, 0); add(0, 0, 0, e); add(0, h, 0, h - e); }, false);
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(IW, ID), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false })); ao.rotation.x = -Math.PI / 2; ao.position.y = -.38; stage.add(ao); }
  // pezinhos dourados
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const ft = sphere(.15, M.gold, 24, 16); ft.scale.y = .75; ft.position.set(x * (BW / 2 - .05), -1.6, z * (BD / 2 - .05)); stage.add(ft);
  }
  // painéis de marfim com arabescos dourados
  const front = rbox(3.7, .72, .04, .02, M.ivory); front.position.set(0, -.92, BD / 2 + .005); stage.add(front);
  const fd = new THREE.Mesh(new THREE.PlaneGeometry(3.7, .72), deco(1480, 288, (g, w, h) => {
    g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36); g.lineWidth = 2.5; g.strokeRect(34, 34, w - 68, h - 68);
    g.lineWidth = 5; scroll(g, w / 2 - 250, h / 2 + 10, 1.15, -1); scroll(g, w / 2 + 250, h / 2 + 10, 1.15, 1);
    g.font = "italic 400 120px 'Bodoni Moda', Didot, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("Formas", w / 2, h / 2 - 12);
    g.font = "700 26px Manrope, Arial, sans-serif"; g.fillText("E S C O L A   D E   D A N Ç A", w / 2, h / 2 + 70);
    for (const x of [70, w - 70]) { g.beginPath(); g.arc(x, h / 2, 12, 0, 7); g.fill(); }
  })); fd.position.set(0, -.92, BD / 2 + .027); stage.add(fd);
  for (const s of [-1, 1]) {
    const sp = rbox(.04, .72, 2.4, .02, M.ivory); sp.position.set(s * (BW / 2 + .005), -.92, 0); stage.add(sp);
    const sd = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .72), deco(960, 288, (g, w, h) => { g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36); g.lineWidth = 5; scroll(g, w / 2 - 20, h / 2 + 10, 1.4, -1); scroll(g, w / 2 + 20, h / 2 + 10, 1.4, 1); g.beginPath(); g.arc(w / 2, h / 2, 14, 0, 7); g.fill(); }));
    sd.position.set(s * (BW / 2 + .027), -.92, 0); sd.rotation.y = s * Math.PI / 2; stage.add(sd);
  }
  // pérolas e um anelzinho no veludo
  const pts = []; for (let i = 0; i < 26; i++) { const t = i / 25, a = -.4 + t * 3.6; pts.push(new THREE.Vector3(-1.35 + Math.cos(a) * .42 * (1 - t * .25), -.36, .72 + Math.sin(a) * .3)); }
  pearls = new THREE.Group(); stage.add(pearls);
  pts.forEach(p => { const s = sphere(.045, M.pearl, 16, 12); s.position.copy(p); pearls.add(s); });
  const ring = SH(new THREE.Mesh(new THREE.TorusGeometry(.1, .022, 12, 40), M.gold)); ring.position.set(1.35, -.3, .75); ring.rotation.set(-1.2, 0, .3); stage.add(ring);
  const gem = sphere(.045, M.gem, 16, 12); gem.position.set(1.35, -.2, .79); stage.add(gem);
}
// a tampa (dobradiça atrás) com medalhão de veludo
const lid = new THREE.Group(); lid.position.set(0, -.1, -BD / 2); stage.add(lid);
{
  const slab = rbox(BW + .06, .26, BD + .06, .07, M.lacquer); slab.position.set(0, .13, BD / 2); lid.add(slab);
  const gb = rbox(BW + .1, .04, BD + .1, .02, M.gold); gb.position.set(0, .02, BD / 2); lid.add(gb);
  const top = rbox(BW - .5, .07, BD - .5, .03, M.ivory); top.position.set(0, .285, BD / 2); lid.add(top);
  const td = new THREE.Mesh(new THREE.PlaneGeometry(BW - .5, BD - .5), deco(1170, 810, (g, w, h) => {
    g.lineWidth = 7; g.strokeRect(20, 20, w - 40, h - 40); g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80);
    g.lineWidth = 6; g.beginPath(); g.ellipse(w / 2, h / 2, 330, 250, 0, 0, 7); g.stroke(); g.lineWidth = 3; g.beginPath(); g.ellipse(w / 2, h / 2, 300, 222, 0, 0, 7); g.stroke();
    g.lineWidth = 5; for (const [x, y, sx, sy] of [[70, 70, 1, 1], [w - 70, 70, -1, 1], [70, h - 70, 1, -1], [w - 70, h - 70, -1, -1]]) { curl(g, x + sx * 40, y + sy * 40, 34, sx * sy, 0, 2); g.beginPath(); g.moveTo(x + sx * 10, y + sy * 110); g.quadraticCurveTo(x + sx * 10, y + sy * 10, x + sx * 110, y + sy * 10); g.stroke(); }
    scroll(g, w / 2 - 330, h / 2, 1, -1); scroll(g, w / 2 + 330, h / 2, 1, 1);
    g.font = "italic 400 230px 'Bodoni Moda', Didot, Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("F", w / 2, h / 2 + 6);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.beginPath(); g.arc(w / 2 + Math.cos(a) * 365, h / 2 + Math.sin(a) * 280, i % 2 ? 6 : 10, 0, 7); g.fill(); }
  })); td.rotation.x = -Math.PI / 2; td.position.set(0, .322, BD / 2); lid.add(td);
  const clasp = rbox(.34, .2, .06, .02, M.gold); clasp.position.set(0, .12, BD + .05); lid.add(clasp);
  const cg = sphere(.05, M.gem, 16, 12); cg.position.set(0, .12, BD + .085); lid.add(cg);
  // forro de veludo (sem espelho nem medalhão)
  const lin = new THREE.Mesh(new THREE.PlaneGeometry(BW - .1, BD - .1), M.velvet); lin.rotation.x = Math.PI / 2; lin.position.set(0, -.008, BD / 2); lid.add(lin);
}
// a chavinha de dar corda (lado direito)
const key = new THREE.Group(); key.position.set(BW / 2 + .03, -.92, 0); stage.add(key);
{
  const esc = SH(new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .03, 32), M.gold)); esc.rotation.z = Math.PI / 2; esc.position.x = .02; key.add(esc);
  const sh = SH(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .34, 16), M.gold)); sh.rotation.z = Math.PI / 2; sh.position.x = .19; key.add(sh);
  const knot = sphere(.055, M.gold, 20, 14); knot.position.x = .37; key.add(knot);
  for (const s of [-1, 1]) { const w = SH(new THREE.Mesh(new THREE.TorusGeometry(.13, .032, 12, 40), M.gold)); w.rotation.y = Math.PI / 2; w.scale.set(1, 1.15, .8); w.position.set(.4, s * .17, 0); key.add(w); }
}
// pedestal dourado que sobe com a bailarina
const ped = new THREE.Group(); stage.add(ped);
{
  const disc = SH(new THREE.Mesh(new THREE.CylinderGeometry(.3, .36, .07, 48), M.gold)); disc.position.y = -.035; ped.add(disc);
  const rim = SH(new THREE.Mesh(new THREE.TorusGeometry(.33, .02, 10, 60), M.gold)); rim.rotation.x = Math.PI / 2; rim.position.y = -.04; ped.add(rim);
  const col = SH(new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 3, 20), M.gold)); col.position.y = -1.55; ped.add(col);
  for (let i = 0; i < 6; i++) { const r = SH(new THREE.Mesh(new THREE.TorusGeometry(.065, .014, 8, 24), M.gold)); r.rotation.x = Math.PI / 2; r.position.y = -.2 - i * .25; ped.add(r); }
}
const rosette = SH(new THREE.Mesh(new THREE.TorusGeometry(.12, .03, 10, 40), M.gold)); rosette.rotation.x = Math.PI / 2; rosette.position.y = -.39; stage.add(rosette);

/* ============================================================
   A BAILARINA
   ============================================================ */
const DS = 1.38;
const J = {};
const dancerRoot = new THREE.Group(); dancerRoot.scale.setScalar(DS); dancerRoot.position.set(0, 0, 0); scene.add(dancerRoot);
const dancer = new THREE.Group(); dancerRoot.add(dancer);
const BASE_Y = .93;
const pelvis = new THREE.Group(); pelvis.position.y = BASE_Y; dancer.add(pelvis);
J.spine = new THREE.Group(); pelvis.add(J.spine);
const torsoP = [[0, -.075], [.052, -.07], [.078, -.05], [.086, -.02], [.083, .02], [.073, .07], [.069, .11], [.077, .18], [.09, .25], [.095, .3], [.092, .345], [.078, .38], [.052, .403], [.026, .415], [0, .42]];
const torso = lathe(torsoP, M.skin); torso.scale.z = .74; J.spine.add(torso);
// corpete dourado com ponta (basque)
{
  const prof = torsoP.slice(1, 10).map(([r, y]) => [r + .005, y]);
  const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 64), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z); const front = Math.max(0, Math.cos(a)); if (y < -.02) p.setY(i, y - front ** 6 * .05); if (y > .26) p.setY(i, Math.min(y, .26 + .045 * Math.abs(Math.sin(a * 2)) + (1 - front) * .05)); }
  g.computeVertexNormals();
  const bod = SH(new THREE.Mesh(g, M.bodice)); bod.scale.z = .76; J.spine.add(bod);
  const gemG = new THREE.OctahedronGeometry(.0055);
  for (let k = 0; k < 26; k++) { const y = .0 + (k % 9) * .03, x = ((k / 9 | 0) - 1) * .028 + (k % 2 ? .008 : -.008); const tp = torsoP.find(q => q[1] >= y); const r = (tp ? tp[0] : .08) + .007; if (Math.abs(x) > r) continue; const gm = new THREE.Mesh(gemG, M.gem); gm.position.set(x, y, Math.sqrt(r * r - x * x) * .76); J.spine.add(gm); }
}
const neck = lathe([[0, .37], [.036, .375], [.031, .42], [.029, .47], [.026, .52], [0, .55]], M.skin); J.spine.add(neck);
J.head = new THREE.Group(); J.head.position.y = .462; J.head.scale.setScalar(1.14); J.spine.add(J.head);
const headC = new THREE.Vector3(0, .1, .006);
const head = sphere(.08, M.skin, 48, 32); head.scale.set(.86, 1.06, .95); head.position.copy(headC); J.head.add(head);
// queixo delicado
const chin = sphere(.045, M.skin, 24, 16); chin.scale.set(1, .9, .9); chin.position.copy(headC).add(new THREE.Vector3(0, -.045, .028)); J.head.add(chin);
{
  const E = new THREE.Vector3(.0688, .0848, .076);
  const onHead = (x, y, off = 0) => new THREE.Vector3(x, y, E.z * Math.sqrt(Math.max(0, 1 - (x / E.x) ** 2 - (y / E.y) ** 2)) + off).add(headC);
  const lashM = new THREE.MeshStandardMaterial({ color: 0x2a1515, roughness: .6 });
  for (const s of [-1, 1]) {
    const ec = onHead(s * .025, -.002, -.004);
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(.0112, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0xFBF6F2, roughness: .25, clearcoat: 1 })); sclera.scale.set(1.18, .74, .55); sclera.position.copy(ec); sclera.rotation.y = s * .42; J.head.add(sclera);
    const fw = new THREE.Vector3(Math.sin(s * .42) * .0045, 0, Math.cos(s * .42) * .0045);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(.0068, 20, 14), new THREE.MeshPhysicalMaterial({ color: 0x5A3420, roughness: .2, clearcoat: 1 })); iris.scale.set(1, 1, .35); iris.position.copy(ec).add(fw); iris.rotation.y = s * .42; J.head.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.0034, 14, 10), new THREE.MeshBasicMaterial({ color: 0x120806 })); pupil.scale.set(1, 1, .35); pupil.position.copy(ec).add(fw.clone().multiplyScalar(1.12)); J.head.add(pupil);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(.0014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.copy(ec).add(fw.clone().multiplyScalar(1.3)).add(new THREE.Vector3(s * .0016, .0022, 0)); J.head.add(glint);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(.0128, .0019, 6, 20, Math.PI), lashM); eye.scale.set(1.08, .62, 1); eye.rotation.y = s * .42; eye.position.copy(onHead(s * .025, -.0005, .0008)); J.head.add(eye);
    for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.0005, .001, .007, 4), lashM); l.position.copy(onHead(s * (.032 + k * .003), -.004 - k * .002, .0012)); l.rotation.z = s * (-.9 - k * .25); J.head.add(l); }
    const brow = new THREE.Mesh(new THREE.TorusGeometry(.016, .0012, 6, 18, Math.PI * .7), new THREE.MeshStandardMaterial({ color: 0x5a3426 })); brow.rotation.z = Math.PI * .15; brow.rotation.y = s * .42; brow.scale.x = s; brow.position.copy(onHead(s * .025, .022, .0006)); J.head.add(brow);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(.014, 16, 10), new THREE.MeshBasicMaterial({ color: 0xF08A9E, transparent: true, opacity: .26, depthWrite: false })); ch.scale.set(1, .7, .35); ch.position.copy(onHead(s * .036, -.016, -.002)); ch.rotation.y = s * .5; J.head.add(ch);
  }
  const nose = sphere(.0068, M.skin, 12, 10); nose.scale.set(.85, 1.2, 1); nose.position.copy(onHead(0, -.008, -.0018)); J.head.add(nose);
  const lips = new THREE.Mesh(new THREE.SphereGeometry(.0065, 16, 10), phys({ color: 0xC9566E, roughness: .3, clearcoat: .9 })); lips.scale.set(1.5, .6, .55); lips.position.copy(onHead(0, -.031, -.001)); J.head.add(lips);
  for (const s of [-1, 1]) { const ear = sphere(.012, M.skin, 12, 8); ear.scale.set(.5, 1, .8); ear.position.copy(headC).add(new THREE.Vector3(s * .068, -.002, -.004)); J.head.add(ear); const er = new THREE.Mesh(new THREE.SphereGeometry(.0045, 8, 6), M.gem); er.position.copy(ear.position).add(new THREE.Vector3(s * .004, -.014, .002)); J.head.add(er); }
}
// cabelo preso em coque
const cap = SH(new THREE.Mesh(new THREE.SphereGeometry(.0845, 56, 28, 0, Math.PI * 2, 0, Math.PI * .6), M.hair)); cap.scale.set(.9, 1.04, .98); cap.rotation.x = -.72; cap.position.copy(headC).add(new THREE.Vector3(0, .003, -.004)); J.head.add(cap);
{
  // mechas penteadas para trás (sulcos)
  const g = cap.geometry, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(x, z); const k = 1 + .02 * Math.sin(a * 26); p.setX(i, x * k); p.setZ(i, z * k); }
  g.computeVertexNormals();
}
const bun = sphere(.046, M.hair, 32, 20); bun.scale.set(1, .82, .9); bun.position.copy(headC).add(new THREE.Vector3(0, .05, -.066)); J.head.add(bun);
{ const g = bun.geometry, p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(y, x); const k = 1 + .06 * Math.sin(a * 5 + z * 60); p.setXYZ(i, x * k, y * k, z); } g.computeVertexNormals(); }
const tiara = new THREE.Group(); J.head.add(tiara);
{
  const arc = SH(new THREE.Mesh(new THREE.TorusGeometry(.069, .0042, 10, 64, Math.PI), M.bodice)); tiara.add(arc);
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (.1 + .8 * i / 8); const big = i === 4; const g = new THREE.Mesh(new THREE.OctahedronGeometry(big ? .014 : .007), M.gem); g.position.set(Math.cos(a) * .069, Math.sin(a) * .069 + (big ? .015 : .005 + (i % 2) * .005), 0); g.scale.y = 1.6; tiara.add(g); }
  tiara.position.copy(headC).add(new THREE.Vector3(0, .02, .014)); tiara.rotation.x = -.62;
}
const flowers = new THREE.Group(); J.head.add(flowers);
{
  const fm = [phys({ color: 0xF7C6D4, roughness: .6, sheen: 1 }), phys({ color: 0xFFF4F0, roughness: .6, sheen: 1 }), phys({ color: 0xE88AA6, roughness: .6, sheen: 1 })];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const f = sphere(.013, fm[i % 3], 16, 12); f.scale.set(1, .7, 1); f.position.set(Math.cos(a) * .072, 0, Math.sin(a) * .072); flowers.add(f); }
  flowers.position.copy(headC).add(new THREE.Vector3(0, .045, -.008)); flowers.rotation.x = -.38; flowers.visible = false;
}
// braços
function arm(side) {
  const s = side === "R" ? 1 : -1;
  const sh = new THREE.Group(); sh.position.set(.104 * s, .362, 0); J.spine.add(sh);
  sh.add(sphere(.036, M.skin));
  sh.add(lathe(limbProf(.22, .037, .027, t => .004 * Math.sin(Math.PI * t)), M.skin, 32));
  const el = new THREE.Group(); el.position.y = -.22; sh.add(el);
  el.add(sphere(.026, M.skin, 20, 14));
  el.add(lathe(limbProf(.2, .027, .018, t => .004 * Math.sin(Math.PI * t * .8)), M.skin, 32));
  const wr = new THREE.Group(); wr.position.y = -.2; el.add(wr);
  const palm = sphere(.022, M.skin, 24, 16); palm.scale.set(1.2, 1.55, .62); palm.position.y = -.03; wr.add(palm);
  const FL = [.03, .036, .034, .027];
  for (let k = 0; k < 4; k++) { const len = FL[k], f = SH(new THREE.Mesh(new THREE.CapsuleGeometry(.0062, len, 4, 12), M.skin)); f.position.set((k - 1.5) * .0112 * s, -.056 - len / 2, .003); f.rotation.set(.22 + k * .05, 0, (k - 1.5) * .07 * s); wr.add(f); }
  const thumb = SH(new THREE.Mesh(new THREE.CapsuleGeometry(.0068, .024, 4, 12), M.skin)); thumb.position.set(-s * .021, -.04, .01); thumb.rotation.set(.45, 0, -s * .65); wr.add(thumb);
  J["sh" + side] = sh; J["el" + side] = el; J["wr" + side] = wr;
}
arm("R"); arm("L");
// pernas e sapatilhas de ponta
const markers = [];
function leg(side) {
  const s = side === "R" ? 1 : -1;
  const hip = new THREE.Group(); hip.position.set(.052 * s, -.035, 0); pelvis.add(hip);
  hip.add(lathe(limbProf(.4, .072, .046, t => .008 * Math.sin(Math.PI * t * .9)), M.tights, 40));
  const kn = new THREE.Group(); kn.position.y = -.4; hip.add(kn);
  kn.add(sphere(.042, M.tights, 24, 16));
  kn.add(lathe(limbProf(.38, .045, .024, t => .015 * Math.exp(-(((t - .27) / .17) ** 2))), M.tights, 40));
  const an = new THREE.Group(); an.position.y = -.38; kn.add(an);
  // sapatilha de ponta: peito do pé arredondado, ponta achatada, debrum e fitas cruzadas
  const shoeP = [[0, -.162], [.015, -.161], [.017, -.152], [.02, -.13], [.025, -.1], [.029, -.07], [.029, -.045], [.027, -.02], [.026, .004], [.0255, .012]];
  const shoe = lathe(shoeP, M.shoe, 40); shoe.scale.z = .86; an.add(shoe);
  const sole = SH(new THREE.Mesh(new THREE.CylinderGeometry(.0158, .0158, .004, 24), M.sole)); sole.position.y = -.161; sole.scale.z = .86; an.add(sole);
  const bind = SH(new THREE.Mesh(new THREE.TorusGeometry(.0262, .0022, 8, 40), M.ribbon)); bind.rotation.x = Math.PI / 2; bind.position.y = .011; bind.scale.y = .86; an.add(bind);
  for (const [y, r] of [[.03, .55], [.03, -.55], [.058, .5], [.058, -.5]]) { const rb = SH(new THREE.Mesh(new THREE.TorusGeometry(.0262, .0026, 6, 40), M.ribbon)); rb.rotation.set(Math.PI / 2 + r, 0, 0); rb.position.y = y; rb.scale.y = .9; an.add(rb); }
  const bow = SH(new THREE.Mesh(new THREE.TorusGeometry(.007, .0025, 6, 16), M.ribbon)); bow.position.set(0, .072, -.027); bow.scale.set(1.6, 1, 1); an.add(bow);
  const tip = new THREE.Object3D(); tip.position.y = -.162; an.add(tip);
  const heel = new THREE.Object3D(); heel.position.set(0, -.005, -.021); an.add(heel);
  const toe2 = new THREE.Object3D(); toe2.position.set(0, -.12, -.021); an.add(toe2);
  markers.push(tip, heel, toe2);
  J["hip" + side] = hip; J["kn" + side] = kn; J["an" + side] = an;
}
leg("R"); leg("L");
// tutu romântico em sino (camadas de tule com babados)
const tutu = new THREE.Group(); tutu.position.y = -.025; pelvis.add(tutu);
const tutuLayers = [];
{
  const NL = MOB ? 7 : 10, RS = MOB ? 120 : 180, RR = 10;
  for (let l = 0; l < NL; l++) {
    const k = l / (NL - 1);
    const L = { rIn: .078, rOut: .5 - k * .1, drop: .13 - k * .07, y0: k * .016, seed: l * 1.9, RS, RR, l, amp: .016 + (1 - k) * .008, freq: 11 + (l % 3) * 2 };
    const pos = new Float32Array((RR + 1) * (RS + 1) * 3), idx = [];
    for (let j = 0; j < RR; j++) for (let i = 0; i < RS; i++) { const a = j * (RS + 1) + i, b = a + RS + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    L.g = g; const m = SH(new THREE.Mesh(g, l % 2 ? M.tutuB : M.tutuA)); m.frustumCulled = false; tutu.add(m); L.m = m;
    tutuLayers.push(L);
  }
}
let flare = 0;
function updTutu(time) {
  const f = flare;
  for (const L of tutuLayers) {
    const p = L.g.attributes.position.array, rOut = L.rOut * (1 + .22 * f), drop = L.drop * (1 - .75 * f);
    let k = 0;
    for (let j = 0; j <= L.RR; j++) {
      const t = j / L.RR, r0 = L.rIn + (rOut - L.rIn) * t, yb = L.y0 - drop * Math.pow(t, 1.7);
      for (let i = 0; i <= L.RS; i++, k += 3) {
        const a = i / L.RS * Math.PI * 2;
        const ruf = t * t * (L.amp * Math.sin(a * L.freq + L.seed) + .003 * Math.sin(a * (L.freq * 2.3) + L.seed * 2) + f * (.025 * Math.sin(a * 6 - time * 10 + L.seed)));
        const rr = r0 * (1 + t * t * .025 * Math.sin(a * L.freq * .5 + L.seed));
        p[k] = Math.cos(a) * rr; p[k + 1] = yb + ruf; p[k + 2] = Math.sin(a) * rr * .97;
      }
    }
    L.g.attributes.position.needsUpdate = true; L.g.computeVertexNormals();
  }
}
updTutu(0);
// lantejoulas no tutu (pontos brilhantes)
const SEQ = MOB ? 70 : 140, seqData = Array.from({ length: SEQ }, () => ({ a: Math.random() * Math.PI * 2, t: .25 + Math.random() * .7, l: tutuLayers.length - 1 - (Math.random() * 3 | 0) }));

dancer.traverse(o => { if (o.isMesh) o.userData.dancer = true; });

/* ---------- poses ---------- */
const ORD = { spine: "XYZ", head: "YXZ", shR: "ZXY", shL: "ZXY", elR: "XYZ", elL: "XYZ", wrR: "XYZ", wrL: "XYZ", hipR: "YXZ", hipL: "YXZ", knR: "XYZ", knL: "XYZ", anR: "XYZ", anL: "XYZ" };
const JN = Object.keys(ORD);
function pose(d) { const q = {}; for (const k of JN) { const v = d[k] || [0, 0, 0]; const a = typeof v === "number" ? [v, 0, 0] : v; q[k] = new THREE.Quaternion().setFromEuler(new THREE.Euler(a[0], a[1], a[2], ORD[k])); } return q; }
const ARMS = {
  low: { shR: [-.32, 0, .22], elR: [-.1, 0, -.6], wrR: [-.1, 0, -.3], shL: [-.32, 0, -.22], elL: [-.1, 0, .6], wrL: [-.1, 0, .3] },
  first: { shR: [-1.15, 0, .32], elR: [-.1, 0, -1.0], wrR: [0, 0, -.3], shL: [-1.15, 0, -.32], elL: [-.1, 0, 1.0], wrL: [0, 0, .3] },
  second: { shR: [-.22, 0, 1.28], elR: [-.38, 0, .08], wrR: [-.3, 0, .25], shL: [-.22, 0, -1.28], elL: [-.38, 0, -.08], wrL: [-.3, 0, -.25] },
  fifth: { shR: [-.32, 0, 2.7], elR: [0, 0, .8], wrR: [0, 0, .35], shL: [-.32, 0, -2.7], elL: [0, 0, -.8], wrL: [0, 0, -.35] },
  arab: { shR: [-2.15, 0, .15], elR: [-.12, 0, -.12], wrR: [-.25, 0, 0], shL: [-.3, 0, -1.45], elL: [-.3, 0, 0], wrL: [-.3, 0, -.15] },
  bow: { shR: [-.75, 0, .95], elR: [-.3, 0, .1], wrR: [-.3, 0, .25], shL: [-.75, 0, -.95], elL: [-.3, 0, -.1], wrL: [-.3, 0, -.25] },
};
const LEGS = {
  sous: { hipR: [0, .55, -.035], hipL: [0, -.55, .035] },
  fifthPointe: { hipR: [0, .6, -.05], hipL: [0, -.6, .05] },
  firstFlat: { hipR: [0, 1.1, -.05], anR: -1.5708, hipL: [0, -1.1, .05], anL: -1.5708 },
  plie: { hipR: [-.62, 1.12, 0], knR: 1.12, anR: -2.07, hipL: [-.62, -1.12, 0], knL: 1.12, anL: -2.07 },
  plie5: { hipR: [-.5, .9, -.04], knR: .95, anR: -2.02, hipL: [-.5, -.9, .04], knL: .95, anL: -2.02 },
  arab: { hipL: [0, -.5, 0], hipR: [1.32, .3, 0], anR: .35 },
  tendu: { hipL: [0, -.5, 0], hipR: [.45, .3, 0], anR: .3 },
  passe: { hipL: [0, -.55, 0], hipR: [-1.42, 1.12, 0], knR: 2.45, anR: .25 },
  fourth: { hipL: [-.45, -.85, 0], knL: .8, anL: -1.95, hipR: [.4, .85, 0], knR: .3, anR: -1.0 },
  bow: { hipL: [-.35, -.6, 0], knL: .7, anL: -1.85, hipR: [.55, .5, 0], knR: .45, anR: .2 },
};
const P = (legs, arms, extra) => Object.assign({}, LEGS[legs], ARMS[arms], extra || {});
const POSES = {
  base: pose(P("sous", "low", { head: [-.05, 0, 0] })),
  first: pose(P("firstFlat", "second", { head: [0, .2, 0] })),
  plie: pose(P("plie", "second", { head: [.12, .3, 0], spine: [.02, 0, 0] })),
  plieArms1: pose(P("plie5", "first", { head: [.1, 0, 0] })),
  releve: pose(P("fifthPointe", "fifth", { head: [-.2, 0, 0], spine: [-.05, 0, 0] })),
  tendu: pose(P("tendu", "second", { head: [0, -.2, 0] })),
  arab: pose(P("arab", "arab", { spine: [.3, 0, 0], head: [-.25, -.15, 0] })),
  prepPir: pose(P("fourth", "first")),
  passe: pose(P("passe", "first", { head: [-.05, 0, 0] })),
  open: pose(P("sous", "second", { head: [-.15, .25, 0], spine: [-.04, 0, 0] })),
  reverence: pose(P("bow", "bow", { spine: [.28, 0, 0], head: [.3, 0, 0] })),
};
const STEPS = {
  plie: [["first", .7, .25], ["plie", 1.0, .3], ["first", .9, .2], ["plie", 1.0, .3], ["first", .9, .3], ["base", .8, 0]],
  releve: [["plieArms1", .8, .2], ["releve", .9, 1.6], ["plieArms1", .8, .1], ["base", .8, 0]],
  arabesque: [["tendu", .8, .2, { face: 1.2 }], ["arab", 1.1, 1.8, { face: 1.2 }], ["tendu", .9, .1, { face: 1.2 }], ["base", .9, 0, { face: 0 }]],
  pirouette: [["prepPir", .8, .25], ["passe", .25, 0], ["passe", 1.5, 0, { spin: 3 }], ["open", .5, .7], ["base", .8, 0]],
  reverence: [["open", .6, .2], ["reverence", 1.1, .8], ["base", 1, 0]],
};
const cur = {}; JN.forEach(k => { cur[k] = POSES.base[k].clone(); J[k].quaternion.copy(cur[k]); });
let face = 0, spin = 0, busy = false, seq = [], segT = 0, seg = null, from = null, curStep = "";
const snap = () => { const s = { q: {}, face, spin }; JN.forEach(k => s.q[k] = cur[k].clone()); return s; };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeSpin = t => t < .2 ? 2.5 * t * t : t > .8 ? 1 - 2.5 * (1 - t) * (1 - t) : .1 + (t - .2) * 1.3333;
function play(name) {
  if (!STEPS[name]) return;
  if (busy && curStep === name) return;
  seq = STEPS[name].map(s => s.slice()); busy = true; curStep = name; nextSeg();
  window.dispatchEvent(new CustomEvent("caixa-step", { detail: { step: name, state: "start" } }));
}
function playSeq(names) {
  const all = []; names.forEach((n, i) => { if (!STEPS[n]) return; STEPS[n].forEach((st, j) => { const c = st.slice(); if (j === 0) c[4] = n; if (j === STEPS[n].length - 1 && i < names.length - 1 && st[0] === "base") c[1] = .5; all.push(c); }); });
  if (!all.length) return; seq = all; busy = true; curStep = "coreografia"; nextSeg();
  window.dispatchEvent(new CustomEvent("caixa-step", { detail: { step: "coreografia", state: "start" } }));
}
function nextSeg() {
  const s = seq.shift();
  if (s && s[4]) window.dispatchEvent(new CustomEvent("caixa-sub", { detail: { step: s[4] } }));
  if (!s) { busy = false; seg = null; spin = 0; face = 0; window.dispatchEvent(new CustomEvent("caixa-step", { detail: { step: curStep, state: "end" } })); return; }
  from = snap(); const o = s[3] || {};
  const homeSpin = Math.round(from.spin / (Math.PI * 2)) * Math.PI * 2;
  seg = { pose: POSES[s[0]], d: s[1], hold: s[2], face: o.face != null ? o.face : 0, spin: o.spin ? homeSpin + o.spin * Math.PI * 2 : homeSpin, isSpin: !!o.spin };
  segT = 0; if (seg.isSpin) sparkleBurst(1.3, 70);
}
function stepAnim(dt) {
  if (!seg) return; segT += dt;
  const u = Math.min(1, segT / seg.d), e = ease(u);
  JN.forEach(k => cur[k].slerpQuaternions(from.q[k], seg.pose[k], e));
  face = from.face + (seg.face - from.face) * e;
  spin = from.spin + (seg.spin - from.spin) * (seg.isSpin ? easeSpin(u) : e);
  if (segT >= seg.d + seg.hold) nextSeg();
}


/* ---------- luz quente de estúdio ---------- */
scene.add(new THREE.HemisphereLight(0xFFF1F4, 0xB48AA6, .6));
const sun = new THREE.DirectionalLight(0xFFDCC0, 2.7); sun.position.set(4, 8, 6); sun.target.position.set(0, -.2, 0); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(MOB ? 1024 : 2048, MOB ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3.4, near: 2, far: 24 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02; sun.shadow.radius = 4;
const fill = new THREE.DirectionalLight(0xD8C8FF, .5); fill.position.set(-6, 3, 6); scene.add(fill);
const spot = new THREE.SpotLight(0xFFEBDD, 2.6, 0, .3, .7, 0); spot.position.set(1.2, 7, 4.6); spot.target.position.set(0, .9, 0); scene.add(spot, spot.target);
const rimL = new THREE.SpotLight(0xFFB3D6, 8, 0, .45, .6, 0); rimL.position.set(-2.6, 3.4, -1.2); rimL.target.position.set(0, 1.1, 0); scene.add(rimL, rimL.target);
const rimR = new THREE.SpotLight(0xFFE2B0, 6, 0, .45, .6, 0); rimR.position.set(2.8, 3, -1); rimR.target.position.set(0, 1, 0); scene.add(rimR, rimR.target);
const glowIn = new THREE.PointLight(0xFFC9A0, 1.6, 4.5, 2); glowIn.position.set(0, .15, .7); scene.add(glowIn);

/* ---------- partículas ---------- */
const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,244,230,.8)"); gr.addColorStop(1, "rgba(255,230,210,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, false);
function pointsMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { tex: { value: dotTex }, time: { value: 0 }, px: { value: R.getPixelRatio() } },
    vertexShader: "attribute float size;attribute float ph;attribute vec3 col;attribute float alpha;varying vec3 vC;varying float vA;uniform float time;uniform float px;void main(){vC=col;vA=alpha*(.55+.45*sin(time*2.2+ph*6.28));vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*px*300./-mv.z;gl_Position=projectionMatrix*mv;}",
    fragmentShader: "uniform sampler2D tex;varying vec3 vC;varying float vA;void main(){vec4 t=texture2D(tex,gl_PointCoord);gl_FragColor=vec4(vC,t.a*vA);}",
  });
}
function makePoints(n, fn, parent = scene) {
  const g = new THREE.BufferGeometry(), A = { position: new Float32Array(n * 3), size: new Float32Array(n), ph: new Float32Array(n), col: new Float32Array(n * 3), alpha: new Float32Array(n) };
  for (let i = 0; i < n; i++) fn(i, A);
  for (const k in A) g.setAttribute(k, new THREE.BufferAttribute(A[k], k === "position" || k === "col" ? 3 : 1));
  const p = new THREE.Points(g, pointsMat()); p.frustumCulled = false; parent.add(p); return p;
}
const PAL = [[1, .88, .62], [1, .82, .9], [1, 1, .96], [.92, .9, 1]];
const NOR = MOB ? 60 : 110;
const orbs = makePoints(NOR, (i, A) => { A.position.set([(rnd() - .5) * 30, -1.5 + rnd() * 10.5, -5 - rnd() * 16], i * 3); A.size[i] = .18 + rnd() * .5; A.ph[i] = rnd(); A.col.set(PAL[i % 3], i * 3); A.alpha[i] = .95; });
orbs.material.fog = false;
const orbV = Array.from({ length: NOR }, () => .03 + rnd() * .07);
const seqPts = makePoints(SEQ, (i, A) => { A.size[i] = .006 + rnd() * .006; A.ph[i] = rnd(); A.col.set(PAL[i % 2 ? 0 : 2], i * 3); A.alpha[i] = 1; }, tutu);
const NB = 220, bVel = new Float32Array(NB * 3), bLife = new Float32Array(NB);
const burst = makePoints(NB, (i, A) => { A.size[i] = .03 + rnd() * .05; A.ph[i] = rnd(); A.col.set(PAL[i % 4], i * 3); A.alpha[i] = 0; });
const NS = 260, sVel = new Float32Array(NS * 3), sLife = new Float32Array(NS);
const seeds = makePoints(NS, (i, A) => { A.size[i] = .05 + rnd() * .08; A.ph[i] = rnd(); A.col.set(PAL[i % 3], i * 3); A.alpha[i] = 0; });
seeds.material.fog = false;
function seedBurst(p, n = 60, up = 1) {
  const Pp = seeds.geometry.attributes.position.array, A = seeds.geometry.attributes.alpha.array; let c = 0;
  for (let i = 0; i < NS && c < n; i++) { if (sLife[i] > 0) continue; c++; const a = Math.random() * 6.28, e = (Math.random() - .3) * 2, sp = .8 + Math.random() * 2.2;
    Pp[i * 3] = p.x; Pp[i * 3 + 1] = p.y; Pp[i * 3 + 2] = p.z; sVel[i * 3] = Math.cos(a) * sp; sVel[i * 3 + 1] = e * up + .6; sVel[i * 3 + 2] = Math.sin(a) * sp; sLife[i] = 2.5 + Math.random() * 2; A[i] = 1; }
}
function sparkleBurst(y = 1.3, n = 60) {
  const Pp = burst.geometry.attributes.position.array, A = burst.geometry.attributes.alpha.array; let c = 0;
  for (let i = 0; i < NB && c < n; i++) {
    if (bLife[i] > 0) continue; c++;
    const a = Math.random() * 6.28, sp = .8 + Math.random() * 1.8;
    Pp[i * 3] = (Math.random() - .5) * .4; Pp[i * 3 + 1] = y + (Math.random() - .5) * .6; Pp[i * 3 + 2] = (Math.random() - .5) * .4;
    bVel[i * 3] = Math.cos(a) * sp; bVel[i * 3 + 1] = .4 + Math.random() * 1.4; bVel[i * 3 + 2] = Math.sin(a) * sp; bLife[i] = 1.4 + Math.random() * .9; A[i] = 1;
  }
}

/* ---------- pós-processamento ---------- */
let composer = null, gtao = null;
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.24 }, con: { value: 1.12 }, vig: { value: .3 } },
  vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: "uniform sampler2D tDiffuse;uniform float sat,con,vig;varying vec2 vUv;void main(){vec4 c=texture2D(tDiffuse,vUv);float l=dot(c.rgb,vec3(.2126,.7152,.0722));c.rgb=mix(vec3(l),c.rgb,sat);c.rgb=(c.rgb-.5)*con+.5;float d=distance(vUv,vec2(.5,.48));c.rgb*=mix(1.,.86,smoothstep(.45,.95,d)*vig/.22);c.rgb+=vec3(.012,.004,.02)*(1.-smoothstep(.0,.6,d));gl_FragColor=c;}",
};
if (!MOB) {
  const rt = new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(R, rt);
  composer.addPass(new RenderPass(scene, cam));
  if (!/nogtao/.test(location.search)) try { gtao = new GTAOPass(scene, cam, 256, 256); gtao.updateGtaoMaterial({ radius: .6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1 }); gtao.blendIntensity = .85; composer.addPass(gtao); } catch (e) { gtao = null; }
  if (/bloom/.test(location.search)) composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), .3, .4, 2.4));
  composer.addPass(new OutputPass());
  composer.addPass(new ShaderPass(GradeShader));
}
/* ---------- câmera: começa na caixinha fechada e se aproxima quando ela abre ---------- */
let W = 1, H = 1, PORT = false, entered = false;
const camS = { az: 0, azT: 0, el: .1, dist: 14, distT: 10, ty: 4.4, tyT: 3.6, lk: -.3, lkT: -.3, px: 0, py: 0 };
function setCamTargets() {
  if (entered) { camS.distT = PORT ? 6.3 : (W / H > 1.7 ? 7.4 : 8.1); camS.tyT = PORT ? 2.7 : 2.35; camS.lkT = PORT ? .62 : .75; }
  else { camS.distT = PORT ? 8.8 : 8.2; camS.tyT = PORT ? 4.2 : 3.6; camS.lkT = PORT ? -.3 : -.5; }
}
let inset = 0;
function applyOffset() { cam.clearViewOffset(); if (inset) cam.setViewOffset(W, H, 0, inset * .55, W, H); cam.updateProjectionMatrix(); }
function resize() {
  const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); PORT = W / H < .9;
  R.setSize(W, H, false); cam.aspect = W / H; cam.fov = PORT ? 50 : 36;
  setCamTargets(); applyOffset();
  if (composer) { composer.setPixelRatio(R.getPixelRatio()); composer.setSize(W, H); }
  [orbs, burst, seqPts, seeds].forEach(p => p.material.uniforms.px.value = R.getPixelRatio());
}
addEventListener("resize", resize); resize();
camS.dist = camS.distT + 3; camS.ty = camS.tyT + 1; camS.lk = camS.lkT;

/* ---------- abrir e fechar a caixinha ---------- */
const RISE0 = -2.75;
let boxOpen = false, lidA = 0, rise = RISE0, risen = false, turnT = 0, idleRot = 0, keySpin = 0, mirrorFlash = 0, pending = null;
function openBox() { if (boxOpen) return; boxOpen = true; entered = true; setCamTargets(); turnT = 4.2; keySpin = 4; }
function closeBox() { if (!boxOpen) return; boxOpen = false; entered = false; setCamTargets(); seq = []; seg = null; busy = false; JN.forEach(k => cur[k].copy(POSES.base[k])); face = 0; spin = 0; }
function playWhenOpen(fn) { if (risen) { fn(); return; } openBox(); pending = fn; }

/* ---------- interação ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let look = { x: 0, y: 0 }, drag = null;
const ev = (k) => window.dispatchEvent(new CustomEvent("caixa-chime", { detail: { k } }));
cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, az: camS.azT, moved: false, t: performance.now(), type: e.pointerType }; });
addEventListener("pointermove", e => {
  const r = host.getBoundingClientRect(); look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)); look.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) > 6) drag.moved = true;
  if (drag.moved && (drag.type !== "touch" || Math.abs(dx) > Math.abs(dy))) { camS.azT = Math.max(-1.2, Math.min(1.2, drag.az - dx * .005)); host.classList.add("dragged"); }
}, { passive: true });
addEventListener("pointerup", e => {
  if (!drag) return; const d = drag; drag = null;
  if (d.moved || performance.now() - d.t > 450) return;
  const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const first = (o) => ray.intersectObject(o, true)[0];
  // a chavinha: dá corda e a bailarina gira com a música
  const hk = first(key); if (hk) { keySpin = 8; if (!boxOpen) { openBox(); } turnT = 8; ev("corda"); seedBurst(hk.point, 30, .6); return; }
  if (!boxOpen) { if (first(stage)) { openBox(); ev("abrir"); } return; }
  if (risen && first(dancer)) { window.dispatchEvent(new CustomEvent("caixa-tap")); return; }
  if (first(lid)) { closeBox(); ev("fechar"); return; }
  const hp = first(pearls); if (hp) { seedBurst(hp.point, 40, .7); ev("perolas"); return; }
  const hs = first(stage); if (hs) { seedBurst(hs.point, 24, .6); return; }
  const p = new THREE.Vector3(); ray.ray.at(9, p); seedBurst(p, 24);
});

/* ---------- API para a página ---------- */
const lighten = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k);
const Caixa = {
  play(name) { playWhenOpen(() => play(name)); },
  playSeq(list) { playWhenOpen(() => playSeq(list)); },
  setInset(px) { inset = px || 0; applyOffset(); },
  burst() { sparkleBurst(1.3, 80); },
  open() { openBox(); },
  close() { closeBox(); },
  wind(sec) { keySpin = sec || 8; turnT = sec || 8; },
  isOpen: () => boxOpen,
  set(o) {
    if (o.pele) { M.skin.color.set(o.pele); M.tights.color.set(o.pele).lerp(new THREE.Color(0xF6C0C4), .35); }
    if (o.cabelo) M.hair.color.set(o.cabelo);
    if (o.tutu) { M.tutuA.color.copy(new THREE.Color(o.tutu)); M.tutuB.color.copy(lighten(o.tutu, .3)); M.bodice.color.copy(new THREE.Color(o.tutu)).multiplyScalar(.82); }
    if (o.sapatilha) { M.shoe.color.set(o.sapatilha === "pele" ? (o.pele || "#E9B796") : o.sapatilha); M.ribbon.color.copy(M.shoe.color).multiplyScalar(.9); }
    if (o.enfeite) { tiara.visible = o.enfeite === "tiara"; flowers.visible = o.enfeite === "flores"; }
  },
  photo(nome) {
    render(performance.now());
    const c = document.createElement("canvas"); c.width = R.domElement.width; c.height = R.domElement.height; const g = c.getContext("2d");
    g.drawImage(R.domElement, 0, 0);
    const s = c.width / 1200; g.fillStyle = "rgba(255,255,255,.55)"; g.fillRect(0, c.height - 120 * s, c.width, 120 * s);
    g.fillStyle = "#3A2850"; g.font = `italic ${46 * s}px "Bodoni Moda", Georgia, serif`; g.textAlign = "center";
    g.fillText(nome ? `Bailarina ${nome}` : "Minha bailarina", c.width / 2, c.height - 62 * s);
    g.font = `700 ${18 * s}px Manrope, sans-serif`; g.fillStyle = "#A9783A"; g.fillText("FORMAS ESCOLA DE DANÇA · formasescoladedanca.com.br", c.width / 2, c.height - 28 * s);
    return c.toDataURL("image/jpeg", .9);
  },
  plaque() { const v = new THREE.Vector3(0, -1.75, BD / 2 + .4); v.applyMatrix4(stage.matrixWorld); v.project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; },
  debugCam(az, el, dist, ty) { if (az != null) camS.azT = camS.az = az; if (el != null) camS.el = el; if (dist != null) camS.dist = camS.distT = dist; if (ty != null) camS.ty = camS.tyT = ty; },
  snapPose(name, f) { seq = []; seg = null; busy = true; JN.forEach(k => cur[k].copy(POSES[name][k])); face = f || 0; spin = 0; },
  instant() { openBox(); lidA = -1.85; rise = 0; risen = true; turnT = 0; camS.dist = camS.distT; camS.ty = camS.tyT; camS.lk = camS.lkT; },
};
window.Caixa = Caixa;

/* ---------- laço ---------- */
let last = performance.now(), visible = true, tm = 0, idleW = 1;
const tmpV = new THREE.Vector3(), lq = new THREE.Quaternion(), le = new THREE.Euler();
const TAU = Math.PI * 2;
function render(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; tm += dt;
  // tampa e elevador da bailarina
  const lidT = boxOpen ? -1.85 : (rise < RISE0 + .3 ? 0 : -1.85);
  lidA += (lidT - lidA) * Math.min(1, dt * (boxOpen ? 1.7 : 2.6)); lid.rotation.x = lidA;
  const riseT = boxOpen ? (lidA < -1.05 ? 0 : RISE0) : RISE0;
  const prev = rise; rise += (riseT - rise) * Math.min(1, dt * (boxOpen ? 1.6 : 2.4));
  if (boxOpen && prev < -.25 && rise >= -.25) sparkleBurst(.3, 90);
  if (boxOpen && !risen && rise > -.02) { risen = true; if (pending) { const f = pending; pending = null; setTimeout(f, 250); } else window.dispatchEvent(new CustomEvent("caixa-risen")); }
  if (!boxOpen) risen = false;
  ped.position.y = rise / SC; dancerRoot.position.y = rise; dancerRoot.visible = rise > RISE0 + .04;
  // bailarina
  stepAnim(dt);
  JN.forEach(k => J[k].quaternion.copy(cur[k]));
  const still = busy || turnT > 0 ? 0 : 1; idleW += (still - idleW) * Math.min(1, dt * (still ? 1.5 : 6));
  { const b = Math.sin(tm * 1.6) * idleW; J.spine.quaternion.multiply(lq.setFromEuler(le.set(b * .012, 0, 0))); J.shR.quaternion.multiply(lq.setFromEuler(le.set(0, 0, b * .035))); J.shL.quaternion.multiply(lq.setFromEuler(le.set(0, 0, -b * .035))); }
  J.head.quaternion.multiply(lq.setFromEuler(le.set(look.y * .1, look.x * .3, 0, "YXZ")));
  // gira como numa caixinha de música enquanto a corda dura
  if (busy) turnT = 0;
  if (turnT > 0) { turnT -= dt; idleRot += dt * Math.min(1.4, .4 + turnT * .5); }
  else { const tgt = Math.round(idleRot / TAU) * TAU; idleRot += (tgt - idleRot) * Math.min(1, dt * 1.6); }
  dancer.rotation.y = face + spin + idleRot + Math.sin(tm * .4) * .15 * idleW;
  dancerRoot.updateMatrixWorld(true);
  let minY = Infinity; for (const m of markers) { m.getWorldPosition(tmpV); minY = Math.min(minY, tmpV.y); }
  pelvis.position.y += -(minY - rise - .004) / dancerRoot.scale.y;
  const spinning = (seg && seg.isSpin) || turnT > 0 ? 1 : 0; flare += (spinning - flare) * Math.min(1, dt * (spinning ? 3 : 2));
  if (!REDUCE) updTutu(tm);
  { const sp = seqPts.geometry.attributes.position.array; seqData.forEach((d, i) => { const L = tutuLayers[d.l], rOut = L.rOut * (1 + .22 * flare), drop = L.drop * (1 - .75 * flare), r = L.rIn + (rOut - L.rIn) * d.t; sp[i * 3] = Math.cos(d.a) * r; sp[i * 3 + 1] = L.y0 - drop * Math.pow(d.t, 1.7) + .006; sp[i * 3 + 2] = Math.sin(d.a) * r * .97; }); seqPts.geometry.attributes.position.needsUpdate = true; }
  // chavinha
  if (keySpin > 0) { keySpin -= dt; key.rotation.x -= dt * Math.min(4, 1 + keySpin); }
  if (mirrorFlash > 0) mirrorFlash = Math.max(0, mirrorFlash - dt); glowIn.intensity = 1.6 + mirrorFlash * 3;
  // câmera
  const k = Math.min(1, dt * (entered ? .8 : .7));
  camS.dist += (camS.distT - camS.dist) * k; camS.ty += (camS.tyT - camS.ty) * k; camS.lk += (camS.lkT - camS.lk) * k;
  if (!drag) camS.azT *= .996;
  camS.az += (camS.azT - camS.az) * .06; camS.px += (look.x * .35 - camS.px) * .04; camS.py += (-look.y * .18 - camS.py) * .04;
  const d = camS.dist, az = camS.az + (entered ? 0 : Math.sin(tm * .25) * .12);
  cam.position.set(Math.sin(az) * d + camS.px, camS.ty + camS.py, Math.cos(az) * d);
  cam.lookAt(0, camS.lk, 0);
  // bokeh e brilhos
  fgBokeh.forEach((b, i) => { b.sp.position.set(b.p.x + Math.sin(tm * .2 + b.ph) * .25, b.p.y + Math.sin(tm * .3 + b.ph) * .15, b.p.z); });
  const Po = orbs.geometry.attributes.position.array;
  for (let i = 0; i < NOR; i++) { Po[i * 3 + 1] += orbV[i] * dt; if (Po[i * 3 + 1] > 9) Po[i * 3 + 1] = -1.5; Po[i * 3] += Math.sin(tm * .3 + i) * .0015; }
  orbs.geometry.attributes.position.needsUpdate = true;
  const BP = burst.geometry.attributes.position.array, BA = burst.geometry.attributes.alpha.array;
  for (let i = 0; i < NB; i++) { if (bLife[i] <= 0) continue; bLife[i] -= dt; bVel[i * 3 + 1] -= .7 * dt; for (let q = 0; q < 3; q++) BP[i * 3 + q] += bVel[i * 3 + q] * dt * .7; BA[i] = Math.max(0, Math.min(1, bLife[i])); }
  burst.geometry.attributes.position.needsUpdate = true; burst.geometry.attributes.alpha.needsUpdate = true;
  const SP = seeds.geometry.attributes.position.array, SA = seeds.geometry.attributes.alpha.array;
  for (let i = 0; i < NS; i++) { if (sLife[i] <= 0) continue; sLife[i] -= dt; sVel[i * 3 + 1] -= .35 * dt; for (let q = 0; q < 3; q++) { sVel[i * 3 + q] *= .97; SP[i * 3 + q] += sVel[i * 3 + q] * dt * .6; } SA[i] = Math.max(0, Math.min(1, sLife[i] / 1.2)); }
  seeds.geometry.attributes.position.needsUpdate = true; seeds.geometry.attributes.alpha.needsUpdate = true;
  [orbs, burst, seqPts, seeds].forEach(p => p.material.uniforms.time.value = tm);
  if (composer) composer.render(); else R.render(scene, cam);
  window.dispatchEvent(new Event("caixa-frame"));
}
function loop(now) { if (visible) render(now); requestAnimationFrame(loop); }
new IntersectionObserver(es => { visible = es[0].isIntersecting; last = performance.now(); }).observe(host);
render(performance.now());
host.classList.add("ready3d");
window.dispatchEvent(new Event("caixa-ready"));
requestAnimationFrame(loop);
