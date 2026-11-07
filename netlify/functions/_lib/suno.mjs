// Shared helpers for the SunoAPI.org proxy functions.
// The API key is read from the Netlify environment variable SUNO_API_KEY and
// never reaches the browser.

const DEFAULT_BASE = "https://api.sunoapi.org";

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Optional shared password: if APP_PASSWORD is set in Netlify, every request
// must send it in the "x-app-password" header. Prevents strangers from
// spending your Suno credits if they find the site URL.
export function checkAccess(req) {
  const required = process.env.APP_PASSWORD;
  if (!required) return null;
  const given = req.headers.get("x-app-password") || "";
  if (given !== required) {
    return json(401, { ok: false, error: "Wrong or missing app password." });
  }
  return null;
}

export async function suno(path, { method = "GET", body, query } = {}) {
  const key = process.env.SUNO_API_KEY;
  if (!key) {
    return {
      ok: false,
      status: 500,
      error: "SUNO_API_KEY is not configured in the Netlify environment variables.",
    };
  }
  const base = (process.env.SUNO_API_BASE || DEFAULT_BASE).replace(/\/+$/, "");
  const url = new URL(base + path);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return { ok: false, status: 502, error: `Could not reach SunoAPI: ${err.message}` };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return { ok: false, status: 502, error: `SunoAPI returned a non-JSON response (HTTP ${res.status}).` };
  }

  // SunoAPI wraps everything as { code, msg, data }; code 200 means success.
  if (!res.ok || data.code !== 200) {
    return {
      ok: false,
      status: 502,
      code: data.code,
      error: explainCode(data.code, data.msg),
    };
  }
  return { ok: true, data: data.data };
}

function explainCode(code, msg) {
  const known = {
    400: "Invalid parameters",
    401: "Unauthorized: check the SUNO_API_KEY",
    404: "Invalid request method or path",
    405: "Rate limit exceeded",
    413: "Prompt or style too long",
    429: "Insufficient credits on your SunoAPI account",
    430: "Calls too frequent, please try again in a moment",
    455: "SunoAPI is under maintenance",
    500: "SunoAPI server error",
  };
  const base = known[code] || "SunoAPI error";
  return msg && msg !== base ? `${base} (${code}): ${msg}` : `${base} (${code ?? "?"})`;
}
