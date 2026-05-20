/**
 * ============================================================================
 * CTM316 SCREEN: PROJECT TAB
 * Renders the project name input and themes list into the sidebar.
 * ============================================================================
 */

function renderSidebarProject() {
  const container = document.getElementById("sidebar-content-container");
  if (!container) return;
  container.innerHTML = "";

  container.appendChild(
    el("div", { class: "space-y-4 p-1" }, [
      panelUI.input({ value: appState.name || "", placeholder: "CTM316", label: "Project Name", size: "md", oninput: (e) => updateProjectName(e.target.value) }),
      el("div", { class: "space-y-2" }, [
        el("div", { class: "flex items-center justify-between" }, [
          el("label", { class: "text-[11px] text-[var(--text-muted)] font-medium ml-1" }, ["Themes (modes)"]),
          el("button", {
            onclick: () => { addTheme(); renderSidebarProject(); },
            class: "h-[26px] px-2 text-[11px] font-medium rounded-[6px] text-[var(--accent)] hover:bg-[var(--bg-hover)] border border-dashed border-[var(--border)] transition-colors",
          }, ["+ Add theme"]),
        ]),
        el("div", { id: "project-themes-list", class: "space-y-1.5" }),
      ]),
    ]),
  );

  renderSettingsThemes("project-themes-list");
}
