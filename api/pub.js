import { dbReady, pipeline } from "./_db.js";

// Recebe o que as famílias enviam pelo site:
//  - lead:   pedido de disponibilidade de turma (enviou ou começou a preencher)
//  - espera: entrada na fila de espera de uma turma completa
//  - pedido: pedido do Camarim (lojinha)
const clean = (v, n) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const ipOf = (req) => String(req.headers["x-forwarded-for"] || "?").split(",")[0].trim().replace(/[^\w.:-]/g, "").slice(0, 60);
const safe = (s) => { try { return JSON.parse(s); } catch { return null; } };
const HASH = { lead: "fm:leads", espera: "fm:espera", pedido: "fm:pedidos" };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).end();
  if (!dbReady()) return res.status(200).json({ ok: false, semBanco: true });
  try {
    let b = req.body;
    if (typeof b === "string") { try { b = JSON.parse(b || "{}"); } catch { b = {}; } }
    b = b || {};
    const acao = b.acao, key = HASH[acao];
    if (!key) return res.status(400).json({ ok: false });
    const it = b.item || {};
    const id = clean(it.id, 40).replace(/[^\w-]/g, "");
    if (!id) return res.status(400).json({ ok: false });

    const [apagado, existe] = await pipeline([["EXISTS", `fm:x:${id}`], ["HEXISTS", key, id]]);
    if (apagado) return res.status(200).json({ ok: true });
    if (!existe) {
      const rk = `fm:rl:${acao}:${ipOf(req)}`;
      const [n] = await pipeline([["INCR", rk], ["EXPIRE", rk, 3600]]);
      if (+n > 20) return res.status(429).json({ ok: false });
    }
    const city = (() => { try { return decodeURIComponent(String(req.headers["x-vercel-ip-city"] || "")); } catch { return ""; } })();
    const base = {
      id, quando: new Date().toISOString(), crianca: clean(it.crianca, 80), idade: clean(it.idade, 3),
      turmaId: clean(it.turmaId, 40), turma: clean(it.turma, 80), horario: clean(it.horario, 80), nome: clean(it.nome, 80),
      whatsapp: clean(it.whatsapp, 16).replace(/\D/g, ""), cidadeAprox: clean(city, 60), origem: "site",
    };
    let item;
    if (acao === "lead") {
      if (base.crianca.length < 2 && base.nome.length < 2) return res.status(200).json({ ok: false });
      item = { ...base, tipo: "disponibilidade", enviado: it.enviado === "sim" ? "sim" : "" };
    } else if (acao === "espera") {
      if (base.crianca.length < 2 || base.whatsapp.length < 10) return res.status(200).json({ ok: false });
      item = { ...base, status: "espera" };
    } else {
      if (base.crianca.length < 2) return res.status(200).json({ ok: false });
      item = {
        ...base, produtoId: clean(it.produtoId, 40), produto: clean(it.produto, 80), tamanho: clean(it.tamanho, 20),
        cor: clean(it.cor, 30), qtd: Math.max(1, Math.min(20, +it.qtd || 1)), preco: clean(it.preco, 20), obs: clean(it.obs, 200), status: "novo", pago: "",
      };
    }
    if (existe) {
      // atualização (ex.: começou a preencher e depois enviou): mantém data e situação já marcadas pela Irene
      const [raw] = await pipeline([["HGET", key, id]]);
      const old = safe(raw) || {};
      item = { ...old, ...item, quando: old.quando || item.quando, status: old.status || item.status, contatado: old.contatado || "", pago: old.pago || item.pago };
      if (old.enviado === "sim") item.enviado = "sim";
    }
    await pipeline([["HSET", key, id, JSON.stringify(item)]]);
    if (acao === "espera") {
      const [all] = await pipeline([["HVALS", key]]);
      const pos = (all || []).map(safe).filter((x) => x && x.turmaId === item.turmaId && x.status === "espera")
        .sort((a, c) => (a.quando < c.quando ? -1 : 1)).findIndex((x) => x.id === id) + 1;
      return res.status(200).json({ ok: true, pos });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
}
