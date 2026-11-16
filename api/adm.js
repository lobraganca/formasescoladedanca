import crypto from "node:crypto";
import { dbReady, dbMissing, pipeline, dayKey, V, credOk, falhasLogin, limparFalhas } from "./_db.js";
import { vapid, notify } from "./_push.js";

// Área da Irene (/adm). Tudo aqui pede login (ou o código "manter conectado").
//  login  → confere login e senha e devolve um código de sessão
//  load   → dados da escola + fila de espera + pedidos do Camarim + contatos do site
//  save   → grava a escola (alunos, turmas, chamadas, mensalidades) e a parte pública do site
//  espera / pedido / lead → atualiza um item dessas listas
//  foto / apagaFoto → fotos do site e do Camarim
//  stats  → acessos ao site
const HASH = { lead: "fm:leads", espera: "fm:espera", pedido: "fm:pedidos" };
const MAXIMG = 1_400_000;
const safe = (s) => { try { return JSON.parse(s); } catch { return null; } };
const clean = (v, n) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const toObj = (a, raw) => { const o = {}; if (Array.isArray(a)) for (let i = 0; i < a.length; i += 2) o[a[i]] = raw ? a[i + 1] : (+a[i + 1] || 0); else if (a) Object.assign(o, a); return o; };
const sumInto = (acc, o) => { for (const [k, v] of Object.entries(o)) acc[k] = (acc[k] || 0) + (+v || 0); return acc; };
const isDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || ""));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try { return await main(req, res); }
  catch (e) { return res.status(500).json({ ok: false, erro: String((e && e.message) || e) }); }
}

async function main(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b || "{}"); } catch { b = {}; } }
  b = b || {};
  if (!dbReady()) return res.status(503).json({ ok: false, semBanco: true, erro: `O banco ainda não foi conectado na Vercel (falta ${dbMissing()}). Veja o passo a passo no LEIA-ME.` });

  const ip = String(req.headers["x-forwarded-for"] || "?").split(",")[0].trim();
  const tok = String(b.tok || "").replace(/[^a-f0-9]/g, "").slice(0, 64);

  // ---- entrar
  if (b.acao === "login") {
    if ((await falhasLogin(ip)) >= 8) return res.status(429).json({ ok: false, erro: "Muitas tentativas. Espere 15 minutos." });
    if (!credOk(b.user, b.pass)) { await falhasLogin(ip, true); return res.status(401).json({ ok: false, erro: "Login ou senha incorretos." }); }
    await limparFalhas(ip);
    const t = crypto.randomBytes(32).toString("hex");
    await pipeline([["SET", `fm:sess:${t}`, "1", "EX", b.lembrar ? 60 * 60 * 24 * 90 : 60 * 60 * 12]]);
    return res.status(200).json({ ok: true, tok: t });
  }
  // ---- daqui para baixo, só com sessão válida
  if (tok.length !== 64) return res.status(401).json({ ok: false, sair: true, erro: "Entre de novo." });
  const [okSess, ttl] = await pipeline([["GET", `fm:sess:${tok}`], ["TTL", `fm:sess:${tok}`]]);
  if (!okSess) return res.status(401).json({ ok: false, sair: true, erro: "Sua sessão expirou. Entre de novo." });
  if (+ttl > 60 * 60 * 24) await pipeline([["EXPIRE", `fm:sess:${tok}`, 60 * 60 * 24 * 90]]);

  if (b.acao === "sair") { await pipeline([["DEL", `fm:sess:${tok}`]]); return res.status(200).json({ ok: true }); }

  if (b.acao === "load") {
    const [esc, rev, site, le, es, pe] = await pipeline([["GET", "fm:escola"], ["GET", "fm:rev"], ["GET", "fm:site"], ["HVALS", "fm:leads"], ["HVALS", "fm:espera"], ["HVALS", "fm:pedidos"]]);
    const list = (a) => (a || []).map(safe).filter(Boolean).sort((x, y) => (x.quando < y.quando ? -1 : 1));
    return res.status(200).json({ ok: true, escola: safe(esc), rev: +rev || 0, site: safe(site), leads: list(le), espera: list(es), pedidos: list(pe) });
  }

  if (b.acao === "save") {
    const e = b.escola, s = b.site;
    if (!e || !Array.isArray(e.alunos) || !Array.isArray(e.turmas) || !s || !Array.isArray(s.turmas)) return res.status(400).json({ ok: false, erro: "dados" });
    const [rev] = await pipeline([["GET", "fm:rev"]]);
    if (!b.forcar && (+rev || 0) !== (+b.rev || 0)) {
      const [esc] = await pipeline([["GET", "fm:escola"]]);
      return res.status(409).json({ ok: false, conflito: true, rev: +rev || 0, escola: safe(esc) });
    }
    const es = JSON.stringify(e), ss = JSON.stringify(s);
    if (es.length > 4_000_000 || ss.length > 900_000) return res.status(413).json({ ok: false, erro: "grande" });
    const hoje = new Date().toISOString().slice(0, 10);
    const r = await pipeline([["SET", "fm:escola", es], ["SET", "fm:site", ss], ["INCR", "fm:rev"], ["SET", `fm:backup:${hoje}`, es, "EX", 60 * 60 * 24 * 45]]);
    return res.status(200).json({ ok: true, rev: +r[2] });
  }

  if (HASH[b.acao]) {
    const key = HASH[b.acao];
    const it = b.item || {};
    const id = clean(it.id || b.id, 40).replace(/[^\w-]/g, "");
    if (!id) return res.status(400).json({ ok: false });
    if (b.op === "del") {
      await pipeline([["HDEL", key, id], ["SET", `fm:x:${id}`, "1", "EX", 60 * 60 * 24 * 180]]);
      return res.status(200).json({ ok: true });
    }
    const s = JSON.stringify({ ...it, id });
    if (s.length > 4000) return res.status(413).json({ ok: false });
    await pipeline([["HSET", key, id, s]]);
    return res.status(200).json({ ok: true });
  }

  // ---- avisos no celular
  if (b.acao === "pushKey") { const k = await vapid(); return res.status(200).json({ ok: true, key: k.publicKey }); }
  if (b.acao === "pushSub") {
    const sub = b.sub || {};
    if (!/^https:\/\//.test(String(sub.endpoint || "")) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) return res.status(400).json({ ok: false });
    const id = crypto.createHash("sha256").update(String(sub.endpoint)).digest("hex").slice(0, 24);
    await pipeline([["HSET", "fm:push", id, JSON.stringify({ sub: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } }, quando: new Date().toISOString(), ap: clean(b.ap, 60) })]]);
    return res.status(200).json({ ok: true });
  }
  if (b.acao === "pushOff") {
    const id = crypto.createHash("sha256").update(String(b.endpoint || "")).digest("hex").slice(0, 24);
    await pipeline([["HDEL", "fm:push", id]]);
    return res.status(200).json({ ok: true });
  }
  if (b.acao === "pushTeste") { const n = await notify("Avisos ligados ✦", "É assim que vão chegar os pedidos e contatos do site.", "/adm"); return res.status(200).json({ ok: true, n }); }

  if (b.acao === "foto") {
    const m = /^data:(image\/(?:jpeg|webp|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.img || ""));
    if (!m) return res.status(400).json({ ok: false, erro: "formato" });
    if (m[2].length > MAXIMG) return res.status(413).json({ ok: false, erro: "grande" });
    const id = crypto.randomBytes(8).toString("hex");
    await pipeline([["HSET", `fm:foto:${id}`, "t", m[1], "b", m[2], "criado", String(Date.now())]]);
    return res.status(200).json({ ok: true, src: `/api/foto?id=${id}` });
  }
  if (b.acao === "apagaFoto") {
    const id = clean(b.id, 20).replace(/[^a-f0-9]/g, "");
    if (id) await pipeline([["DEL", `fm:foto:${id}`]]);
    return res.status(200).json({ ok: true });
  }

  if (b.acao === "stats") {
    let to = isDay(b.ate) ? b.ate : dayKey();
    let from = isDay(b.de) ? b.de : dayKey(new Date(Date.now() - 29 * 864e5));
    if (from > to) [from, to] = [to, from];
    const days = [];
    for (let d = new Date(from + "T12:00:00Z"); d <= new Date(to + "T12:00:00Z") && days.length < 400; d = new Date(d.getTime() + 864e5)) days.push(d.toISOString().slice(0, 10));
    const per = ["day", "dev", "src", "pais", "estado", "cidade", "ret", "item_turma", "item_espera", "item_loja"];
    const cmds = [["PFCOUNT", `${V}uniq:all`], ["PFCOUNT", ...days.map((d) => `${V}uniq:${d}`)]];
    days.forEach((d) => { cmds.push(["PFCOUNT", `${V}uniq:${d}`]); per.forEach((p) => cmds.push(["HGETALL", `${V}${p}:${d}`])); });
    const r = await pipeline(cmds);
    const out = { ok: true, de: from, ate: to, pessoasTotal: +r[0] || 0, pessoasPeriodo: +r[1] || 0, dias: [], dispositivo: {}, origem: {}, pais: {}, estado: {}, cidade: {}, retorno: {}, turmas: {}, espera: {}, loja: {} };
    let i = 2;
    for (const d of days) {
      const pessoas = +r[i++] || 0;
      const parts = per.map(() => toObj(r[i++]));
      out.dias.push({ dia: d, pessoas, ...parts[0] });
      sumInto(out.dispositivo, parts[1]); sumInto(out.origem, parts[2]); sumInto(out.pais, parts[3]);
      sumInto(out.estado, parts[4]); sumInto(out.cidade, parts[5]); sumInto(out.retorno, parts[6]);
      sumInto(out.turmas, parts[7]); sumInto(out.espera, parts[8]); sumInto(out.loja, parts[9]);
    }
    out.agora = new Date().toISOString();
    return res.status(200).json(out);
  }
  return res.status(400).json({ ok: false, erro: "acao" });
}
