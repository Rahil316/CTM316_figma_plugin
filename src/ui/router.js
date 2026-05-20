/**
 * ============================================================================
 * CTM316 ROUTER
 * Single owner of all screen and overlay visibility.
 * No appState mutations — pure show/hide logic.
 * ============================================================================
 */

// ── COLLAPSIBLE SECTIONS ──

function toggleSection(id, event) {
  if (event && event.target.closest("button")) return;
  const section = document.getElementById(id);
  const isCollapsed = section.classList.toggle("collapsed");
  const trigger = section.querySelector('[role="button"]');
  if (trigger) trigger.setAttribute("aria-expanded", !isCollapsed);
}

// ── SHEETS & OVERLAYS ──

function showSheet(id) {
  const sheet = document.getElementById(id);
  sheet.removeAttribute("inert");
  sheet.classList.add("open");
  document.getElementById("overlay").classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideSheets() {
  document.querySelectorAll(".bottom-sheet").forEach((s) => {
    s.classList.remove("open");
    s.setAttribute("inert", "");
  });
  document.getElementById("overlay").classList.remove("active");
  document.body.style.overflow = "";
}

function showOverlay(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hideOverlay(id) {
  document.getElementById(id).classList.add("hidden");
  if (id === "success-overlay" || id === "error-overlay") hideSheets();
}

// ── SETTINGS TABS ──

function switchSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((btn) =>
    btn.classList.toggle("active", btn.dataset.tab === tab)
  );
  document.querySelectorAll(".settings-panel").forEach((panel) =>
    panel.classList.toggle("hidden", panel.dataset.panel !== tab)
  );
}

// ── DIALOGUE FACTORY ──
// Builds a confirm dialog into a named overlay slot and shows it.
//
// layout: "card"  — compact, card-wrapped, row of buttons (default)
//         "sheet" — centered, no wrapper, optional icon node, stacked buttons

function createDialogue(targetID, {
  title   = "Are you sure?",
  body    = "",
  icon    = null,
  buttons = [{ label: "Cancel" }],
  layout  = "card",
} = {}) {
  const slot = document.getElementById(targetID);
  if (!slot) return;
  slot.innerHTML = "";

  const mkBtn = ({ label, variant = "secondary", id = null, action }) =>
    inputsUI.btn(variant, {
      id,
      label,
      size:  layout === "sheet" ? "xl" : "lg",
      class: layout === "sheet" ? "w-full" : "flex-1",
      onclick: () => { hideOverlay(targetID); action?.(); },
    });

  const btnContainer = el(
    "div",
    { class: layout === "sheet" ? "w-full space-y-3" : "flex gap-2 w-full" },
    buttons.map(mkBtn),
  );

  if (layout === "sheet") {
    if (icon) slot.appendChild(icon);
    slot.appendChild(el("div", {}, [
      el("h2", { class: "text-2xl font-bold mb-2" }, title),
      body ? el("p", { class: "text-[var(--text-muted)] text-sm leading-relaxed" }, body) : null,
    ].filter(Boolean)));
    slot.appendChild(btnContainer);
  } else {
    slot.appendChild(
      el("div", { class: "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] max-w-[calc(100vw-40px)] min-w-[280px] m-auto" }, [
        el("div", { class: "space-y-4 p-4 w-full" }, [
          el("p", { class: "text-[15px] font-semibold text-[var(--text-primary)]" }, title),
          body ? el("p", { class: "text-[12px] text-[var(--text-muted)] leading-relaxed" }, body) : null,
          btnContainer,
        ].filter(Boolean)),
      ])
    );
  }

  hideSheets();
  showOverlay(targetID);
}

// ── SIDEBAR TABS ──
// Mutates activeSidebarTab and triggers the appropriate screen renderer.

function switchSidebarTab(tab) {
  activeSidebarTab = tab;
  document.querySelectorAll(".sidebar-tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  if (tab === "color-groups") renderColorGroups();
  else if (tab === "roles-config") renderRoles();
  else if (tab === "project") renderSidebarProject();
}
