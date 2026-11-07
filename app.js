// Osmossi Music: front-end logic.
// Builds a Suno style prompt from the three choices, starts a generation via
// the Netlify function, then polls until the tracks are ready.

const CONTENT_TYPES = [
  {
    id: "reel", label: "Reel", icon: "▶", note: "Up to 90 s · catchy hook",
    duration: 30,
    style: "instant hook in the first seconds, strong groove, clear build and satisfying payoff, loop-friendly ending, social media reel soundtrack",
  },
  {
    id: "story", label: "Story", icon: "◯", note: "15 s per slide · immediate",
    duration: 15,
    style: "short and immediate, starts right away with the main motif, simple memorable melody, clean ending, Instagram story background music",
  },
  {
    id: "carousel", label: "Carousel", icon: "▦", note: "Background while swiping",
    duration: 30,
    style: "steady unobtrusive background, consistent mood throughout, gentle loopable groove, no sudden drops, music bed for browsing images",
  },
];

const TOPICS = [
  {
    id: "product", label: "Product", icon: "✦", note: "Showcase a piece",
    style: "polished modern production, crisp details, tasteful product showcase music, highlights craftsmanship and texture",
    title: "Crafted Detail",
  },
  {
    id: "lifestyle", label: "Lifestyle", icon: "☼", note: "Everyday moments",
    style: "organic contemporary feel, warm acoustic and soft electronic textures, everyday slow-living moments, sunlit and natural",
    title: "Slow Living",
  },
  {
    id: "artisan", label: "Artisan stories", icon: "✋", note: "The makers behind it",
    style: "handmade organic instrumentation, acoustic guitar, hand percussion, subtle folk and world textures, human and heartfelt storytelling",
    title: "Made by Hand",
  },
  {
    id: "shop", label: "The shop", icon: "⌂", note: "Space, visit, ambience",
    style: "inviting boutique ambience, welcoming and curated, light jazzy or bossa touches, a beautiful place you want to step into",
    title: "Come Inside",
  },
];

const EMOTIONS = [
  { id: "calm", label: "Calm", style: "calm, serene, soft dynamics, slow tempo around 70 bpm, airy pads, gentle piano" },
  { id: "warm", label: "Warm & cozy", style: "warm, cozy, intimate, mellow tempo, soft Rhodes, brushed drums" },
  { id: "joyful", label: "Joyful", style: "joyful, uplifting, bright major key, upbeat around 115 bpm, claps, plucked strings" },
  { id: "inspired", label: "Inspired", style: "inspiring, hopeful, purposeful, building arrangement, cinematic strings, rising energy" },
  { id: "nostalgic", label: "Nostalgic", style: "nostalgic, bittersweet, vintage warmth, tape saturation, dreamy guitar" },
  { id: "romantic", label: "Romantic", style: "romantic, tender, delicate, soft strings, intimate piano, slow sway" },
  { id: "elegant", label: "Elegant", style: "elegant, sophisticated, refined, minimal, chic lounge, upright bass" },
  { id: "playful", label: "Playful", style: "playful, light-hearted, quirky, bouncy rhythm, marimba, whistles" },
  { id: "energetic", label: "Energetic", style: "energetic, confident, driving beat around 125 bpm, punchy drums, bold bass" },
  { id: "dreamy", label: "Dreamy", style: "dreamy, ethereal, mysterious, lush reverb, shimmering synths, floating" },
  { id: "grounded", label: "Grounded", style: "grounded, earthy, natural, rooted, wooden percussion, nylon guitar, nature-inspired" },
  { id: "proud", label: "Proud", style: "proud, celebratory, dignified, rich ensemble, cultural heritage, triumphant but tasteful" },
];

const BASE_STYLE = "high quality, modern, tasteful, brand-safe";
const DEFAULT_NEGATIVE = "harsh distortion, screaming, heavy metal, explicit lyrics, abrupt noise, low quality";

const state = { contentType: "reel", topic: null, emotion: [] };
const $ = (id) => document.getElementById(id);
let styleEdited = false;
let pollTimer = null;

// ---------- Rendering choices ----------
function renderGroup(group, items) {
  const box = document.querySelector(`[data-group="${group}"]`);
  const multi = Number(box.dataset.multi || 0);
  box.innerHTML = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice";
    btn.dataset.id = item.id;
    btn.setAttribute("role", multi ? "checkbox" : "radio");
    btn.innerHTML = item.icon
      ? `<span class="icon" aria-hidden="true">${item.icon}</span><span class="label">${item.label}</span><span class="note">${item.note}</span>`
      : `<span class="label">${item.label}</span>`;
    btn.addEventListener("click", () => {
      if (multi) {
        const list = state[group];
        const i = list.indexOf(item.id);
        if (i >= 0) list.splice(i, 1);
        else {
          list.push(item.id);
          if (list.length > multi) list.shift();
        }
      } else {
        state[group] = item.id;
        if (group === "contentType") setDuration(item.duration);
      }
      sync();
    });
    box.appendChild(btn);
  }
}

function sync() {
  for (const box of document.querySelectorAll("[data-group]")) {
    const val = state[box.dataset.group];
    for (const btn of box.children) {
      const on = Array.isArray(val) ? val.includes(btn.dataset.id) : val === btn.dataset.id;
      btn.classList.toggle("selected", on);
      btn.setAttribute("aria-checked", String(on));
    }
  }
  if (!styleEdited) $("style").value = buildStyle();
}

function setDuration(sec) {
  $("duration").value = sec;
  $("durationLabel").textContent = `${sec} s`;
}

// ---------- Prompt building ----------
const find = (list, id) => list.find((x) => x.id === id);

function buildStyle() {
  const parts = [];
  for (const id of state.emotion) parts.push(find(EMOTIONS, id).style);
  const topic = find(TOPICS, state.topic);
  if (topic) parts.push(topic.style);
  const details = $("details").value.trim();
  if (details) parts.push(`inspired by: ${details}`);
  parts.push(find(CONTENT_TYPES, state.contentType).style);
  parts.push(isInstrumental() ? "instrumental, leaves space for voice-over" : "with vocals");
  parts.push(BASE_STYLE);
  return parts.join(", ").slice(0, 1000);
}

function buildTitle() {
  const topic = find(TOPICS, state.topic);
  const emo = state.emotion.map((id) => find(EMOTIONS, id).label.split(" ")[0]).join(" & ");
  const type = find(CONTENT_TYPES, state.contentType).label;
  return `Osmossi ${type} · ${topic ? topic.title : "Sound"}${emo ? " · " + emo : ""}`.slice(0, 80);
}

const isInstrumental = () => document.querySelector('input[name="voice"]:checked').value === "instrumental";

// ---------- API ----------
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const pw = sessionStorage.getItem("osmossi-pw");
  if (pw) headers["x-app-password"] = pw;
  const res = await fetch(path, { ...options, headers });
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }
  if (res.status === 401 && /password/i.test(data.error || "")) {
    sessionStorage.removeItem("osmossi-pw");
    await askPassword();
    return api(path, options);
  }
  if (!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status})`);
  return data;
}

function askPassword() {
  return new Promise((resolve) => {
    const dlg = $("pwDialog");
    dlg.addEventListener("close", () => {
      sessionStorage.setItem("osmossi-pw", $("pwInput").value);
      resolve();
    }, { once: true });
    dlg.showModal();
  });
}

async function loadCredits() {
  try {
    const { credits } = await api("/api/credits");
    if (credits !== undefined && credits !== null) {
      $("credits").textContent = `Credits remaining: ${credits}`;
      $("credits").hidden = false;
    }
  } catch { /* not critical */ }
}

// ---------- Generate & poll ----------
function showError(msg) {
  $("error").textContent = msg;
  $("error").hidden = !msg;
}

const STATUS_TEXT = {
  PENDING: "Composing your music… this usually takes 1–3 minutes.",
  TEXT_SUCCESS: "Arrangement ready, recording the tracks…",
  FIRST_SUCCESS: "First track ready! Finishing the second one…",
  SUCCESS: "Done! Listen and download your favourite.",
};

async function onSubmit(e) {
  e.preventDefault();
  showError("");
  if (!state.topic) return showError("Choose what the post is about (step 2).");
  if (!state.emotion.length) return showError("Choose at least one emotion (step 3).");

  const style = $("style").value.trim() || buildStyle();
  const payload = {
    model: $("model").value,
    instrumental: isInstrumental(),
    style,
    title: buildTitle(),
    negativeTags: $("negativeTags").value.trim(),
    duration: Number($("duration").value),
    lyrics: $("lyrics").value.trim(),
    vocalGender: $("vocalGender").value,
    idea: `An original song for an Osmossi.purpose Instagram ${state.contentType} about ${find(TOPICS, state.topic).label.toLowerCase()}${$("details").value.trim() ? ` (${$("details").value.trim()})` : ""}. Mood: ${state.emotion.join(", ")}.`,
  };

  const btn = $("submit");
  btn.disabled = true;
  btn.textContent = "Creating…";
  $("results").hidden = false;
  $("tracks").innerHTML = "";
  $("status").textContent = "Sending your request…";
  $("results").scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const { taskId } = await api("/api/generate", { method: "POST", body: JSON.stringify(payload) });
    if (!taskId) throw new Error("SunoAPI did not return a task id.");
    poll(taskId, Date.now());
  } catch (err) {
    $("status").textContent = "";
    showError(err.message);
    resetButton();
  }
}

function poll(taskId, started) {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    try {
      const s = await api(`/api/status?taskId=${encodeURIComponent(taskId)}`);
      $("status").textContent = STATUS_TEXT[s.status] || `Status: ${s.status}`;
      renderTracks(s.tracks, s.done);
      if (s.failed) throw new Error(`Generation failed: ${s.error || s.status}`);
      if (s.done) { resetButton(); loadCredits(); return; }
      if (Date.now() - started > 10 * 60 * 1000) throw new Error("This is taking longer than expected. Try again in a few minutes.");
      poll(taskId, started);
    } catch (err) {
      showError(err.message);
      resetButton();
    }
  }, 6000);
}

function resetButton() {
  $("submit").disabled = false;
  $("submit").textContent = "Create music";
}

function fmt(sec) {
  if (!sec) return "";
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function renderTracks(tracks, done) {
  const box = $("tracks");
  for (const [i, t] of tracks.entries()) {
    const src = t.audioUrl || t.streamUrl;
    if (!src) continue;
    let card = box.querySelector(`[data-track="${t.id}"]`);
    const final = Boolean(t.audioUrl);
    if (card && card.dataset.final === "true") continue;
    if (!card) {
      card = document.createElement("article");
      card.className = "track";
      card.dataset.track = t.id;
      box.appendChild(card);
    }
    card.dataset.final = String(final);
    const safeTitle = escapeHtml(t.title);
    card.innerHTML = `
      ${t.imageUrl ? `<img src="${escapeAttr(t.imageUrl)}" alt="" loading="lazy" />` : `<div class="cover"></div>`}
      <div class="body">
        <h3>Version ${i + 1} <small>${fmt(t.duration)}</small></h3>
        <p class="tags">${safeTitle}</p>
        <audio controls preload="none" src="${escapeAttr(src)}"></audio>
        ${final
          ? `<a class="download" href="${escapeAttr(t.audioUrl)}" target="_blank" rel="noopener" download>Download MP3</a>`
          : `<span class="hint">${done ? "" : "Streaming preview, the MP3 download appears when it's finished."}</span>`}
      </div>`;
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const escapeAttr = (s) => (/^https?:\/\//i.test(s) ? escapeHtml(s) : "");

// ---------- Init ----------
renderGroup("contentType", CONTENT_TYPES);
renderGroup("topic", TOPICS);
renderGroup("emotion", EMOTIONS);
$("negativeTags").value = DEFAULT_NEGATIVE;
sync();

$("details").addEventListener("input", sync);
$("duration").addEventListener("input", (e) => ($("durationLabel").textContent = `${e.target.value} s`));
$("style").addEventListener("input", () => (styleEdited = true));
$("resetPrompt").addEventListener("click", () => { styleEdited = false; sync(); });
for (const r of document.querySelectorAll('input[name="voice"]')) {
  r.addEventListener("change", () => { $("vocalOptions").hidden = isInstrumental(); sync(); });
}
$("form").addEventListener("submit", onSubmit);
loadCredits();
