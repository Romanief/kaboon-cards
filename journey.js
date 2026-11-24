/* The exported document is also the game's data/easy_progression.json. */
const journeyAddCard = (() => {
  const get = id => document.getElementById(id);
  const storageKey = id => "kaboon.easy.deck.v1." + id;
  const size = cards => Object.values(cards).reduce((a, b) => a + b, 0);
  const stageKey = deck => deck.id.replace(/_(warriors|beasts|robots|fairies)$/, "");
  const feature = {cogsworth:"shieldprojector", oren:"commander", fenwick:"angler", aster:"moonarchivist",
    rowan:"oathmarshal", vesper:"banshee", alder:"appletree", bramble:"denmatron", final_bram:"dawnsquire"};
  function illustration(deck) {
    const cards = level === "easy" ? deck.cards : rosters.get(deck.id).medium.cards;
    const featured = feature[deck.id];
    return art(byId[cards[featured] ? featured : Object.keys(cards)[0]]);
  }
  const rosters = new Map(ENCOUNTERS.filter(e => e.easyDeck).map(e => [e.easyDeck, e.levels]));
  let level = "easy";
  let source, selected, current = {}, drafts = new Map();

  function validCounts(value) {
    return value && typeof value === "object" && !Array.isArray(value) && size(value) <= 30 &&
      Object.entries(value).every(([id, qty]) => byId[id] && !byId[id].tok &&
        Number.isInteger(qty) && qty > 0 && qty <= (LIMIT[byId[id].r] || 30));
  }
  function status(text) { get("draft-status").textContent = text; }
  function changed() {
    return Object.keys({...selected.cards,...current}).some(id => selected.cards[id] !== current[id]);
  }
  function persist() {
    if (changed()) drafts.set(selected.id, {...current});
    else drafts.delete(selected.id);
    try {
      if (changed()) localStorage.setItem(storageKey(selected.id), JSON.stringify(current));
      else localStorage.removeItem(storageKey(selected.id));
      status(changed() ? "Draft saved in this browser" : "Original deck");
    } catch { status("Browser storage unavailable · export to keep edits"); }
  }
  function adjust(id, amount) {
    const card = byId[id], qty = current[id] || 0;
    if (amount > 0 && size(current) >= 30) return "Deck is full (30 cards)";
    if (amount > 0 && qty >= (LIMIT[card.r] || 30)) return "Copy limit reached";
    if (qty + amount <= 0) delete current[id];
    else current[id] = qty + amount;
    persist();
    renderContents();
    if (get("journey-picker").open) renderPicker();
    return (current[id] || 0) + " × " + card.n + " in deck";
  }
  function tile(card, picker) {
    const qty = current[card.id] || 0;
    const host = el("article","j-card");
    host.style.setProperty("--c","var(--" + card.r + ")");
    const view = el("button","face");
    view.setAttribute("aria-label","View " + card.n);
    view.onclick = () => openCard(card);
    view.append(art(card), el("strong","",card.n));
    const metrics = card.t === "unit" ? card.a + " ATK · " + card.h + " HP" : cap(card.t);
    const controls = el("div",level === "easy" ? "j-step" : "");
    function step(delta) {
      const button = el("button","",delta < 0 ? "−" : "+");
      const action = delta < 0 ? "Remove" : "Add";
      button.setAttribute("aria-label", action + " one " + card.n);
      button.dataset.step = card.id + action;
      button.disabled = delta < 0 ? !qty : size(current) >= 30 || qty >= (LIMIT[card.r] || 30);
      button.onclick = () => {
        adjust(card.id,delta);
        const root = get(picker ? "picker-cards" : "journey-grid");
        const next = root.querySelector('[data-step="' + button.dataset.step + '"]:enabled') ||
          root.querySelector('[data-step]:enabled') || get("pick-card");
        next.focus({preventScroll:true});
      };
      return button;
    }
    const copies = el("span","",qty + " ×");
    if (level === "easy") controls.append(step(-1), copies, step(1));
    else controls.append(el("small", "", qty + (qty === 1 ? " copy" : " copies")));
    const details = el("small");
    details.append(rarityLabel(card), " · " + costText(card) + " · " + metrics);
    host.append(view, details, controls);
    return host;
  }
  function renderContents() {
    const count = size(current);
    let units = 0;
    for (const [id,qty] of Object.entries(current)) if (byId[id].t === "unit") units += qty;
    get("journey-total").textContent = count + " cards · " + units + " units · " + (count-units) +
      " support · " + rosters.get(selected.id)[level].hand + " in opening hand" + (count < 10 ? " · Add " + (10-count) + " to export" : "");
    get("journey-description").textContent = level === "medium" ? "" : changed() ? "Original deck · " + selected.subtitle : selected.subtitle;
    get("restore-deck").disabled = !changed();
    get("journey-grid").replaceChildren(...Object.keys(current).map(id => tile(byId[id],false)));
  }
  function renderPicker() {
    const family = get("picker-family").value;
    const query = get("picker-search").value.toLowerCase().trim();
    const matches = SORTED.filter(c => !c.tok && (!family || c.d === family) &&
      (c.n + " " + effectText(c)).toLowerCase().includes(query));
    get("picker-target").textContent = selected.title + " · " + size(current) + "/30 cards";
    get("picker-cards").replaceChildren(...(matches.length ? matches.map(c => tile(c,true)) :
      [el("p","note","No matching cards.")]));
  }
  function select() {
    const [section, id] = location.hash.slice(1).split("/");
    if (!source || !["easy-mode", "medium-mode"].includes(section)) return;
    const medium = section === "medium-mode";
    level = medium ? "medium" : "easy";
    const playable = medium ? source.decks : source.decks.filter(d => playableEasyDeck(d.id) === d.id);
    selected = playable.find(d => d.id === (medium ? id : playableEasyDeck(id))) || playable[0];
    current = medium ? rosters.get(selected.id).medium.cards : {...(drafts.get(selected.id) || selected.cards)};
    get("progression-title").textContent = cap(level) + " progression";
    for (const element of [get("pick-card"), get("journey-description"), get("restore-deck").parentElement, get("draft-status").parentElement]) {
      element.hidden = medium;
    }
    const stages = new Map();
    for (const d of playable) {
      const key = stageKey(d);
      if (!stages.has(key)) stages.set(key, []);
      stages.get(key).push(d);
    }
    const route = get("journey-route");
    route.replaceChildren();
    for (const [key, decks] of stages) {
      const active = key === stageKey(selected);
      const d = active ? selected : decks.find(d => d.family === selected.family) || decks[0];
      const link = el("a","route-stop");
      link.href = "#" + section + "/" + d.id;
      if (active) link.setAttribute("aria-current","step");
      link.append(illustration(d),el("span","",d.title.split(" · ")[0]));
      route.append(link);
    }
    const variants = get("journey-variants");
    variants.replaceChildren();
    const group = stages.get(stageKey(selected));
    if (group.length > 1) for (const d of group) {
      const b = el("button","chip",FAMILY_NAMES[d.family]);
      b.setAttribute("aria-pressed",d === selected);
      b.onclick = () => {location.hash = section + "/" + d.id;};
      variants.append(b);
    }
    get("journey-stage").textContent = cap(level) + "  /  " + (FAMILY_NAMES[selected.family] || "Mixed families");
    get("journey-name").textContent = selected.title.split(" · ")[0];
    const activeStop = route.querySelector("[aria-current]");
    if (route.scrollWidth > route.clientWidth) {
      route.scrollLeft += activeStop.getBoundingClientRect().left - route.getBoundingClientRect().left -
        (route.clientWidth - activeStop.offsetWidth) / 2;
    }
    get("journey-feature").replaceChildren(illustration(selected));
    status(changed() ? "Local draft" : "Original deck");
    renderContents();
  }
  get("restore-deck").onclick = () => {
    if (!confirm("Restore the original " + selected.title + " deck and discard its local edits?")) return;
    current = {...selected.cards};
    persist();
    renderContents();
  };
  get("picker-family").add(new Option("All families",""));
  for (const f of FAMS) get("picker-family").add(new Option(FAMILY_NAMES[f],f));
  get("pick-card").onclick = () => {
    get("picker-search").value = "";
    get("picker-family").value = FAMS.includes(selected.family) ? selected.family : "";
    renderPicker();
    get("journey-picker").showModal();
    get("picker-search").focus();
  };
  get("picker-search").oninput = renderPicker;
  get("picker-family").onchange = renderPicker;
  get("close-picker").onclick = () => get("journey-picker").close();
  function exportDocument() {
    const decks = source.decks.map(d => ({...d,cards:drafts.get(d.id) || d.cards}));
    const incomplete = decks.find(d => size(d.cards) < 10);
    if (incomplete) {
      alert(incomplete.title + " needs " + (10-size(incomplete.cards)) + " more cards before export.");
      location.hash = "easy-mode/" + incomplete.id;
      return;
    }
    return new Blob([JSON.stringify({...source,decks},null,2) + "\n"],{type:"application/json"});
  }
  get("save-game-decks").onclick = async () => {
    const blob = exportDocument();
    if (!blob) return;
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName:"easy_progression.json",
        types:[{description:"Kaboon progression",accept:{"application/json":[".json"]}}]
      });
      if (handle.name !== "easy_progression.json") {
        status("Choose the game's Source/data/easy_progression.json file.");
        return;
      }
      const file = await handle.createWritable();
      await file.write(blob);
      await file.close();
      status("Saved to " + handle.name + ". The game reads it at the next Easy deal.");
    } catch (error) {
      if (error.name !== "AbortError") status("File save unavailable. Use Export decks to download a copy.");
    }
  };
  get("export-journey").onclick = () => {
    const blob = exportDocument();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = "easy_progression.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    status("To apply in Kaboon, replace Source/data/easy_progression.json with your export.");
  };
  async function load() {
    try {
      const response = await fetch("easy_progression.json?v=20261124-7");
      if (!response.ok) throw Error(response.status);
      source = await response.json();
      for (const d of source.decks) {
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey(d.id)));
          if (validCounts(saved)) drafts.set(d.id,saved);
        } catch { /* An unreadable draft falls back to its original deck. */ }
      }
      select();
      get("journey-load").hidden = true;
      get("journey-layout").hidden = false;
      get("export-journey").disabled = false;
      get("save-game-decks").hidden = !window.showSaveFilePicker;
      get("save-game-decks").title = "Choose Kaboon/Source/data/easy_progression.json";
    } catch { get("journey-load").textContent = "Decks could not load. Open Kaboon Cards over HTTP and refresh."; }
  }
  window.addEventListener("hashchange",select);
  load();
  return id => adjust(id,1);
})();
