// POST /api/generate — starts a Suno music generation task.
import { json, checkAccess, suno } from "./_lib/suno.mjs";

const MODELS = new Set(["V6", "V6_MINI", "V6_WILD"]);
const clip = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "Use POST" });
  const denied = checkAccess(req);
  if (denied) return denied;

  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { ok: false, error: "Invalid JSON body" });
  }

  const model = MODELS.has(input.model) ? input.model : "V6";
  const instrumental = input.instrumental !== false;
  const style = clip(input.style, 1000);
  const title = clip(input.title, 80);
  const negativeTags = clip(input.negativeTags, 1000);
  const lyrics = clip(input.lyrics, 5000);
  const idea = clip(input.idea, 3000);
  const duration = Math.min(360, Math.max(10, Math.round(Number(input.duration) || 30)));

  if (!style) return json(400, { ok: false, error: "A music style description is required." });

  // SunoAPI requires a callback URL; we poll for status, so this just acknowledges.
  const origin = process.env.URL || new URL(req.url).origin;
  const callBackUrl = `${origin}/api/callback`;

  let body;
  if (instrumental || lyrics) {
    // Custom mode: full control over style, title, exclusions and duration.
    body = { customMode: true, instrumental, model, style, callBackUrl, duration };
    if (title) body.title = title;
    if (negativeTags) body.negativeTags = negativeTags;
    if (!instrumental) {
      body.lyrics = lyrics;
      if (input.vocalGender === "m" || input.vocalGender === "f") body.vocalGender = input.vocalGender;
    }
  } else {
    // Vocals without written lyrics: non-custom mode lets Suno write the lyrics
    // from the idea. (Title, duration and exclusions are not supported here.)
    body = {
      customMode: false,
      instrumental: false,
      model,
      style,
      prompt: idea || `A song for an Instagram post. ${style}`.slice(0, 3000),
      callBackUrl,
    };
  }

  const result = await suno("/api/v1/generate", { method: "POST", body });
  if (!result.ok) return json(result.status, { ok: false, error: result.error });
  return json(200, { ok: true, taskId: result.data?.taskId, sent: { ...body, callBackUrl: undefined } });
};
