import { dbReady, pipeline } from "./_db.js";

// Dados públicos do site (turmas, Camarim, fotos, dúvidas, contato), gravados pela Área da professora.
// Na primeira chamada depois de virar modelo, apaga o conteúdo público da escola antiga (fotos, vídeos, cartazes, contato, textos).
export async function limparEscolaAntiga() {
  const [feito] = await pipeline([["GET", "fm:modelo:v1"]]);
  if (feito) return;
  const [rawSite, rawEsc] = await pipeline([["GET", "fm:site"], ["GET", "fm:escola"]]);
  let site = {}, esc = null;
  try { site = JSON.parse(rawSite || "{}") || {}; } catch {}
  try { esc = JSON.parse(rawEsc || "null"); } catch {}
  const s2 = Object.assign({}, (esc && esc.site) || {}, site);
  const ids = new Set(), blobs = new Set();
  for (const f of [].concat(s2.fotos || [], s2.cartazes || [], (esc && esc.site && esc.site.fotos) || [], (esc && esc.site && esc.site.cartazes) || [])) {
    const m = String((f && f.src) || "").match(/\/api\/foto\?id=([\w-]+)/); if (m) ids.add(m[1]);
  }
  for (const v of [].concat(s2.videos || [], (esc && esc.site && esc.site.videos) || [])) {
    const u = String((v && v.src) || ""); if (/blob\.vercel-storage\.com\//.test(u)) blobs.add(u);
  }
  const cmds = [...ids].map((id) => ["DEL", `fm:foto:${id}`]);
  cmds.push(["DEL", "fm:site"]);
  if (esc && typeof esc === "object") { delete esc.site; cmds.push(["SET", "fm:escola", JSON.stringify(esc)]); }
  cmds.push(["SET", "fm:modelo:v1", String(Date.now())]);
  await pipeline(cmds);
  if (blobs.size && process.env.BLOB_READ_WRITE_TOKEN) {
    try { const { del } = await import("@vercel/blob"); await del([...blobs]); } catch {}
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!dbReady()) return res.status(200).json({ semBanco: true });
  try {
    try { await limparEscolaAntiga(); } catch {}
    const [raw] = await pipeline([["GET", "fm:site"]]);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=10, stale-while-revalidate=60");
    if (!raw) return res.status(200).json({ vazio: true });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(raw);
  } catch (e) {
    return res.status(200).json({ vazio: true });
  }
}
