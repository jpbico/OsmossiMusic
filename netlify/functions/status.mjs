// GET /api/status?taskId=... — polls a generation task and returns its tracks.
import { json, checkAccess, suno } from "./_lib/suno.mjs";

const FAILED = new Set([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

const pick = (o, ...keys) => {
  for (const k of keys) if (o?.[k]) return o[k];
  return "";
};

export default async (req) => {
  const denied = checkAccess(req);
  if (denied) return denied;

  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId || !/^[\w-]{4,128}$/.test(taskId)) {
    return json(400, { ok: false, error: "Missing or invalid taskId" });
  }

  const result = await suno("/api/v1/generate/record-info", { query: { taskId } });
  if (!result.ok) return json(result.status, { ok: false, error: result.error });

  const d = result.data || {};
  const status = d.status || "PENDING";
  const tracks = (d.response?.sunoData || []).map((t) => ({
    id: t.id,
    title: t.title || "Untitled",
    tags: t.tags || "",
    duration: t.duration || null,
    audioUrl: pick(t, "audioUrl", "audio_url", "sourceAudioUrl", "source_audio_url"),
    streamUrl: pick(t, "streamAudioUrl", "stream_audio_url", "sourceStreamAudioUrl", "source_stream_audio_url"),
    imageUrl: pick(t, "imageUrl", "image_url", "sourceImageUrl", "source_image_url"),
  }));

  return json(200, {
    ok: true,
    status,
    done: status === "SUCCESS",
    failed: FAILED.has(status),
    error: d.errorMessage || (FAILED.has(status) ? status.replace(/_/g, " ").toLowerCase() : null),
    tracks,
  });
};
