import { handleUpload } from "@vercel/blob/client";
import { del } from "@vercel/blob";
import { dbReady, pipeline } from "./_db.js";

// Vídeos enviados pela Área da professora, direto do celular para o Vercel Blob.
//  - o celular pede uma autorização aqui (com o código de sessão da professora) e envia o arquivo direto para o Blob
//  - { acao: "apagar", tok, url } apaga um vídeo enviado
const MAX = 600 * 1024 * 1024; // 600 MB por vídeo

async function sessaoOk(tok) {
  tok = String(tok || "").replace(/[^a-f0-9]/g, "").slice(0, 64);
  if (tok.length !== 64 || !dbReady()) return false;
  const [ok] = await pipeline([["GET", `fm:sess:${tok}`]]);
  return Boolean(ok);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: "O armazenamento de vídeos ainda não foi ligado na Vercel." });
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b || "{}"); } catch { b = {}; } }
  b = b || {};
  try {
    if (b.acao === "apagar") {
      if (!(await sessaoOk(b.tok))) return res.status(401).json({ ok: false, erro: "Entre de novo." });
      const url = String(b.url || "");
      if (/^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\//i.test(url)) await del(url);
      return res.status(200).json({ ok: true });
    }
    const json = await handleUpload({
      body: b,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let tok = "";
        try { tok = JSON.parse(clientPayload || "{}").tok; } catch {}
        if (!(await sessaoOk(tok))) throw new Error("Sua sessão expirou. Entre de novo.");
        return {
          allowedContentTypes: ["video/*"],
          maximumSizeInBytes: MAX,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(json);
  } catch (e) {
    return res.status(400).json({ error: String((e && e.message) || e) });
  }
}
