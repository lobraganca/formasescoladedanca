import { pipeline } from "./_db.js";

// Avisos no celular da Irene (Web Push). As chaves são criadas sozinhas na primeira vez
// e ficam guardadas no banco (fm:vapid). Cada celular que ligou os avisos fica em fm:push.
const safe = (s) => { try { return JSON.parse(s); } catch { return null; } };
// carregado só quando precisa: se der qualquer problema, o resto da área da Irene continua funcionando
let WP = null;
const wp = async () => (WP || (WP = (await import("web-push")).default));

export async function vapid() {
  let [raw] = await pipeline([["GET", "fm:vapid"]]);
  let k = safe(raw);
  if (!k || !k.publicKey) {
    const n = (await wp()).generateVAPIDKeys();
    await pipeline([["SET", "fm:vapid", JSON.stringify(n), "NX"]]);
    [raw] = await pipeline([["GET", "fm:vapid"]]);
    k = safe(raw) || n;
  }
  return k;
}

export async function notify(title, body, url = "/adm") {
  try {
    const [flat] = await pipeline([["HGETALL", "fm:push"]]);
    const subs = [];
    if (Array.isArray(flat)) for (let i = 0; i < flat.length; i += 2) subs.push([flat[i], safe(flat[i + 1])]);
    if (!subs.length) return 0;
    const k = await vapid();
    const opts = { TTL: 86400, urgency: "high", vapidDetails: { subject: "https://formasescoladedanca.com.br", publicKey: k.publicKey, privateKey: k.privateKey } };
    const payload = JSON.stringify({ title, body, url });
    const dead = [];
    let ok = 0;
    await Promise.all(subs.map(async ([id, s]) => {
      if (!s || !s.sub) { dead.push(id); return; }
      try { await (await wp()).sendNotification(s.sub, payload, opts); ok++; }
      catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.push(id); }
    }));
    if (dead.length) await pipeline([["HDEL", "fm:push", ...dead]]);
    return ok;
  } catch { return 0; }
}

// não deixa o aviso atrasar a resposta para a família
export const notifyQuick = (t, b, u) => Promise.race([notify(t, b, u), new Promise((r) => setTimeout(() => r(0), 4000))]);
