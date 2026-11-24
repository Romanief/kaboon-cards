const levelSelect = document.getElementById("level");
const groupSelect = document.getElementById("group");
const opponentSelect = document.getElementById("opponent");
const stageControl = document.getElementById("stage-control");
const stageSelect = document.getElementById("story-stage");
const stageLabels = {intro: "First guest", cogsworth: "Cogsworth", oren: "Oren", fenwick: "Expedition", aster: "Aster", rowan: "Chapter two", bramble_garden: "After Rowan", last_game: "After the garden"};
for (const [value, label] of Object.entries(stageLabels)) stageSelect.add(new Option(label, value));
stageSelect.value = "last_game";
for (const level of ["easy", "medium", "hard", "impossible"]) {
  levelSelect.add(new Option(cap(level), level));
}
levelSelect.value = "medium";
for (const group of new Set(ENCOUNTERS.map(entry => entry.group))) {
  groupSelect.add(new Option(group));
}

function playableEasyDeck(id = "") {
  if (id.startsWith("intro_")) return "intro_robots";
  if (id.startsWith("random_2_")) return "random_2_beasts";
  return id;
}

function showOpponents() {
  const previous = opponentSelect.value;
  opponentSelect.replaceChildren();
  ENCOUNTERS.forEach((entry, index) => {
    if (entry.group === groupSelect.value && (levelSelect.value !== "easy" || !entry.easyDeck || playableEasyDeck(entry.easyDeck) === entry.easyDeck)) {
      opponentSelect.add(new Option(entry.name, index));
    }
  });
  if ([...opponentSelect.options].some(option => option.value === previous)) opponentSelect.value = previous;
  showRoster();
}

function showRoster() {
  const entry = ENCOUNTERS[opponentSelect.value];
  stageControl.hidden = !entry.stages;
  if (entry.stages) {
    for (const option of stageSelect.options) option.disabled = !entry.stages[option.value];
    if (!entry.stages[stageSelect.value]) stageSelect.value = Object.keys(stageLabels).find(stage => entry.stages[stage]);
  }
  const levels = entry.stages ? entry.stages[stageSelect.value] : entry.levels;
  const roster = levels[levelSelect.value];
  const total = Object.values(roster.cards).reduce((sum, copies) => sum + copies, 0);
  const host = document.getElementById("roster");
  host.replaceChildren(el("h2", "", entry.name));
  host.append(el("p", "note", [
    cap(levelSelect.value), FAMILY_NAMES[entry.family] || "Mixed families",
    total + " cards", roster.hand + " in opening hand"
  ].join(" · ")));
  if (levelSelect.value === "easy" && entry.easyDeck) {
    const edit = el("a", "chip", "Edit this Easy deck →");
    edit.href = "#easy-mode/" + entry.easyDeck;
    host.append(edit);
  }
  if (entry.stages) host.append(el("p", "note", "Deck preview at this point in the story. Each guest has their own requirement for accepting a challenge."));
  if (roster.board.length) {
    host.append(el("p", "note", "Already on the table: " +
      roster.board.map(([lane, id]) => byId[id].n + " in lane " + lane).join(", ") + "."));
  }
  const list = el("div", "roster-list");
  const ids = Object.keys(roster.cards).sort((a, b) =>
    byId[a].c - byId[b].c || byId[a].n.localeCompare(byId[b].n));
  for (const id of ids) {
    const card = byId[id];
    const tile = el("div", "roster-card");
    const button = el("button", "face roster-face");
    button.append(art(card));
    button.append(el("strong", "", roster.cards[id] + " × " + card.n));
    const stats = entry.group === "Lessons" && (entry.name.endsWith("First lesson") || entry.name === "Practice table") && id === "rabbit"
      ? "1 attack · 1 health (practice)" : card.a + " attack · " + card.h + " health";
    button.append(el("span", "note", costText(card) + " · " + (card.t === "unit" ? stats : cap(card.t))));

    button.onclick = () => openCard(card);
    tile.append(button, cardEffect(card, "fx"));
    list.append(tile);
  }
  host.append(list);
}

stageSelect.onchange = showRoster;
levelSelect.onchange = showOpponents;
groupSelect.onchange = showOpponents;
opponentSelect.onchange = showRoster;
showOpponents();
