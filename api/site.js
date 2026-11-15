import { dbReady, pipeline } from "./_db.js";

// Dados públicos do site (turmas, Camarim, fotos, dúvidas, contato), gravados pela Área da Irene.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!dbReady()) return res.status(200).json({ semBanco: true });
  try {
    const [raw] = await pipeline([["GET", "fm:site"]]);
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=10, stale-while-revalidate=60");
    if (!raw) return res.status(200).json({ vazio: true });
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(raw);
  } catch (e) {
    return res.status(200).json({ vazio: true });
  }
}
