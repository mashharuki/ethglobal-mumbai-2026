const elements = Object.fromEntries(
  [
    "stage",
    "play",
    "replay",
    "position",
    "clock",
    "caption",
    "chapters",
    "note",
    "mobile-summary",
  ].map((id) => [id, document.getElementById(id)]),
);
const preferences = window.matchMedia("(prefers-reduced-motion: reduce)");
const initialLanguage =
  new URLSearchParams(window.location.search).get("lang") === "ja"
    ? "ja"
    : "en";
const state = {
  language: initialLanguage,
  time: 0,
  isPlaying: !preferences.matches,
  previous: 0,
  lastPaint: 0,
  renderedTime: -1,
  stage: -1,
};

function updateControls() {
  const t = copy[state.language];
  elements.play.textContent = state.isPlaying
    ? t.pause
    : state.time >= duration
      ? t.replay
      : t.play;
  elements.play.setAttribute("aria-pressed", String(state.isPlaying));
  elements.replay.textContent = t.replay;
  elements.position.value = state.time;
  elements.position.setAttribute("aria-label", t.timeline);
  elements.clock.textContent = `${Math.floor(state.time).toString().padStart(2, "0")} / 32s`;
}

function paintFrame() {
  const stage = getStage(Math.min(state.time, duration - 0.001));
  elements.stage.innerHTML = renderFrame(state.time, state.language, icons);
  if (stage !== state.stage) {
    elements.caption.textContent = copy[state.language].captions[stage];
    for (const [index, button] of [...elements.chapters.children].entries())
      button.setAttribute("aria-pressed", String(index === stage));
    state.stage = stage;
  }
  state.renderedTime = state.time;
  updateControls();
}

function selectChapter(index) {
  state.time = starts[index] + 0.1;
  state.isPlaying = false;
  paintFrame();
}

function selectLanguage(language) {
  state.language = language;
  state.stage = -1;
  document.documentElement.lang = language;
  document.getElementById("tagline").textContent = copy[language].tagline;
  elements.chapters.replaceChildren(
    ...copy[language].steps.map((label, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${index + 1}. ${label}`;
      button.addEventListener("click", () => selectChapter(index));
      return button;
    }),
  );
  for (const button of document.querySelectorAll("[data-language]"))
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.language === language),
    );
  for (const link of document.querySelectorAll("[data-copy]"))
    link.textContent = copy[language][link.dataset.copy];
  elements.note.textContent = copy[language].note;
  elements["mobile-summary"].textContent = copy[language].mobile;
  paintFrame();
}

function togglePlayback() {
  if (state.time >= duration) state.time = 0;
  state.isPlaying = !state.isPlaying;
  state.previous = performance.now();
  paintFrame();
}

function advanceClock(now) {
  if (state.isPlaying && state.previous && !document.hidden)
    state.time = Math.min(
      duration,
      state.time + Math.min(0.1, (now - state.previous) / 1000),
    );
  state.previous = now;
  if (state.time >= duration) state.isPlaying = false;
  if (now - state.lastPaint >= 1000 / 24) {
    if (state.isPlaying || state.renderedTime !== state.time) paintFrame();
    state.lastPaint = now;
  }
  requestAnimationFrame(advanceClock);
}

elements.play.addEventListener("click", togglePlayback);
elements.replay.addEventListener("click", () => {
  state.time = 0;
  state.isPlaying = true;
  state.previous = performance.now();
  paintFrame();
});
elements.position.addEventListener("input", () => {
  state.time = Number(elements.position.value);
  state.isPlaying = false;
  paintFrame();
});
for (const button of document.querySelectorAll("[data-language]"))
  button.addEventListener("click", () =>
    selectLanguage(button.dataset.language),
  );
preferences.addEventListener("change", () => {
  if (preferences.matches) {
    state.isPlaying = false;
    paintFrame();
  }
});
document.addEventListener("visibilitychange", () => {
  state.previous = performance.now();
});
selectLanguage(initialLanguage);
requestAnimationFrame(advanceClock);
