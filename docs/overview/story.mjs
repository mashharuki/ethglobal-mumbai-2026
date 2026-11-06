export const duration = 32;
export const starts = [0, 7, 14, 23];
export const copy = {
  en: {
    name: "Private Dating",
    tagline: "Find a connection. Keep your profile private.",
    steps: [
      "Keep it private",
      "Register publicly",
      "Find common ground",
      "Agree & settle",
    ],
    titles: [
      "Your profile stays with you.",
      "A public name. A private profile.",
      "Share the proof, not your interests.",
      "Two people agree. The contract follows.",
    ],
    captions: [
      "Each browser keeps its own secrets. A test deposit starts the registration flow.",
      "ENS provides a pseudonym. Arkiv stores the public registration, not the private profile.",
      "Encrypted messages pass through a relay. Only the two people learn whether interests overlap.",
      "A match needs both deposits locked. Settlement needs agreement; timeout refunds remain available.",
    ],
    browser: "Own browser",
    private: "Private profile",
    local: "Secrets stay here",
    public: "Public registration",
    names: "Pseudonyms",
    records: "Public records",
    relay: "Encrypted relay",
    proof: "Ciphertext only",
    overlap: "Shared interest",
    accept: "Accepted",
    matched: "Match confirmed",
    checking: "Checking privately",
    deposit: "Test deposits",
    confirmed: "Deposits confirmed",
    lock: "Locking both deposits",
    locked: "Both deposits locked",
    refund: "Agreed settlement / timeout refund",
    contract: "Ethereum Sepolia",
    signing: "User-signed",
    draft: "Concept replay",
    footer:
      "Illustration only · Two-party ZK and private settlement are unverified.",
    play: "Play",
    pause: "Pause",
    replay: "Replay",
    language: "Language",
    timeline: "Playback position",
    note: "A proposed flow, not a live product demo. No wallet connection or transaction.",
    details: "Architecture details",
    brief: "Mentor talking points",
    still: "Static overview",
    mobile:
      "The public record never contains the private profile. The relay carries ciphertext; the contract controls deposits.",
  },
  ja: {
    name: "Private Dating",
    tagline: "プロフィールは秘密に。共通の趣味でつながる。",
    steps: ["秘密を手元に", "公開登録", "共通点を確かめる", "合意と精算"],
    titles: [
      "プロフィールは、自分の端末に。",
      "名前は公開。プロフィールは秘密。",
      "趣味そのものではなく、証明を送る。",
      "二人の合意を、コントラクトで確定。",
    ],
    captions: [
      "秘密はそれぞれのブラウザに保持。テスト資金の預託から登録を始めます。",
      "ENSは仮名を、Arkivは公開登録を担当。私的なプロフィールは保存しません。",
      "暗号文を中継し、共通の趣味があるかだけを二人の端末で確かめます。",
      "双方の預託を拘束してからマッチ成立。合意精算と期限返却をコントラクトで扱います。",
    ],
    browser: "本人のブラウザ",
    private: "非公開プロフィール",
    local: "秘密はこの端末内",
    public: "公開登録",
    names: "仮名",
    records: "公開記録",
    relay: "暗号文の中継",
    proof: "暗号文だけを配送",
    overlap: "共通の趣味あり",
    accept: "招待を承諾",
    matched: "マッチ成立",
    checking: "非公開で照合中",
    deposit: "テスト資金を預託",
    confirmed: "預託確定",
    lock: "双方の預託を拘束中",
    locked: "双方の拘束が確定",
    refund: "合意による精算 / 期限返却",
    contract: "Ethereum Sepolia",
    signing: "本人の署名",
    draft: "構想のアニメーション",
    footer: "設計を説明するイメージです。二者のZK照合・秘匿精算は未検証。",
    play: "再生",
    pause: "一時停止",
    replay: "最初から",
    language: "言語",
    timeline: "再生位置",
    note: "目標設計を説明するアニメーションです。ウォレット接続や実際の取引は行いません。",
    details: "設計の詳細",
    brief: "メンターへの紹介文",
    still: "静止画を見る",
    mobile:
      "公開記録に私的なプロフィールは含めません。APIは暗号文を中継し、資金はコントラクトが管理します。",
  },
};

const colors = {
  ink: "#173F37",
  green: "#23765E",
  muted: "#63766E",
  line: "#CEDDD5",
  soft: "#EDF6F0",
  white: "#FFFFFF",
  lilac: "#EFEFFA",
  violet: "#555A93",
};
const escapeText = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const text = (
  x,
  y,
  value,
  size = 24,
  color = colors.ink,
  anchor = "middle",
  weight = 400,
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${escapeText(value)}</text>`;
const rect = (x, y, width, height, fill, radius = 16, stroke = "none") =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;

/** Return the active chapter for the bounded presentation clock. */
export function getStage(seconds) {
  return starts.filter((start) => seconds >= start).length - 1;
}

function drawIcon(name, x, y, size, icons, color = colors.green) {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

function drawRoute(points, active, seconds, reverse = false) {
  const path = points
    .map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`)
    .join(" ");
  const line = `<path d="${path}" fill="none" stroke="${active ? colors.green : colors.line}" stroke-width="${active ? 3 : 2}" stroke-linejoin="round"/>`;
  if (!active) return line;
  const segments = points.slice(1).map((point, index) => ({
    from: points[index],
    to: point,
    length: Math.hypot(
      point[0] - points[index][0],
      point[1] - points[index][1],
    ),
  }));
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  const travel = (((seconds * 0.35) % 1) + 1) % 1;
  const state = { distance: (reverse ? 1 - travel : travel) * total };
  const segment =
    segments.find((item) => {
      if (state.distance <= item.length) return true;
      state.distance -= item.length;
      return false;
    }) || segments.at(-1);
  const ratio = Math.min(1, state.distance / segment.length);
  const x = segment.from[0] + (segment.to[0] - segment.from[0]) * ratio;
  const y = segment.from[1] + (segment.to[1] - segment.from[1]) * ratio;
  return `${line}<circle cx="${x}" cy="${y}" r="9" fill="${colors.white}" stroke="${colors.green}" stroke-width="3"/>`;
}

function getPersonStatus(stage, elapsed, t) {
  if (stage < 2) return t.local;
  if (stage === 2) return elapsed > 4 ? t.overlap : t.checking;
  return elapsed < 3 ? t.accept : t.matched;
}

function drawPerson(x, identity, stage, elapsed, t, icons) {
  const active = stage !== 1;
  const confirmed = (stage === 2 && elapsed > 4) || stage === 3;
  const status = getPersonStatus(stage, elapsed, t);
  const masks = [0, 1, 2]
    .map(
      (index) =>
        `${rect(x + 30, 363 + index * 30, 155 - index * 18, 10, "#CCDCD2", 5)}${rect(x + 205, 363 + index * 30, 44, 10, "#E1EAE4", 5)}`,
    )
    .join("");
  return `<g>${rect(x, 240, 300, 300, active ? colors.soft : "#F5F7F5", 24, active ? "#A8CBB5" : colors.line)}
    ${drawIcon("smartphone", x + 26, 267, 36, icons)}${text(x + 83, 295, identity, 28, colors.ink, "start", 600)}
    ${text(x + 150, 338, t.private, 22, colors.muted)}${masks}
    ${rect(x + 20, 472, 260, 44, confirmed ? colors.green : colors.white, 22)}
    ${text(x + 150, 501, status, 21, confirmed ? colors.white : colors.green, "middle", 600)}</g>`;
}

function drawRegistry(t, stage, icons) {
  const fill = stage === 1 ? colors.soft : "#F8FAF8";
  return `${rect(440, 228, 180, 88, fill)}${rect(660, 228, 180, 88, fill)}
    ${drawIcon("at-sign", 458, 247, 30, icons)}${text(536, 268, "ENS", 25, colors.ink, "middle", 600)}
    ${text(530, 299, t.names, 20, colors.muted)}
    ${drawIcon("database", 677, 247, 30, icons)}${text(757, 268, "Arkiv", 25, colors.ink, "middle", 600)}
    ${text(750, 299, t.records, 20, colors.muted)}`;
}

function getFundStatus(stage, elapsed, t) {
  if (stage === 0) return t.deposit;
  if (stage < 3) return t.confirmed;
  if (elapsed < 3) return t.lock;
  return elapsed < 6 ? t.locked : t.refund;
}

function drawFunds(stage, elapsed, t, icons) {
  return `${rect(360, 598, 560, 94, stage === 0 || stage === 3 ? colors.lilac : "#F8F8FC", 20)}
    ${drawIcon("wallet", 384, 625, 38, icons, colors.violet)}
    ${text(655, 634, t.contract, 24, colors.violet, "middle", 600)}
    ${text(655, 670, getFundStatus(stage, elapsed, t), 22, colors.ink)}`;
}

const routePaths = {
  left: [
    [370, 390],
    [594, 390],
  ],
  right: [
    [686, 390],
    [910, 390],
  ],
  ens: [
    [615, 354],
    [615, 335],
    [530, 335],
    [530, 316],
  ],
  arkiv: [
    [665, 354],
    [665, 335],
    [750, 335],
    [750, 316],
  ],
  fundsA: [
    [220, 540],
    [220, 645],
    [360, 645],
  ],
  fundsB: [
    [1060, 540],
    [1060, 645],
    [920, 645],
  ],
};

function drawRoutes(stage, elapsed) {
  const isProofActive = stage === 2 && elapsed < 4;
  const isFundActive = stage === 0 || (stage === 3 && elapsed < 3);
  const shouldReverse = Math.floor(elapsed / 2) % 2 === 1;
  return [
    drawRoute(routePaths.left, isProofActive, elapsed, shouldReverse),
    drawRoute(routePaths.right, isProofActive, elapsed, shouldReverse),
    drawRoute(routePaths.ens, stage === 1, elapsed),
    drawRoute(routePaths.arkiv, stage === 1, elapsed, true),
    drawRoute(routePaths.fundsA, isFundActive, elapsed),
    drawRoute(routePaths.fundsB, isFundActive, elapsed),
  ].join("");
}

/** Render a deterministic illustration. It makes no network or wallet calls. */
export function renderFrame(seconds, language, icons) {
  const time = Math.min(duration - 0.001, Math.max(0, seconds));
  const stage = getStage(time);
  const elapsed = time - starts[stage];
  const t = copy[language];
  const routes = drawRoutes(stage, elapsed);
  const progress = starts
    .map((_start, index) =>
      rect(
        60 + index * 294,
        190,
        280,
        5,
        stage >= index ? colors.green : "#E6EDE8",
        2,
      ),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="760" viewBox="0 0 1280 760" role="img" aria-label="${escapeText(t.titles[stage])}" style="font-family:Arial,'Hiragino Sans',sans-serif">
    <title>${escapeText(t.titles[stage])}</title><desc>${escapeText(t.captions[stage])}</desc>
    ${rect(0, 0, 1280, 760, colors.white, 0)}
    ${text(60, 49, "Private Dating", 24, colors.green, "start", 600)}${text(1220, 49, t.draft, 20, colors.muted, "end")}
    ${text(60, 111, t.titles[stage], language === "ja" ? 36 : 39, colors.ink, "start", 600)}
    ${text(60, 158, t.captions[stage], 21, colors.muted, "start")}${progress}
    ${routes}${drawRegistry(t, stage, icons)}
    ${drawPerson(70, "A", stage, elapsed, t, icons)}${drawPerson(910, "B", stage, elapsed, t, icons)}
    ${drawIcon("server", 604, 354, 72, icons)}${text(640, 467, t.relay, 24, colors.ink, "middle", 600)}
    ${text(640, 505, t.proof, 20, colors.muted)}
    ${text(250, 579, t.signing, 20, colors.muted, "start")}${text(1090, 579, t.signing, 20, colors.muted, "start")}
    ${drawFunds(stage, elapsed, t, icons)}${text(60, 735, t.footer, 18, colors.muted, "start")}
  </svg>`;
}
