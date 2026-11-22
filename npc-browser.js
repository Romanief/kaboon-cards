const levelSelect = document.getElementById("level");
const groupSelect = document.getElementById("group");
const opponentSelect = document.getElementById("opponent");
for (const level of ["easy", "medium", "hard", "impossible"]) {
  levelSelect.add(new Option(cap(level), level));
}
levelSelect.value = "medium";
for (const group of new Set(ENCOUNTERS.map(entry => entry.group))) {
  groupSelect.add(new Option(group));
}

function showOpponents() {
  opponentSelect.replaceChildren();
  ENCOUNTERS.forEach((entry, index) => {
    if (entry.group === groupSelect.value) {
      opponentSelect.add(new Option(entry.name, index));
    }
  });
  showRoster();
}

function showRoster() {
  const entry = ENCOUNTERS[opponentSelect.value];
  const roster = entry.levels[levelSelect.value];
  const total = Object.values(roster.cards).reduce((sum, copies) => sum + copies, 0);
  const host = document.getElementById("roster");
  host.replaceChildren(el("h2", "", entry.name));
  host.append(el("p", "note", [
    cap(levelSelect.value), FAMILY_NAMES[entry.family] || "Mixed families",
    total + " cards", roster.hand + " in opening hand"
  ].join(" · ")));
  if (roster.board.length) {
    host.append(el("p", "note", "Already on the table: " +
      roster.board.map(([lane, id]) => byId[id].n + " in lane " + lane).join(", ") + "."));
  }
  const list = el("div", "roster-list");
  const ids = Object.keys(roster.cards).sort((a, b) =>
    byId[a].c - byId[b].c || byId[a].n.localeCompare(byId[b].n));
  for (const id of ids) {
    const card = byId[id];
    const button = el("button", "roster-card");
    button.append(art(card));
    button.append(el("strong", "", roster.cards[id] + " × " + card.n));
    const stats = entry.group === "Lessons" && (entry.name.endsWith("First lesson") || entry.name === "Practice table") && id === "rabbit"
      ? "1 attack · 1 health (practice)" : card.a + " attack · " + card.h + " health";
    button.append(el("span", "note", costText(card) + " · " + (card.t === "unit" ? stats : cap(card.t))));
    button.append(el("span", "", effectText(card)));
    button.onclick = () => openCard(card);
    list.append(button);
  }
  host.append(list);
}

function showView() {
  const active = location.hash === "#npc-decks" ? "npc-decks" : "cards";
  for (const link of document.querySelectorAll("nav a")) {
    const id = link.hash.slice(1);
    document.getElementById(id).hidden = id !== active;
    if (id === active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

levelSelect.onchange = showRoster;
groupSelect.onchange = showOpponents;
opponentSelect.onchange = showRoster;
window.addEventListener("hashchange", showView);
showOpponents();
showView();
