/* ============================================================
   FORMAS · O PALCO EM 3D (three.js)
   Uma maquete redonda de palco flutuando no céu: piso de madeira,
   saia de veludo com franja dourada, cortina em arco, barra com
   espelho, refletores, ribalta e um buquê. No centro, a bailarina
   3D dança os passos clássicos: plié, relevé, arabesque e pirouette.
   ============================================================ */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const host = document.getElementById("reino");
const cv = document.getElementById("c3d");
const MOB = !/[?&]q=high/.test(location.search) && (matchMedia("(max-width:760px)").matches || (navigator.hardwareConcurrency || 8) <= 4 || /[?&]q=low/.test(location.search));
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

let R;
try { R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }); }
catch (e) { host.classList.add("no3d"); window.dispatchEvent(new Event("reino-fail")); throw e; }
R.setPixelRatio(Math.min(devicePixelRatio || 1, MOB ? 1.6 : 1.75));
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = .86;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pm = new THREE.PMREMGenerator(R);
scene.environment = pm.fromScene(new RoomEnvironment(R), 0.04).texture;
const cam = new THREE.PerspectiveCamera(38, 1, 0.1, 400);

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
  lacquer: phys({ color: 0xF2BFD0, roughness: .3, clearcoat: 1, clearcoatRoughness: .06, sheen: .25, sheenColor: new THREE.Color(0xFFE8F0), envMapIntensity: .8 }),
  ivory: phys({ color: 0xFFF3EC, roughness: .38, clearcoat: .8, clearcoatRoughness: .12, envMapIntensity: .7 }),
  velvet: phys({ color: 0x9C2458, roughness: 1, sheen: 1, sheenRoughness: .45, sheenColor: new THREE.Color(0xFFB7CF), envMapIntensity: .3 }),
  pearl: phys({ color: 0xFFF8F1, roughness: .12, clearcoat: 1, clearcoatRoughness: .05, iridescence: .7, iridescenceIOR: 1.5, sheen: .5, envMapIntensity: 1 }),
  dark: phys({ color: 0x2E1F33, metalness: .6, roughness: .35, clearcoat: .6 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x5E9C6A, roughness: .8 }),
  // bailarina
  skin: phys({ color: 0xE9BC9C, roughness: .5, sheen: .5, sheenRoughness: .5, sheenColor: new THREE.Color(0xffd9cc), clearcoat: .2, clearcoatRoughness: .55 }),
  tights: phys({ color: 0xF2C6BE, roughness: .5, sheen: .9, sheenRoughness: .3, sheenColor: new THREE.Color(0xffeceb) }),
  hair: phys({ color: 0x3A2015, roughness: .38, sheen: 1, sheenRoughness: .3, sheenColor: new THREE.Color(0xb58060), clearcoat: .4 }),
  bodice: phys({ color: 0xC9973F, metalness: .7, roughness: .3, clearcoat: .8, clearcoatRoughness: .2, sheen: .5, sheenColor: new THREE.Color(0xfff0d0) }),
  tutuA: phys({ color: 0xE2B98A, roughness: .8, sheen: 1, sheenRoughness: .3, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide, emissive: 0xE2B98A, emissiveIntensity: .32 }),
  tutuB: phys({ color: 0xF6E2C8, roughness: .8, sheen: 1, sheenRoughness: .3, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide, emissive: 0xF6E2C8, emissiveIntensity: .32 }),
  shoe: phys({ color: 0xEFB3AC, roughness: .2, sheen: 1, sheenRoughness: .2, sheenColor: new THREE.Color(0xffffff), clearcoat: 1, clearcoatRoughness: .12 }),
  gem: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFE7C2, emissiveIntensity: 2.4, roughness: .1 }),
};
/* ============================================================
   O CHÃO DE LUZ: sem palco, só a bailarina sobre uma poça de luz
   suave, com a sombra dela, flutuando no céu de conto de fadas.
   ============================================================ */
const stage = new THREE.Group(); scene.add(stage);
{
  const shadowCatcher = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.ShadowMaterial({ opacity: .16, transparent: true, depthWrite: false, color: 0x5A2A5A }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = .002; shadowCatcher.receiveShadow = true; stage.add(shadowCatcher);
}
let curtain = null;

/* ============================================================
   O FUNDO: céu de entardecer (lilás, rosa e pêssego), um halo de
   luz atrás da bailarina e brilhos desfocados em várias distâncias.
   ============================================================ */
const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  vertexShader: "varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: `varying vec3 vP;void main(){float y=vP.y;
    vec3 top=vec3(.36,.27,.66),mid=vec3(.70,.47,.80),low=vec3(.95,.66,.78),hor=vec3(.99,.84,.80),bot=vec3(.93,.70,.82);
    vec3 c=mix(bot,hor,smoothstep(-.45,-.12,y));c=mix(c,low,smoothstep(-.1,.05,y));c=mix(c,mid,smoothstep(.05,.22,y));c=mix(c,top,smoothstep(.22,.6,y));
    float g=max(dot(vP,normalize(vec3(0.,.05,-1.))),0.);c+=vec3(1.,.88,.8)*(pow(g,30.)*.3);
    gl_FragColor=vec4(pow(c,vec3(2.2)),1.);
    #include <colorspace_fragment>
  }`,
}));
scene.add(sky);
const glowTex = canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, "rgba(255,246,236,.95)"); gr.addColorStop(.35, "rgba(255,214,228,.45)"); gr.addColorStop(1, "rgba(255,200,220,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }, false);
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, toneMapped: false, opacity: .5 }));
halo.scale.set(11, 11, 1); halo.position.set(0, 3.4, -9); scene.add(halo);
const bokehTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 34, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(.85, "rgba(255,255,255,.4)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, false);
const bokehS = [];
{ const cols = [0xFFC9DC, 0xFFE4B8, 0xE6D6FF, 0xFFFFFF, 0xF7B6CF];
  for (let i = 0; i < (MOB ? 16 : 26); i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: bokehTex, color: cols[i % 5], transparent: true, depthWrite: false, toneMapped: false, opacity: .25 + rnd() * .35 }));
    const z = -6 - rnd() * 26, sc = .6 + rnd() * 2.4 + (-z) * .04; sp.scale.set(sc, sc, 1);
    const p = new THREE.Vector3((rnd() - .5) * (16 + -z * 1.2), -1.5 + rnd() * (8 + -z * .35), z); sp.position.copy(p); scene.add(sp); bokehS.push({ sp, p, ph: rnd() * 6.28, sp2: .1 + rnd() * .2 });
  } }
const lamps = [];
const foots = [];
// nuvens rosadas baixas, perto do horizonte
const puffTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(.5, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, false);
const clouds = [];
for (let i = 0; i < 6; i++) {
  const cg = new THREE.Group(); cg.position.set((rnd() - .5) * 60, -3 + rnd() * 4, -26 - rnd() * 20); cg.scale.setScalar(3 + rnd() * 2);
  for (let j = 0; j < 4; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: j % 2 ? 0xFFE6EF : 0xFFF4EC, transparent: true, opacity: .55, depthWrite: false, toneMapped: false })); const ss = 1.6 + rnd() * 1.6; s.scale.set(ss * 1.9, ss * .75, 1); s.position.set(j * .9 - 1.4, rnd() * .4, rnd() * .3); cg.add(s); }
  scene.add(cg); clouds.push({ g: cg, sp: .06 + rnd() * .08, x: cg.position.x });
}

/* ============================================================
   A BAILARINA
   ============================================================ */
const DS = 2.25, K = DS / 1.38; // bailarina maior; K reescala alturas pensadas para o tamanho antigo
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
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.TorusGeometry(.06, .005, 6, 20, Math.PI * .8), M.bodice); st.position.set(s * .055, .31, 0); st.rotation.y = Math.PI / 2; st.rotation.z = s * .3; st.scale.set(1, 1.3, .9); J.spine.add(st); }
  const gemG = new THREE.OctahedronGeometry(.0055);
  for (let k = 0; k < 26; k++) { const y = .0 + (k % 9) * .03, x = ((k / 9 | 0) - 1) * .028 + (k % 2 ? .008 : -.008); const tp = torsoP.find(q => q[1] >= y); const r = (tp ? tp[0] : .08) + .007; if (Math.abs(x) > r) continue; const gm = new THREE.Mesh(gemG, M.gem); gm.position.set(x, y, Math.sqrt(r * r - x * x) * .76); J.spine.add(gm); }
}
const neck = lathe([[0, .37], [.036, .375], [.031, .42], [.029, .46], [0, .49]], M.skin); J.spine.add(neck);
J.head = new THREE.Group(); J.head.position.y = .455; J.head.scale.setScalar(1.3); J.spine.add(J.head);
const headC = new THREE.Vector3(0, .1, .006);
const head = sphere(.08, M.skin, 48, 32); head.scale.set(.88, 1.0, .95); head.position.copy(headC); J.head.add(head);
// queixo delicado
const chin = sphere(.05, M.skin, 32, 20); chin.scale.set(1.05, .78, .86); chin.position.copy(headC).add(new THREE.Vector3(0, -.03, .012)); J.head.add(chin);
{
  const E = new THREE.Vector3(.0688, .0848, .076);
  const onHead = (x, y, off = 0) => new THREE.Vector3(x, y, E.z * Math.sqrt(Math.max(0, 1 - (x / E.x) ** 2 - (y / E.y) ** 2)) + off).add(headC);
  const lashM = new THREE.MeshStandardMaterial({ color: 0x2a1515, roughness: .6 });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(.0115, .0017, 6, 18, Math.PI), lashM); eye.rotation.z = Math.PI; eye.rotation.y = s * .42; eye.position.copy(onHead(s * .026, .008, .0006)); J.head.add(eye);
    for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.0005, .001, .007, 4), lashM); l.position.copy(onHead(s * (.033 + k * .003), .0035 - k * .002, .0012)); l.rotation.z = s * (-.9 - k * .25); J.head.add(l); }
    const brow = new THREE.Mesh(new THREE.TorusGeometry(.016, .0012, 6, 18, Math.PI * .7), new THREE.MeshStandardMaterial({ color: 0x5a3426 })); brow.rotation.z = Math.PI * .15; brow.rotation.y = s * .42; brow.scale.x = s; brow.position.copy(onHead(s * .026, .03, .0006)); J.head.add(brow);
    const ch = new THREE.Mesh(new THREE.SphereGeometry(.014, 16, 10), new THREE.MeshBasicMaterial({ color: 0xF08A9E, transparent: true, opacity: .26, depthWrite: false })); ch.scale.set(1, .7, .35); ch.position.copy(onHead(s * .036, -.016, -.002)); ch.rotation.y = s * .5; J.head.add(ch);
  }
  const nose = sphere(.0068, M.skin, 12, 10); nose.scale.set(.85, 1.2, 1); nose.position.copy(onHead(0, -.008, -.0018)); J.head.add(nose);
  const lips = new THREE.Mesh(new THREE.SphereGeometry(.0065, 16, 10), phys({ color: 0xC9566E, roughness: .3, clearcoat: .9 })); lips.scale.set(1.5, .6, .55); lips.position.copy(onHead(0, -.031, -.001)); J.head.add(lips);
  for (const s of [-1, 1]) { const ear = sphere(.012, M.skin, 12, 8); ear.scale.set(.5, 1, .8); ear.position.copy(headC).add(new THREE.Vector3(s * .068, -.002, -.004)); J.head.add(ear); const er = new THREE.Mesh(new THREE.SphereGeometry(.0045, 8, 6), M.gem); er.position.copy(ear.position).add(new THREE.Vector3(s * .004, -.014, .002)); J.head.add(er); }
}
// cabelo preso em coque
const cap = SH(new THREE.Mesh(new THREE.SphereGeometry(.0835, 56, 28, 0, Math.PI * 2, 0, Math.PI * .55), M.hair)); cap.scale.set(.88, 1.06, .97); cap.rotation.x = -.6; cap.position.copy(headC).add(new THREE.Vector3(0, .003, -.004)); J.head.add(cap);
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
  const palm = sphere(.024, M.skin, 20, 14); palm.scale.set(.9, 1.7, .55); palm.position.y = -.034; wr.add(palm);
  const thumb = sphere(.009, M.skin, 12, 8); thumb.scale.set(.8, 1.8, .8); thumb.position.set(-s * .014, -.03, .006); thumb.rotation.z = -s * .5; wr.add(thumb);
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
  const shoe = lathe(limbProf(.145, .025, .015, t => .003 * Math.sin(Math.PI * t)), M.shoe, 32); shoe.scale.z = .9; an.add(shoe);
  const box = SH(new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .006, 16), M.shoe)); box.position.y = -.157; an.add(box);
  for (const r of [1.1, -1.1]) { const rb = SH(new THREE.Mesh(new THREE.TorusGeometry(.0205, .0024, 6, 28), M.shoe)); rb.rotation.x = r; rb.position.y = .006; an.add(rb); }
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
  window.dispatchEvent(new CustomEvent("reino-step", { detail: { step: name, state: "start" } }));
}
function playSeq(names) {
  const all = []; names.forEach((n, i) => { if (!STEPS[n]) return; STEPS[n].forEach((st, j) => { const c = st.slice(); if (j === 0) c[4] = n; if (j === STEPS[n].length - 1 && i < names.length - 1 && st[0] === "base") c[1] = .5; all.push(c); }); });
  if (!all.length) return; seq = all; busy = true; curStep = "coreografia"; nextSeg();
  window.dispatchEvent(new CustomEvent("reino-step", { detail: { step: "coreografia", state: "start" } }));
}
function nextSeg() {
  const s = seq.shift();
  if (s && s[4]) window.dispatchEvent(new CustomEvent("reino-sub", { detail: { step: s[4] } }));
  if (!s) { busy = false; seg = null; spin = 0; face = 0; window.dispatchEvent(new CustomEvent("reino-step", { detail: { step: curStep, state: "end" } })); return; }
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


/* ---------- luz de céu aberto ---------- */
scene.add(new THREE.HemisphereLight(0xF6F0FF, 0x8A6A9A, .7));
const sun = new THREE.DirectionalLight(0xFFEEDB, 1.6); sun.position.set(-5, 10, 7); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(MOB ? 1024 : 2048, MOB ? 1024 : 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 2, far: 30 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .02;
const fill = new THREE.DirectionalLight(0xC9B4FF, .6); fill.position.set(6, 3, 5); scene.add(fill);
const spot = new THREE.SpotLight(0xFFEBDD, 1.4, 0, .28, .7, 0); spot.position.set(1, 8, 5); spot.target.position.set(0, .9 * K, 0); scene.add(spot, spot.target);
const rimL = new THREE.SpotLight(0xFF9CC8, 7, 0, .45, .6, 0); rimL.position.set(-2.2, 3.2 * K, -1.4); rimL.target.position.set(0, 1.1 * K, 0); scene.add(rimL, rimL.target);

/* ---------- partículas ---------- */
const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,244,230,.8)"); gr.addColorStop(1, "rgba(255,230,210,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, false);
function pointsMat() {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
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
const orbs = makePoints(NOR, (i, A) => { A.position.set([(rnd() - .5) * 8, -1 + rnd() * 7, (rnd() - .5) * 8], i * 3); A.size[i] = .03 + rnd() * .06; A.ph[i] = rnd(); A.col.set(PAL[i % 3], i * 3); A.alpha[i] = .95; });
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
function sparkleBurst(y = 1.3, n = 60, tint = null) {
  const Pp = burst.geometry.attributes.position.array, A = burst.geometry.attributes.alpha.array, C = burst.geometry.attributes.col.array; let c = 0;
  for (let i = 0; i < NB && c < n; i++) {
    if (bLife[i] > 0) continue; c++;
    const a = Math.random() * 6.28, sp = .8 + Math.random() * 1.8;
    Pp[i * 3] = (Math.random() - .5) * .4; Pp[i * 3 + 1] = y * K + (Math.random() - .5) * .6 * K; Pp[i * 3 + 2] = (Math.random() - .5) * .4;
    bVel[i * 3] = Math.cos(a) * sp; bVel[i * 3 + 1] = .4 + Math.random() * 1.4; bVel[i * 3 + 2] = Math.sin(a) * sp; bLife[i] = 1.4 + Math.random() * .9; A[i] = 1;
    const pc = tint && c % 3 ? [tint.r, tint.g, tint.b] : PAL[i % 4]; C[i * 3] = pc[0]; C[i * 3 + 1] = pc[1]; C[i * 3 + 2] = pc[2];
  }
  burst.geometry.attributes.col.needsUpdate = true;
}

let composer = null, bokeh = null;
if (!MOB) {
  composer = new EffectComposer(R, new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, cam));
  try { bokeh = new BokehPass(scene, cam, { focus: 8, aperture: .0008, maxblur: .004 }); composer.addPass(bokeh); } catch (e) { bokeh = null; }
  composer.addPass(new OutputPass());
}
/* ---------- câmera: a maquete vista do alto, à direita do título ---------- */
let W = 1, H = 1, PORT = false, entered = true, pop = 0, whirl = -1;
const camS = { az: -.12, azT: -.12, dist: 15, distT: 11, ty: 6, tyT: 4.6, lk: .6, lkT: .6, px: 0, py: 0 };
let focus = true;
function setCamTargets() {
  if (focus) { camS.distT = PORT ? 7.6 : (W / H > 1.7 ? 9.2 : 9.9); camS.tyT = PORT ? 3.1 : 3.5; camS.lkT = PORT ? 1.85 : 1.95; }
  else { camS.distT = PORT ? 11.4 : (W / H > 1.7 ? 11.8 : 12.8); camS.tyT = PORT ? 4.6 : 4.8; camS.lkT = PORT ? 1.45 : 1.45; }
}
let inset = 0, offX = 0, offY = 0;
function applyOffset() { cam.clearViewOffset(); if (inset || offX || offY) cam.setViewOffset(W, H, offX, offY + inset * .55, W, H); cam.updateProjectionMatrix(); }
function resize() {
  const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); PORT = innerWidth < 860;
  R.setSize(W, H, false); cam.aspect = W / H; cam.fov = PORT ? 42 : 36;
  if (composer) { composer.setPixelRatio(R.getPixelRatio()); composer.setSize(W, H); }
  offX = PORT ? (W < 600 ? W * .14 : 0) : -W * .03; offY = PORT ? 0 : -H * .02;
  setCamTargets(); applyOffset();
  [orbs, burst, seqPts, seeds].forEach(p => p.material.uniforms.px.value = R.getPixelRatio());
}
addEventListener("resize", resize); resize();
camS.dist = camS.distT + 4; camS.ty = camS.tyT + 2; camS.lk = camS.lkT;

/* ---------- interação ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let look = { x: 0, y: 0 }, drag = null, turnT = 0, idleRot = 0;
const ev = (k) => window.dispatchEvent(new CustomEvent("reino-chime", { detail: { k } }));
const LAMPC = [0xFFE2B0, 0xFFB8D6, 0xC9B4FF, 0x9FE3FF];
cv.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, az: camS.azT, moved: false, t: performance.now(), type: e.pointerType }; });
addEventListener("pointermove", e => {
  const r = host.getBoundingClientRect(); look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - .5) * 2)); look.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - .5) * 2));
  if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) > 6) drag.moved = true;
  if (drag.moved && (drag.type !== "touch" || Math.abs(dx) > Math.abs(dy))) { camS.azT = Math.max(-1.3, Math.min(1.3, drag.az - dx * .006)); host.classList.add("dragged"); cv.classList.add("drag"); }
}, { passive: true });
addEventListener("pointerup", e => {
  cv.classList.remove("drag");
  if (!drag) return; const d = drag; drag = null;
  if (d.moved || performance.now() - d.t > 450) return;
  const r = cv.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, cam);
  const first = (o) => ray.intersectObject(o, true)[0];
  if (first(dancer)) { window.dispatchEvent(new CustomEvent("reino-tap")); return; }
  for (const l of lamps) { if (first(l.L)) { l.i = (l.i + 1) % LAMPC.length; const c = new THREE.Color(LAMPC[(l.i + lamps.indexOf(l)) % LAMPC.length]); l.lens.material.color.copy(c); l.cone.material.color.copy(c); l.sl.color.copy(c); seedBurst(l.L.getWorldPosition(new THREE.Vector3()).setY(1.6), 24, .6); ev("luz"); return; } }
  const hs = first(stage); if (hs) { seedBurst(hs.point, 24, .6); return; }
  const p = new THREE.Vector3(); ray.ray.at(10, p); seedBurst(p, 24);
});

/* ---------- API para a página ---------- */
const lighten = (hex, k) => new THREE.Color(hex).lerp(new THREE.Color(0xffffff), k);
const Reino = {
  play(name) { turnT = 0; play(name); },
  playSeq(list) { turnT = 0; playSeq(list); },
  setInset(px) { inset = px || 0; applyOffset(); },
  burst() { sparkleBurst(1.3, 80); },
  open() { }, close() { },
  wind(sec) { turnT = sec || 6; },
  focus(on) { focus = !!on; setCamTargets(); },
  isOpen: () => true,
  dress(kind, col) {
    const c = col ? new THREE.Color(col) : null; pop = 1;
    if (kind === "pele") { sparkleBurst(1.7, 70, c); if (!busy && whirl < 0) whirl = 0; }
    else if (kind === "tutu") { sparkleBurst(1.0, 110, c); if (!busy) whirl = 0; }
    else if (kind === "sapatilha") { sparkleBurst(.15, 80, c); if (!busy && whirl < 0) whirl = 0; }
    else if (kind === "pronta") { sparkleBurst(1.3, 200); if (!(busy && curStep === "reverence")) { busy = false; play("reverence"); } }
  },
  set(o) {
    if (o.pele) { M.skin.color.set(o.pele); M.tights.color.set(o.pele).lerp(new THREE.Color(0xF6C0C4), .35); }
    if (o.cabelo) M.hair.color.set(o.cabelo);
    if (o.tutu) { M.tutuA.color.copy(new THREE.Color(o.tutu)); M.tutuB.color.copy(lighten(o.tutu, .3)); M.tutuA.emissive.copy(M.tutuA.color); M.tutuB.emissive.copy(M.tutuB.color); M.bodice.color.copy(new THREE.Color(o.tutu)).multiplyScalar(.82); }
    if (o.sapatilha) M.shoe.color.set(o.sapatilha === "pele" ? (o.pele || "#E9B796") : o.sapatilha);
    if (o.enfeite) { tiara.visible = o.enfeite === "tiara"; flowers.visible = o.enfeite === "flores"; }
  },
  photo(nome) {
    render(performance.now());
    const c = document.createElement("canvas"); c.width = R.domElement.width; c.height = R.domElement.height; const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, "#7E6CC4"); gr.addColorStop(.55, "#E9A9C4"); gr.addColorStop(1, "#FBEFF2"); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(R.domElement, 0, 0);
    const s = c.width / 1200; g.fillStyle = "rgba(255,255,255,.7)"; g.fillRect(0, c.height - 120 * s, c.width, 120 * s);
    g.fillStyle = "#2A1236"; g.font = `800 ${50 * s}px "Big Shoulders Display", "Arial Narrow", sans-serif`; g.textAlign = "center";
    g.fillText((nome ? `BAILARINA ${nome}` : "MINHA BAILARINA").toUpperCase(), c.width / 2, c.height - 62 * s);
    g.font = `700 ${18 * s}px "Instrument Sans", sans-serif`; g.fillStyle = "#B8346A"; g.fillText("FORMAS ESCOLA DE DANÇA · formasescoladedanca.com.br", c.width / 2, c.height - 28 * s);
    return c.toDataURL("image/jpeg", .9);
  },
  plaque() { const v = new THREE.Vector3(0, 2.7 * K + .1, 0); v.project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; },
  debugCam(az, el, dist, ty) { if (az != null) camS.azT = camS.az = az; if (dist != null) camS.dist = camS.distT = dist; if (ty != null) camS.ty = camS.tyT = ty; },
  snapPose(name, f) { seq = []; seg = null; busy = true; JN.forEach(k => cur[k].copy(POSES[name][k])); face = f || 0; spin = 0; },
  instant() { camS.dist = camS.distT; camS.ty = camS.tyT; camS.lk = camS.lkT; camS.az = camS.azT; },
};
window.Reino = Reino;

/* ---------- laço ---------- */
let last = performance.now(), visible = true, tm = 0, idleW = 1;
const tmpV = new THREE.Vector3(), lq = new THREE.Quaternion(), le = new THREE.Euler();
const TAU = Math.PI * 2;
function render(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; tm += dt;
  // a maquete flutua
  const bob = Math.sin(tm * .7) * .08; stage.position.y = bob; dancerRoot.position.y = bob; 
  // bailarina
  stepAnim(dt);
  JN.forEach(k => J[k].quaternion.copy(cur[k]));
  const still = busy || turnT > 0 || whirl >= 0 ? 0 : 1; idleW += (still - idleW) * Math.min(1, dt * (still ? 1.5 : 6));
  { const b = Math.sin(tm * 1.6) * idleW; J.spine.quaternion.multiply(lq.setFromEuler(le.set(b * .012, 0, 0))); J.shR.quaternion.multiply(lq.setFromEuler(le.set(0, 0, b * .035))); J.shL.quaternion.multiply(lq.setFromEuler(le.set(0, 0, -b * .035))); }
  J.head.quaternion.multiply(lq.setFromEuler(le.set(look.y * .1, look.x * .3, 0, "YXZ")));
  if (busy) turnT = 0;
  let wx = 0; if (whirl >= 0) { whirl += dt / 1.15; if (whirl >= 1) whirl = -1; else wx = TAU * ease(whirl); }
  pop = Math.max(0, pop - dt * 2.4); dancerRoot.scale.setScalar(DS * (1 + .08 * Math.sin(pop * Math.PI)));
  if (turnT > 0) { turnT -= dt; idleRot += dt * Math.min(1.4, .4 + turnT * .5); }
  else { const tgt = Math.round(idleRot / TAU) * TAU; idleRot += (tgt - idleRot) * Math.min(1, dt * 1.6); }
  dancer.rotation.y = face + spin + idleRot + wx + Math.sin(tm * .4) * .15 * idleW + camS.az * .6;
  dancerRoot.updateMatrixWorld(true);
  let minY = Infinity; for (const m of markers) { m.getWorldPosition(tmpV); minY = Math.min(minY, tmpV.y); }
  pelvis.position.y += -(minY - bob - .004) / dancerRoot.scale.y;
  const spinning = (seg && seg.isSpin) || turnT > 0 || whirl >= 0 ? 1 : 0; flare += (spinning - flare) * Math.min(1, dt * (spinning ? 3 : 2));
  if (!REDUCE) updTutu(tm);
  { const sp = seqPts.geometry.attributes.position.array; seqData.forEach((d, i) => { const L = tutuLayers[d.l], rOut = L.rOut * (1 + .22 * flare), drop = L.drop * (1 - .75 * flare), r = L.rIn + (rOut - L.rIn) * d.t; sp[i * 3] = Math.cos(d.a) * r; sp[i * 3 + 1] = L.y0 - drop * Math.pow(d.t, 1.7) + .006; sp[i * 3 + 2] = Math.sin(d.a) * r * .97; }); seqPts.geometry.attributes.position.needsUpdate = true; }
  foots.forEach((f, i) => f.material.emissiveIntensity = 2 + Math.sin(tm * 3 + i) * .5);
  lamps.forEach((l, i) => l.cone.material.opacity = .085 + Math.sin(tm * 1.3 + i * 2) * .02);
  clouds.forEach(c => { c.g.position.x = c.x + Math.sin(tm * c.sp) * 1.2; });
  bokehS.forEach(b => { b.sp.position.set(b.p.x + Math.sin(tm * b.sp2 + b.ph) * .6, b.p.y + Math.sin(tm * b.sp2 * 1.3 + b.ph) * .4, b.p.z); });
  // câmera
  const k = Math.min(1, dt * .9);
  camS.dist += (camS.distT - camS.dist) * k; camS.ty += (camS.tyT - camS.ty) * k; camS.lk += (camS.lkT - camS.lk) * k;
  if (!drag) camS.azT += (-.12 - camS.azT) * .004;
  camS.az += (camS.azT - camS.az) * .07; camS.px += (look.x * .3 - camS.px) * .04; camS.py += (-look.y * .2 - camS.py) * .04;
  const d = camS.dist, az = camS.az + Math.sin(tm * .2) * .05;
  cam.position.set(Math.sin(az) * d + camS.px, camS.ty + camS.py, Math.cos(az) * d);
  cam.lookAt(0, camS.lk, 0);
  // brilhos
  const Po = orbs.geometry.attributes.position.array;
  for (let i = 0; i < NOR; i++) { Po[i * 3 + 1] += orbV[i] * dt; if (Po[i * 3 + 1] > 6) Po[i * 3 + 1] = -1; Po[i * 3] += Math.sin(tm * .3 + i) * .0015; }
  orbs.geometry.attributes.position.needsUpdate = true;
  const BP = burst.geometry.attributes.position.array, BA = burst.geometry.attributes.alpha.array;
  for (let i = 0; i < NB; i++) { if (bLife[i] <= 0) continue; bLife[i] -= dt; bVel[i * 3 + 1] -= .7 * dt; for (let q = 0; q < 3; q++) BP[i * 3 + q] += bVel[i * 3 + q] * dt * .7; BA[i] = Math.max(0, Math.min(1, bLife[i])); }
  burst.geometry.attributes.position.needsUpdate = true; burst.geometry.attributes.alpha.needsUpdate = true;
  const SP = seeds.geometry.attributes.position.array, SA = seeds.geometry.attributes.alpha.array;
  for (let i = 0; i < NS; i++) { if (sLife[i] <= 0) continue; sLife[i] -= dt; sVel[i * 3 + 1] -= .35 * dt; for (let q = 0; q < 3; q++) { sVel[i * 3 + q] *= .97; SP[i * 3 + q] += sVel[i * 3 + q] * dt * .6; } SA[i] = Math.max(0, Math.min(1, sLife[i] / 1.2)); }
  seeds.geometry.attributes.position.needsUpdate = true; seeds.geometry.attributes.alpha.needsUpdate = true;
  [orbs, burst, seqPts, seeds].forEach(p => p.material.uniforms.time.value = tm);
  if (bokeh) bokeh.uniforms.focus.value = cam.position.distanceTo(tmpV.set(0, 1.1 * K, 0));
  if (composer) composer.render(); else R.render(scene, cam);
  window.dispatchEvent(new Event("reino-frame"));
}
function loop(now) { if (visible) render(now); requestAnimationFrame(loop); }
new IntersectionObserver(es => { visible = es[0].isIntersecting; last = performance.now(); }).observe(host);
render(performance.now());
host.classList.add("ready3d");
window.dispatchEvent(new Event("reino-ready"));
requestAnimationFrame(loop);
