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
  tutuA: phys({ color: 0xE2B98A, roughness: .7, sheen: 1, sheenRoughness: .25, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
  tutuB: phys({ color: 0xF6E2C8, roughness: .7, sheen: 1, sheenRoughness: .25, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide }),
  shoe: phys({ color: 0xEFB3AC, roughness: .2, sheen: 1, sheenRoughness: .2, sheenColor: new THREE.Color(0xffffff), clearcoat: 1, clearcoatRoughness: .12 }),
  gem: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xFFE7C2, emissiveIntensity: 2.4, roughness: .1 }),
};
/* ============================================================
   A MAQUETE: um palco redondo flutuando no céu
   (como a serra dos Leopardos, mas é o palco da Formas)
   ============================================================ */
const stage = new THREE.Group(); stage.scale.setScalar(.8); scene.add(stage);
const woodTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = "#D6A375"; g.fillRect(0, 0, w, h);
  const N = 22, ph = h / N;
  for (let i = 0; i < N; i++) {
    const y = i * ph, off = (i % 3) * 170;
    for (let x = -off; x < w; x += 340 + (i * 37) % 120) {
      const l = 52 + ((i * 13 + x) % 9) * 1.2, c = `hsl(${26 + ((i * 7 + x) % 5)},${46 + (i % 4) * 3}%,${l}%)`;
      g.fillStyle = c; g.fillRect(x, y + 1, 340, ph - 2);
      g.fillStyle = "rgba(90,50,25,.35)"; g.fillRect(x, y, 2, ph);
      for (let k = 0; k < 6; k++) { g.strokeStyle = `rgba(120,70,35,${.06 + Math.random() * .06})`; g.lineWidth = 1; g.beginPath(); const yy = y + 4 + Math.random() * (ph - 8); g.moveTo(x, yy); g.bezierCurveTo(x + 90, yy + 2, x + 200, yy - 2, x + 340, yy + 1); g.stroke(); }
    }
    g.fillStyle = "rgba(70,38,18,.45)"; g.fillRect(0, y, w, 1.6);
  }
});
woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
const RS = 3.3;
{
  const wood = phys({ map: woodTex, roughness: .32, clearcoat: .7, clearcoatRoughness: .2, envMapIntensity: .6 });
  const floor = SH(new THREE.Mesh(new THREE.CylinderGeometry(RS, RS, .2, 128), [M.gold, wood, M.velvet]), true, true); floor.position.y = -.1; stage.add(floor);
  const rim = SH(new THREE.Mesh(new THREE.TorusGeometry(RS + .01, .055, 12, 160), M.gold)); rim.rotation.x = Math.PI / 2; rim.position.y = 0; stage.add(rim);
  // saia de veludo com pregas (o "corte" da maquete)
  const sk = new THREE.CylinderGeometry(RS + .02, 2.65, 1.45, 192, 6, true), sp = sk.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), z = sp.getZ(i), y = sp.getY(i), a = Math.atan2(z, x), t = (.725 - y) / 1.45, k = 1 + (.012 + .03 * t) * Math.sin(a * 56); sp.setX(i, x * k); sp.setZ(i, z * k); }
  sk.computeVertexNormals();
  const skirt = SH(new THREE.Mesh(sk, M.velvet)); skirt.position.y = -.2 - .725; stage.add(skirt);
  const band = SH(new THREE.Mesh(new THREE.TorusGeometry(2.66, .05, 10, 140), M.gold)); band.rotation.x = Math.PI / 2; band.position.y = -1.66; stage.add(band);
  // franja dourada
  const fr = new THREE.InstancedMesh(new THREE.ConeGeometry(.045, .26, 8), M.gold, 72), d = new THREE.Object3D();
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2; d.position.set(Math.cos(a) * 2.66, -1.82, Math.sin(a) * 2.66); d.rotation.set(Math.PI, 0, 0); d.updateMatrix(); fr.setMatrixAt(i, d.matrix); }
  fr.castShadow = true; stage.add(fr);
  const under = SH(new THREE.Mesh(new THREE.SphereGeometry(2.62, 64, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.lacquer)); under.scale.y = .32; under.position.y = -1.66; stage.add(under);
  const drop = SH(new THREE.Mesh(new THREE.ConeGeometry(.22, .7, 24), M.gold)); drop.rotation.x = Math.PI; drop.position.y = -2.7; stage.add(drop);
  // placa na frente
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.1, .5), phys({ color: 0xE9C27A, metalness: 1, roughness: .25, envMapIntensity: 1.2, map: canvasTex(840, 200, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "#C99A4E"); gr.addColorStop(.5, "#F6DDA8"); gr.addColorStop(1, "#C99A4E"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#8A6430"; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#4A2A1A"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = "800 92px 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif"; g.fillText("FORMAS", w / 2, h / 2 - 16);
    g.font = "700 30px 'Instrument Sans', Arial, sans-serif"; g.fillText("ESCOLA  DE  DANÇA", w / 2, h / 2 + 52);
  }) }));
  pl.position.set(0, -.72, 3.12); pl.rotation.x = .41; stage.add(pl);
}
let curtain = null;

/* ============================================================
   O FUNDO: céu bem claro com castelos de conto de fadas ao longe
   ============================================================ */
scene.fog = new THREE.Fog(new THREE.Color().setRGB(.96, .86, .91, THREE.LinearSRGBColorSpace), 30, 150);
const sky = new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
  uniforms: { fogC: { value: scene.fog.color } },
  vertexShader: "varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: `uniform vec3 fogC;varying vec3 vP;void main(){float y=vP.y;
    vec3 c=mix(fogC,vec3(.86,.8,.98),smoothstep(.02,.45,y));c=mix(c,vec3(.72,.7,.96),smoothstep(.45,1.,y));
    vec3 sd=normalize(vec3(.4,.15,-1.));float s=max(dot(vP,sd),0.);c+=vec3(1.,.86,.72)*(pow(s,12.)*.25+pow(s,3.)*.05);
    gl_FragColor=vec4(c,1.);
    #include <colorspace_fragment>
  }`,
}));
scene.add(sky);
const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.MeshStandardMaterial({ color: 0xF4E4EC, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -7; ground.receiveShadow = false; scene.add(ground);
const CM = {
  wall: new THREE.MeshStandardMaterial({ color: 0xFFF7FA, roughness: .85 }),
  wall2: new THREE.MeshStandardMaterial({ color: 0xEFE0F2, roughness: .85 }),
  roofP: new THREE.MeshStandardMaterial({ color: 0xE77FA8, roughness: .55 }),
  roofL: new THREE.MeshStandardMaterial({ color: 0xA98BE0, roughness: .55 }),
  roofG: new THREE.MeshStandardMaterial({ color: 0xE9C27A, roughness: .35, metalness: .6 }),
  win: new THREE.MeshStandardMaterial({ color: 0xFFE7B0, emissive: 0xFFC56E, emissiveIntensity: .9 }),
};
function tower(r, hgt, roof) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, hgt, 24), CM.wall); b.position.y = hgt / 2; g.add(b);
  const cr = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.14, r * 1.14, r * .35, 24), CM.wall2); cr.position.y = hgt + r * .17; g.add(cr);
  const cn = new THREE.Mesh(new THREE.ConeGeometry(r * 1.2, r * 2.6, 24), roof); cn.position.y = hgt + r * .35 + r * 1.3; g.add(cn);
  const sp = new THREE.Mesh(new THREE.ConeGeometry(r * .08, r * .9, 8), CM.roofG); sp.position.y = hgt + r * .35 + r * 2.6 + r * .3; g.add(sp);
  for (let k = 0; k < 2; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(r * .32, r * .55), CM.win); w.position.set(0, hgt * (.45 + k * .28), r * 1.01); g.add(w); }
  return g;
}
function castle(x, z, sc, rot) {
  const c = new THREE.Group(); c.position.set(x, -7, z); c.scale.setScalar(sc); c.rotation.y = rot || 0; scene.add(c);
  const keep = new THREE.Mesh(new THREE.BoxGeometry(5, 5.5, 3.6), CM.wall); keep.position.y = 2.75; c.add(keep);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(3.4, 3.2, 4), CM.roofP); kr.position.y = 7.1; kr.rotation.y = Math.PI / 4; kr.scale.z = .75; c.add(kr);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.8), CM.roofL); door.position.set(0, .9, 1.81); c.add(door);
  for (let k = -1; k <= 1; k += 2) { const w = new THREE.Mesh(new THREE.PlaneGeometry(.6, .9), CM.win); w.position.set(k * 1.4, 3.5, 1.81); c.add(w); }
  const T = [[-3.1, 0, 1.6, 9, CM.roofL], [3.1, 0, 1.6, 9, CM.roofL], [-1.6, -1.4, 1.1, 11.5, CM.roofP], [1.7, -1.5, 1.2, 12.5, CM.roofP], [0, -2.2, 1.5, 14.5, CM.roofL]];
  for (const t of T) { const tw = tower(t[2] * .55, t[3], t[4]); tw.position.set(t[0], 0, t[1]); c.add(tw); }
  const wall = new THREE.Mesh(new THREE.BoxGeometry(11, 2.6, .8), CM.wall2); wall.position.set(0, 1.3, 2.6); c.add(wall);
  for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .8), CM.wall2); m.position.set(-4.8 + k * 1.2, 2.9, 2.6); c.add(m); }
  return c;
}
castle(4, -40, 1.5, -.1);
castle(30, -58, 1.2, -.35);
castle(-26, -54, 1.1, .35);
castle(52, -38, .8, -.6);
castle(-48, -36, .75, .5);
// colinas suaves
for (const [x, z, r, sy] of [[-30, -50, 26, .32], [18, -58, 30, .28], [50, -45, 22, .3], [-55, -38, 20, .35], [0, -70, 40, .22]]) {
  const hl = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xEFE3F2, roughness: 1 })); hl.scale.y = sy; hl.position.set(x, -7.2, z); scene.add(hl);
}
// barra de balé, à esquerda
{
  const wood2 = phys({ color: 0xB07A4E, roughness: .4, clearcoat: .6 });
  const A = new THREE.Vector3(-2.75, 0, -.2), B = new THREE.Vector3(-1.75, 0, -2.15);
  for (const P of [A, B]) { const post = SH(new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, 1.15, 12), M.gold)); post.position.copy(P).setY(.575); stage.add(post); const ft = SH(new THREE.Mesh(new THREE.CylinderGeometry(.13, .15, .05, 20), M.gold)); ft.position.copy(P).setY(.025); stage.add(ft); }
  const mid = A.clone().add(B).multiplyScalar(.5), len = A.distanceTo(B);
  for (const y of [1.05, .72]) { const bar = SH(new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, len + .2, 16), wood2)); bar.position.copy(mid).setY(y); bar.lookAt(B.clone().setY(y)); bar.rotateX(Math.PI / 2); stage.add(bar); }
}
// buquê de rosas na beira do palco
const bouquet = new THREE.Group(); bouquet.position.set(2.05, 0, 2.1); bouquet.rotation.z = -.35; stage.add(bouquet);
{
  const paper = SH(new THREE.Mesh(new THREE.ConeGeometry(.2, .62, 18, 1, true), phys({ color: 0xFFF4EE, roughness: .6, side: THREE.DoubleSide }))); paper.rotation.z = Math.PI; paper.position.y = .3; bouquet.add(paper);
  const bow = SH(new THREE.Mesh(new THREE.TorusGeometry(.09, .03, 8, 20), M.velvet)); bow.position.y = .2; bow.rotation.x = Math.PI / 2; bouquet.add(bow);
  const RC = [0xE8456F, 0xF28CA8, 0xFFD1DC, 0xE8456F, 0xC2185B, 0xF7A8BD, 0xFFFFFF];
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; const r = sphere(.085, phys({ color: RC[i], roughness: .5, sheen: 1, sheenColor: new THREE.Color(0xffffff) }), 14, 10); r.position.set(Math.cos(a) * .1 * (i ? 1 : 0), .66 + (i ? 0 : .06), Math.sin(a) * .1 * (i ? 1 : 0)); r.scale.y = .8; bouquet.add(r); }
  for (let i = 0; i < 5; i++) { const lf = sphere(.06, M.leaf, 10, 8); const a = i * 1.3; lf.scale.set(.5, 1.4, .3); lf.position.set(Math.cos(a) * .17, .58, Math.sin(a) * .17); lf.rotation.z = Math.cos(a) * .8; bouquet.add(lf); }
}
const lamps = [];
// luzinhas da ribalta
const foots = [];
for (let i = 0; i < 11; i++) { const a = Math.PI * (.22 + i / 10 * .56); const b = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), new THREE.MeshStandardMaterial({ color: 0xFFF3CF, emissive: 0xFFC56E, emissiveIntensity: 2.4 })); b.position.set(Math.cos(a) * (RS - .1), .05, Math.sin(a) * (RS - .1)); stage.add(b); foots.push(b); }
// nuvens fofas em volta da maquete
const puffTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, "rgba(255,255,255,.95)"); gr.addColorStop(.5, "rgba(255,255,255,.5)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, false);
const clouds = [];
for (let i = 0; i < 7; i++) {
  const cg = new THREE.Group(); cg.position.set((rnd() - .5) * 70, 2 + rnd() * 12, -24 - rnd() * 30); cg.scale.setScalar(3 + rnd() * 2);
  for (let j = 0; j < 4; j++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: .7, depthWrite: false, fog: true })); const ss = 1.6 + rnd() * 1.6; s.scale.set(ss * 1.8, ss * .8, 1); s.position.set(j * .9 - 1.4, rnd() * .4, rnd() * .3); cg.add(s); }
  scene.add(cg); clouds.push({ g: cg, sp: .08 + rnd() * .1, x: cg.position.x });
}

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
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.TorusGeometry(.06, .005, 6, 20, Math.PI * .8), M.bodice); st.position.set(s * .055, .31, 0); st.rotation.y = Math.PI / 2; st.rotation.z = s * .3; st.scale.set(1, 1.3, .9); J.spine.add(st); }
  const gemG = new THREE.OctahedronGeometry(.0055);
  for (let k = 0; k < 26; k++) { const y = .0 + (k % 9) * .03, x = ((k / 9 | 0) - 1) * .028 + (k % 2 ? .008 : -.008); const tp = torsoP.find(q => q[1] >= y); const r = (tp ? tp[0] : .08) + .007; if (Math.abs(x) > r) continue; const gm = new THREE.Mesh(gemG, M.gem); gm.position.set(x, y, Math.sqrt(r * r - x * x) * .76); J.spine.add(gm); }
}
const neck = lathe([[0, .37], [.032, .375], [.027, .43], [.024, .48], [0, .5]], M.skin); J.spine.add(neck);
J.head = new THREE.Group(); J.head.position.y = .47; J.head.scale.setScalar(1.08); J.spine.add(J.head);
const headC = new THREE.Vector3(0, .1, .006);
const head = sphere(.08, M.skin, 48, 32); head.scale.set(.86, 1.06, .95); head.position.copy(headC); J.head.add(head);
// queixo delicado
const chin = sphere(.045, M.skin, 24, 16); chin.scale.set(1, .9, .9); chin.position.copy(headC).add(new THREE.Vector3(0, -.045, .028)); J.head.add(chin);
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
  sh.add(sphere(.028, M.skin));
  sh.add(lathe(limbProf(.25, .032, .021, t => .003 * Math.sin(Math.PI * t)), M.skin, 28));
  const el = new THREE.Group(); el.position.y = -.25; sh.add(el);
  el.add(sphere(.018, M.skin, 16, 12));
  el.add(lathe(limbProf(.22, .021, .013, t => .0025 * Math.sin(Math.PI * t * .8)), M.skin, 28));
  const wr = new THREE.Group(); wr.position.y = -.22; el.add(wr);
  const palm = lathe(limbProf(.055, .012, .009), M.skin, 20); palm.scale.set(1.1, 1, .5); wr.add(palm);
  for (let k = 0; k < 4; k++) { const f = lathe(limbProf(.04 - Math.abs(k - 1.5) * .004, .0035, .0025), M.skin, 10); f.position.set((k - 1.5) * .0055, -.055, 0); f.rotation.z = (k - 1.5) * .08; wr.add(f); }
  J["sh" + side] = sh; J["el" + side] = el; J["wr" + side] = wr;
}
arm("R"); arm("L");
// pernas e sapatilhas de ponta
const markers = [];
function leg(side) {
  const s = side === "R" ? 1 : -1;
  const hip = new THREE.Group(); hip.position.set(.052 * s, -.035, 0); pelvis.add(hip);
  hip.add(lathe(limbProf(.4, .064, .038, t => .006 * Math.sin(Math.PI * t * .9)), M.tights, 32));
  const kn = new THREE.Group(); kn.position.y = -.4; hip.add(kn);
  kn.add(sphere(.032, M.tights, 20, 14));
  kn.add(lathe(limbProf(.38, .038, .021, t => .012 * Math.exp(-(((t - .27) / .17) ** 2))), M.tights, 32));
  const an = new THREE.Group(); an.position.y = -.38; kn.add(an);
  const shoe = lathe(limbProf(.145, .021, .013, t => .002 * Math.sin(Math.PI * t)), M.shoe, 28); shoe.scale.z = .9; an.add(shoe);
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
    const L = { rIn: .074, rOut: .46 - k * .09, drop: .28 - k * .15, y0: k * .022, seed: l * 1.9, RS, RR, l, amp: .011 + (1 - k) * .006, freq: 9 + (l % 3) * 2 };
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
  if (!s) { busy = false; seg = null; spin = spin % (Math.PI * 2); window.dispatchEvent(new CustomEvent("reino-step", { detail: { step: curStep, state: "end" } })); return; }
  from = snap(); const o = s[3] || {};
  seg = { pose: POSES[s[0]], d: s[1], hold: s[2], face: o.face != null ? o.face : from.face, spin: from.spin + (o.spin ? o.spin * Math.PI * 2 : 0), isSpin: !!o.spin };
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
const spot = new THREE.SpotLight(0xFFEBDD, 1.4, 0, .28, .7, 0); spot.position.set(1, 8, 5); spot.target.position.set(0, .9, 0); scene.add(spot, spot.target);
const rimL = new THREE.SpotLight(0xFF9CC8, 7, 0, .45, .6, 0); rimL.position.set(-2.2, 3.2, -1.6); rimL.target.position.set(0, 1.1, 0); scene.add(rimL, rimL.target);

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
    Pp[i * 3] = (Math.random() - .5) * .4; Pp[i * 3 + 1] = y + (Math.random() - .5) * .6; Pp[i * 3 + 2] = (Math.random() - .5) * .4;
    bVel[i * 3] = Math.cos(a) * sp; bVel[i * 3 + 1] = .4 + Math.random() * 1.4; bVel[i * 3 + 2] = Math.sin(a) * sp; bLife[i] = 1.4 + Math.random() * .9; A[i] = 1;
    const pc = tint && c % 3 ? [tint.r, tint.g, tint.b] : PAL[i % 4]; C[i * 3] = pc[0]; C[i * 3 + 1] = pc[1]; C[i * 3 + 2] = pc[2];
  }
  burst.geometry.attributes.col.needsUpdate = true;
}

let composer = null, bokeh = null;
if (!MOB) {
  composer = new EffectComposer(R, new THREE.WebGLRenderTarget(256, 256, { type: THREE.HalfFloatType, samples: 4 }));
  composer.addPass(new RenderPass(scene, cam));
  try { bokeh = new BokehPass(scene, cam, { focus: 8, aperture: .0012, maxblur: .007 }); composer.addPass(bokeh); } catch (e) { bokeh = null; }
  composer.addPass(new OutputPass());
}
/* ---------- câmera: a maquete vista do alto, à direita do título ---------- */
let W = 1, H = 1, PORT = false, entered = true, pop = 0, whirl = -1;
const camS = { az: -.12, azT: -.12, dist: 15, distT: 11, ty: 6, tyT: 4.6, lk: .6, lkT: .6, px: 0, py: 0 };
let focus = true;
function setCamTargets() {
  if (focus) { camS.distT = PORT ? 6.8 : (W / H > 1.7 ? 8.4 : 9); camS.tyT = PORT ? 2.6 : 3.1; camS.lkT = PORT ? 1.2 : 1.3; }
  else { camS.distT = PORT ? 10 : (W / H > 1.7 ? 10.5 : 11.5); camS.tyT = PORT ? 4.2 : 4.4; camS.lkT = PORT ? .8 : .8; }
}
let inset = 0, offX = 0, offY = 0;
function applyOffset() { cam.clearViewOffset(); if (inset || offX || offY) cam.setViewOffset(W, H, offX, offY + inset * .55, W, H); cam.updateProjectionMatrix(); }
function resize() {
  const r = cv.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); PORT = innerWidth < 860;
  R.setSize(W, H, false); cam.aspect = W / H; cam.fov = PORT ? 42 : 36;
  if (composer) { composer.setPixelRatio(R.getPixelRatio()); composer.setSize(W, H); }
  offX = PORT ? 0 : -W * .03; offY = PORT ? 0 : -H * .02;
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
  const hb = first(bouquet); if (hb) { seedBurst(hb.point, 50, .8); ev("flores"); return; }
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
    else if (kind === "pronta") { sparkleBurst(1.3, 200); seq = []; seg = null; busy = false; play("reverence"); }
  },
  set(o) {
    if (o.pele) { M.skin.color.set(o.pele); M.tights.color.set(o.pele).lerp(new THREE.Color(0xF6C0C4), .35); }
    if (o.cabelo) M.hair.color.set(o.cabelo);
    if (o.tutu) { M.tutuA.color.copy(new THREE.Color(o.tutu)); M.tutuB.color.copy(lighten(o.tutu, .3)); M.bodice.color.copy(new THREE.Color(o.tutu)).multiplyScalar(.82); }
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
  plaque() { const v = new THREE.Vector3(0, 2.7, 0); v.project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; },
  debugCam(az, el, dist, ty) { if (az != null) camS.azT = camS.az = az; if (dist != null) camS.dist = camS.distT = dist; if (ty != null) camS.ty = camS.tyT = ty; },
  snapPose(name, f) { seq = []; seg = null; busy = true; JN.forEach(k => cur[k].copy(POSES[name][k])); face = f || 0; spin = 0; },
  instant() { camS.dist = camS.distT; camS.ty = camS.tyT; camS.lk = camS.lkT; camS.az = camS.azT; },
};
window.Reino = Reino;

/* ---------- laço ---------- */
let last = performance.now(), visible = true, tm = 0, firstG = true;
const tmpV = new THREE.Vector3(), lq = new THREE.Quaternion(), le = new THREE.Euler();
const TAU = Math.PI * 2;
function render(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; tm += dt;
  // a maquete flutua
  const bob = Math.sin(tm * .7) * .08; stage.position.y = bob; dancerRoot.position.y = bob; stage.rotation.z = Math.sin(tm * .5) * .008;
  // bailarina
  stepAnim(dt);
  JN.forEach(k => J[k].quaternion.copy(cur[k]));
  if (!busy) { const b = Math.sin(tm * 1.6); J.spine.quaternion.multiply(lq.setFromEuler(le.set(b * .012, 0, 0))); J.shR.quaternion.multiply(lq.setFromEuler(le.set(0, 0, b * .035))); J.shL.quaternion.multiply(lq.setFromEuler(le.set(0, 0, -b * .035))); }
  J.head.quaternion.multiply(lq.setFromEuler(le.set(look.y * .1, look.x * .3, 0, "YXZ")));
  if (busy) { turnT = 0; whirl = -1; }
  let wx = 0; if (whirl >= 0) { whirl += dt / 1.15; if (whirl >= 1) whirl = -1; else wx = TAU * ease(whirl); }
  pop = Math.max(0, pop - dt * 2.4); dancerRoot.scale.setScalar(DS * (1 + .08 * Math.sin(pop * Math.PI)));
  if (turnT > 0) { turnT -= dt; idleRot += dt * Math.min(1.4, .4 + turnT * .5); }
  else { const tgt = Math.round(idleRot / TAU) * TAU; idleRot += (tgt - idleRot) * Math.min(1, dt * 1.6); }
  dancer.rotation.y = face + spin + idleRot + wx + (busy || turnT > 0 || whirl >= 0 ? 0 : Math.sin(tm * .4) * .15) + camS.az * .6;
  dancerRoot.updateMatrixWorld(true);
  let minY = Infinity; for (const m of markers) { m.getWorldPosition(tmpV); minY = Math.min(minY, tmpV.y); }
  pelvis.position.y += (-(minY - bob - .004) / DS) * (firstG ? 1 : .35); firstG = false;
  const spinning = (seg && seg.isSpin) || turnT > 0 || whirl >= 0 ? 1 : 0; flare += (spinning - flare) * Math.min(1, dt * (spinning ? 3 : 2));
  if (!REDUCE) updTutu(tm);
  { const sp = seqPts.geometry.attributes.position.array; seqData.forEach((d, i) => { const L = tutuLayers[d.l], rOut = L.rOut * (1 + .22 * flare), drop = L.drop * (1 - .75 * flare), r = L.rIn + (rOut - L.rIn) * d.t; sp[i * 3] = Math.cos(d.a) * r; sp[i * 3 + 1] = L.y0 - drop * Math.pow(d.t, 1.7) + .006; sp[i * 3 + 2] = Math.sin(d.a) * r * .97; }); seqPts.geometry.attributes.position.needsUpdate = true; }
  foots.forEach((f, i) => f.material.emissiveIntensity = 2 + Math.sin(tm * 3 + i) * .5);
  lamps.forEach((l, i) => l.cone.material.opacity = .085 + Math.sin(tm * 1.3 + i * 2) * .02);
  clouds.forEach(c => { c.g.position.x = c.x + Math.sin(tm * c.sp) * 1.2; });
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
  if (bokeh) bokeh.uniforms.focus.value = cam.position.distanceTo(tmpV.set(0, 1.1, 0));
  if (composer) composer.render(); else R.render(scene, cam);
  window.dispatchEvent(new Event("reino-frame"));
}
function loop(now) { if (visible) render(now); requestAnimationFrame(loop); }
new IntersectionObserver(es => { visible = es[0].isIntersecting; last = performance.now(); }).observe(host);
render(performance.now());
host.classList.add("ready3d");
window.dispatchEvent(new Event("reino-ready"));
requestAnimationFrame(loop);
