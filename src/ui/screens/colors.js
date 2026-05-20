/**
 * ============================================================================
 * CTM316 SCREEN: PALETTE TAB
 * Renders the color group cards into the sidebar.
 * Also owns the shared drag-reorder helper used by both colors and roles.
 * ============================================================================
 */

// ── DRAG-DROP REORDER ─────────────────────────────────────────────────────────

function bindDragDrop(card, idx, { cardSelector, getIdx, setIdx, onDrop }) {
  card.draggable = true;
  card.addEventListener("dragstart", (e) => {
    setIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    card.style.opacity = "0.5";
  });
  card.addEventListener("dragend", () => {
    setIdx(null);
    card.style.opacity = "";
    document.querySelectorAll(cardSelector).forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
  });
  card.addEventListener("dragover", (e) => {
    const src = getIdx();
    if (src === null || src === idx) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(cardSelector).forEach((c) => c.classList.remove("border-t-2", "!border-t-[var(--accent)]"));
    card.classList.add("border-t-2", "!border-t-[var(--accent)]");
  });
  card.addEventListener("dragleave", (e) => {
    if (!card.contains(e.relatedTarget)) card.classList.remove("border-t-2", "!border-t-[var(--accent)]");
  });
  card.addEventListener("drop", (e) => {
    e.preventDefault();
    const src = getIdx();
    if (src === null || src === idx) return;
    onDrop(src, idx);
  });
}

// ── PALETTE SCREEN ────────────────────────────────────────────────────────────

const renderColorGroups = debounce(() => {
  if (activeSidebarTab !== "color-groups") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();
    fragment.appendChild(inputsUI.actionButton("+ Add Color", addGroup, { "data-action": "add-color" }));

    if (appState.colors.length === 0) {
      const empty = document.createElement("div");
      empty.className = "flex flex-col items-center justify-center py-12 px-4 text-center";
      empty.innerHTML = `
        <p class="text-[13px] font-medium text-[var(--text-muted)] mb-1">No colors yet</p>
        <p class="text-[11px] text-[var(--text-muted)] opacity-70">Click <strong>+ Add Color</strong> above to add your first palette color. Each color generates a full tonal scale used across all roles.</p>
      `;
      fragment.appendChild(empty);
    }

    appState.colors.forEach((group, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-3 color-group-card-plugin shadow-sm hover:shadow-md transition-all group relative overflow-hidden";

      bindDragDrop(card, idx, {
        cardSelector: ".color-group-card-plugin",
        getIdx: () => _colorDragSrcIdx,
        setIdx: (v) => { _colorDragSrcIdx = v; },
        onDrop: (src, dst) => {
          const [moved] = appState.colors.splice(src, 1);
          appState.colors.splice(dst, 0, moved);
          renderColorGroups();
          schedulePreview();
        },
      });

      Components.ColorGroupCard(group, idx, appState).forEach((node) => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);
