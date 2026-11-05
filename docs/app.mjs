import { roads } from "./roads.mjs";

const byId = (id) => document.getElementById(id);
const config = window.ULSAN_CONFIG ?? {};
const apiBase = (config.apiBase ?? "").trim().replace(/\/+$/, "");
const mapNote = "도로선은 OpenStreetMap 데이터를 사용합니다. 박상진로는 선형을 확인할 때까지 박상진 의사 생가 마커로 안내합니다.";

function showMapNote(prefix = "") {
  const attribution = document.createElement("a");
  attribution.href = "https://www.openstreetmap.org/copyright";
  attribution.textContent = "© OpenStreetMap contributors";
  byId("map-note").replaceChildren(prefix + mapNote + " ", attribution);
}
const selections = [];
const lines = new Map();
const requests = new Map();
const histories = new Map();
let current = roads[0];
let kakaoMap;
let allBounds;

function roadButton(road, className, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.style.setProperty("--road", road.color);
  button.setAttribute("aria-label", road.name + " 역사 보기");
  button.addEventListener("click", () => selectRoad(road, true));
  selections.push({ road, button });
  if (label) button.textContent = label;
  return button;
}

function selectRoad(road, fromControl) {
  current = road;
  const story = byId("story");
  story.style.setProperty("--accent", road.color);
  byId("chapter").textContent = "길 " + String(roads.indexOf(road) + 1).padStart(2, "0") + " / 04";
  byId("theme").textContent = road.theme;
  byId("road-name").textContent = road.name;
  for (const field of ["person", "headline", "origin", "event"]) {
    byId(field).textContent = road[field];
  }
  byId("suggestion").textContent = "예시 · " + road.question;
  byId("sources").replaceChildren(...road.sources.map(([title, url]) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = title;
    item.append(link);
    return item;
  }));
  for (const { road: option, button } of selections) {
    button.setAttribute("aria-pressed", String(option === road));
  }
  for (const [id, line] of lines) {
    line.setOptions({ strokeWeight: id === road.id ? 8 : 5, strokeOpacity: id === road.id ? .96 : .72 });
  }
  syncQuestion();
  if (fromControl && window.matchMedia("(max-width: 800px)").matches) {
    story.scrollIntoView({ block: "start" });
  }
}

function syncQuestion() {
  const state = histories.get(current.id);
  byId("question").value = state?.draft ?? "";
  byId("send").disabled = requests.has(current.id);
  byId("answer").textContent = state?.answer ?? (apiBase ? "" : "AI 서버 연결 후 질문할 수 있습니다.");
}

function renderRoadTabs() {
  roads.forEach((road, index) => {
    const button = roadButton(road, "road-tab");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = String(index + 1).padStart(2, "0");
    badge.setAttribute("aria-hidden", "true");
    const labels = document.createElement("span");
    const name = document.createElement("strong");
    const theme = document.createElement("small");
    name.textContent = road.name;
    theme.textContent = road.theme;
    labels.append(name, theme);
    button.append(badge, labels);
    byId("roads").append(button);
  });
}

const project = ([lat, lng]) => [(lng - 129.17) / .265 * 100, (35.68 - lat) / .275 * 100];

function renderSchematic() {
  const target = byId("schematic");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = '<defs><pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#c9d5c4" stroke-width=".25"/></pattern></defs><rect width="100" height="100" fill="#e8eddf"/><rect width="100" height="100" fill="url(#grid)"/>';
  for (const road of roads) {
    for (const path of road.paths) {
      const line = document.createElementNS(svg.namespaceURI, "polyline");
      line.setAttribute("points", path.map(project).map((point) => point.join(",")).join(" "));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", road.color);
      line.setAttribute("stroke-width", "4");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      line.setAttribute("vector-effect", "non-scaling-stroke");
      svg.append(line);
    }
  }
  target.append(svg);
  for (const road of roads) {
    const [x, y] = project(road.marker);
    const pin = roadButton(road, "pin map-marker", road.markerLabel ?? road.name);
    pin.style.left = x + "%";
    pin.style.top = y + "%";
    target.append(pin);
  }
}

function initKakao() {
  const key = (config.kakaoKey ?? "").trim();
  if (!key) return;
  const script = document.createElement("script");
  const showFallback = () => {
    byId("kakao").hidden = true;
    byId("schematic").hidden = false;
    byId("reset").hidden = true;
    byId("map-mode").textContent = "개략 지도";
    showMapNote("카카오 지도를 불러오지 못했습니다. ");
  };
  const timer = setTimeout(showFallback, 9000);
  script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=" + encodeURIComponent(key) + "&autoload=false";
  script.onerror = () => { clearTimeout(timer); showFallback(); };
  script.onload = () => {
    if (!window.kakao?.maps?.load) {
      clearTimeout(timer);
      showFallback();
      return;
    }
    window.kakao.maps.load(() => {
      clearTimeout(timer);
      try { renderKakao(window.kakao.maps); } catch { showFallback(); }
    });
  };
  document.head.append(script);
}

function renderKakao(maps) {
  const target = byId("kakao");
  target.hidden = false;
  kakaoMap = new maps.Map(target, { center: new maps.LatLng(35.575, 129.34), level: 8 });
  allBounds = new maps.LatLngBounds();
  for (const road of roads) {
    const paths = road.paths.map((path) => path.map(([lat, lng]) => new maps.LatLng(lat, lng)));
    for (const path of paths) path.forEach((point) => allBounds.extend(point));
    if (paths.length) {
      const line = new maps.Polyline({ map: kakaoMap, path: paths, strokeColor: road.color, strokeWeight: 5 });
      lines.set(road.id, line);
      maps.event.addListener(line, "click", () => selectRoad(road, true));
    }
    const position = new maps.LatLng(...road.marker);
    allBounds.extend(position);
    const pin = roadButton(road, "pin", road.markerLabel ?? road.name);
    new maps.CustomOverlay({
      map: kakaoMap, position, content: pin,
      xAnchor: .5, yAnchor: .5, clickable: true, zIndex: 3
    });
  }
  kakaoMap.setBounds(allBounds, 50, 40, 50, 40);
  byId("schematic").hidden = true;
  byId("reset").hidden = false;
  byId("map-mode").textContent = "Kakao Maps";
  showMapNote();
  for (const { road, button } of selections) button.setAttribute("aria-pressed", String(road === current));
  const selectedLine = lines.get(current.id);
  selectedLine?.setOptions({ strokeWeight: 8, strokeOpacity: .96 });
}

function updateDraft(value) {
  const history = histories.get(current.id) ?? {};
  history.draft = value;
  histories.set(current.id, history);
}

byId("reset").addEventListener("click", () => kakaoMap?.setBounds(allBounds, 50, 40, 50, 40));
byId("question").addEventListener("input", (event) => updateDraft(event.target.value));
byId("suggestion").addEventListener("click", () => {
  updateDraft(current.question);
  byId("question").value = current.question;
  byId("question").focus();
});
byId("ask-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const road = current;
  const question = byId("question").value.trim();
  if (!question || requests.has(road.id)) return;
  const state = histories.get(road.id) ?? { draft: question };
  histories.set(road.id, state);
  if (!apiBase) {
    state.answer = "AI 서버 주소를 설정하면 이곳에서 Gemini 답변을 볼 수 있습니다.";
    syncQuestion();
    return;
  }
  requests.set(road.id, true);
  state.answer = "역사 해설을 작성하고 있습니다…";
  syncQuestion();
  try {
    const response = await fetch(apiBase + "/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roadId: road.id, question }),
      signal: AbortSignal.timeout(25000)
    });
    const result = await response.json();
    state.answer = response.ok && result.answer ? result.answer : (result.error || "답변을 가져오지 못했습니다.");
  } catch {
    state.answer = "AI 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  } finally {
    requests.delete(road.id);
    if (current === road) syncQuestion();
  }
});

renderRoadTabs();
renderSchematic();
showMapNote();
selectRoad(current, false);
initKakao();
