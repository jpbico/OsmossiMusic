// GET /api/credits — remaining SunoAPI credits.
import { json, checkAccess, suno } from "./_lib/suno.mjs";

export default async (req) => {
  const denied = checkAccess(req);
  if (denied) return denied;
  const result = await suno("/api/v1/generate/credit");
  if (!result.ok) return json(result.status, { ok: false, error: result.error });
  return json(200, { ok: true, credits: result.data });
};
