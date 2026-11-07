// POST /api/callback — SunoAPI requires a callback URL. The app polls
// /api/status instead, so this only acknowledges the notification.
export default async () =>
  new Response(JSON.stringify({ code: 200, msg: "received" }), {
    headers: { "Content-Type": "application/json" },
  });
