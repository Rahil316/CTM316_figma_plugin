/**
 * ============================================================================
 * CTM316 SCREEN: ROLES TAB
 * Renders the role cards into the sidebar.
 * ============================================================================
 */

const renderRoles = debounce(() => {
  if (activeSidebarTab !== "roles-config") return;
  withPreservedFocus(() => {
    const container = document.getElementById("sidebar-content-container");
    const fragment = document.createDocumentFragment();
    fragment.appendChild(inputsUI.actionButton("+ Add Color Role", addRole, { "data-action": "add-role" }));

    appState.roles.forEach((role, idx) => {
      const card = document.createElement("div");
      card.className = "bg-[var(--bg-card)] rounded-[12px] border border-[var(--border)] p-3 space-y-2 mb-3 role-card-plugin";

      bindDragDrop(card, idx, {
        cardSelector: ".role-card-plugin",
        getIdx: () => _roleDragSrcIdx,
        setIdx: (v) => {
          _roleDragSrcIdx = v;
        },
        onDrop: (src, dst) => {
          const [moved] = appState.roles.splice(src, 1);
          appState.roles.splice(dst, 0, moved);
          renderRoles();
          schedulePreview();
        },
      });

      Components.RoleGroupCard(role, idx, appState).forEach((node) => card.appendChild(node));
      card.querySelectorAll("input, select, button, label").forEach((el) => el.setAttribute("draggable", "false"));
      fragment.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}, 50);
