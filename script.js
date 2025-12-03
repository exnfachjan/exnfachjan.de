/* =========================
   Slideshow + Player-Kontrolle
   ========================= */
let slideIndex = 0;
const changeEveryMs = 10000;
let slideTimer;

let twitchPlayer = null;
let isVideoPlaying = false;

/* --- Pause/Mute beim Slidewechsel --- */
function pauseAllPlayers() {
  try { if (twitchPlayer) twitchPlayer.pause(); } catch(e){}

  ["yt-frame", "yt-shorts-frame"].forEach(id => {
    const f = document.getElementById(id);
    if (f?.contentWindow) {
      f.contentWindow.postMessage(JSON.stringify({
        event: "command",
        func: "pauseVideo",
        args: []
      }), "*");
    }
  });
}

function showSlide(n) {
  const slides = document.querySelectorAll('.slide');
  if (!slides.length) return;
  pauseAllPlayers();
  slideIndex = (n + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle('active', i === slideIndex));
}

function plusSlides(n) {
  showSlide(slideIndex + n);
  restartAuto();
}

function startAuto() {
  if (isVideoPlaying) return;
  stopAuto();
  slideTimer = setInterval(() => showSlide(slideIndex + 1), changeEveryMs);
}
function stopAuto() { clearInterval(slideTimer); }
function restartAuto(){ stopAuto(); startAuto(); }

/* =========================
   TWITCH
   ========================= */
function initTitchPlayer() {
  const parentHosts = [location.hostname, "exnfachjan.de", "www.exnfachjan.de"];

  const opts = {
    width: "100%",
    height: "100%",
    channel: "exnfachjan",
    autoplay: false,
    muted: true,
    parent: parentHosts
  };

  try {
    twitchPlayer = new Twitch.Player("twitch-embed", opts);
    twitchPlayer.setMuted(true);

    twitchPlayer.addEventListener(Twitch.Player.PLAYING, () => {
      isVideoPlaying = true;
      stopAuto();
    });

    twitchPlayer.addEventListener(Twitch.Player.PAUSE, () => {
      isVideoPlaying = false;
      startAuto();
    });

    twitchPlayer.addEventListener(Twitch.Player.ENDED, () => {
      isVideoPlaying = false;
      startAuto();
    });
  } catch(e) {
    console.warn("Twitch init failed:", e);
  }
}

/* =========================
   YT Utilities
   ========================= */
function subscribeYTEvents(id) {
  const f = document.getElementById(id);
  if (!f) return;

  const cw = f.contentWindow;
  if (!cw) return;

  const send = () => {
    cw.postMessage(JSON.stringify({ event: "listening", id }), "*");
    cw.postMessage(JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"], id }), "*");
  };

  try { send(); } 
  catch { setTimeout(send, 500); }
}

/* =========================
   Load YouTube Videos (via Cloudflare)
   ========================= */
async function loadLatestLong() {
  const iframe = document.getElementById("yt-frame");
  if (!iframe) return;

  try {
    const res = await fetch("/api/youtube/long");
    const item = await res.json();

    if (!item?.id?.videoId) {
      iframe.srcdoc = `<style>
        body{margin:0;background:#000;color:#fff;
        font:16px system-ui;display:flex;
        justify-content:center;align-items:center;}
      </style>Kein öffentliches Video gefunden.`;
      return;
    }

    const vid = item.id.videoId;
    iframe.removeAttribute("srcdoc");
    iframe.src =
      `https://www.youtube.com/embed/${vid}?enablejsapi=1&mute=1&rel=0&playsinline=1&origin=${location.origin}`;

    iframe.addEventListener("load", () => subscribeYTEvents("yt-frame"));
  } catch (e) {
    iframe.srcdoc = `<style>body{margin:0;background:#000;color:#fff;
    font:16px system-ui;display:flex;justify-content:center;
    align-items:center;}</style>Fehler beim Laden des Videos`;
  }
}

async function loadLatestShort() {
  const iframe = document.getElementById("yt-shorts-frame");
  if (!iframe) return;

  try {
    const res = await fetch("/api/youtube/short");
    const item = await res.json();

    if (!item?.id?.videoId) {
      iframe.srcdoc = `<style>
        body{margin:0;background:#000;color:#fff;
        font:16px system-ui;display:flex;
        justify-content:center;align-items:center;}
      </style>Kein Short gefunden.`;
      return;
    }

    const vid = item.id.videoId;
    iframe.removeAttribute("srcdoc");
    iframe.src =
      `https://www.youtube.com/embed/${vid}?enablejsapi=1&mute=1&rel=0&playsinline=1&origin=${location.origin}`;

    iframe.addEventListener("load", () => subscribeYTEvents("yt-shorts-frame"));
  } catch (e) {
    iframe.srcdoc = `<style>body{margin:0;background:#000;color:#fff;
    font:16px system-ui;display:flex;justify-content:center;
    align-items:center;}</style>Fehler beim Laden der Shorts`;
  }
}

/* =========================
   YT Player State Listener
   ========================= */
window.addEventListener("message", (ev) => {
  let data;
  try { data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data; }
  catch { return; }

  if (data?.event !== "onStateChange") return;

  const state = data.info; 
  if (state === 1) { 
    isVideoPlaying = true; stopAuto(); 
  }
  else if (state === 0 || state === 2) {
    isVideoPlaying = false; startAuto();
  }
});

/* =========================
   Init
   ========================= */
function initApp() {
  showSlide(0);
  startAuto();

  const sc = document.querySelector('.slideshow-container');
  if (sc) {
    sc.addEventListener("mouseenter", stopAuto);
    sc.addEventListener("mouseleave", () => {
      if (!isVideoPlaying) startAuto();
    });
  }

  initTitchPlayer();
  loadLatestLong();
  loadLatestShort();
}

document.addEventListener("DOMContentLoaded", initApp);
