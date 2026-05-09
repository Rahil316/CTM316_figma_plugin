/**
 * ============================================================================
 * CTM316 UI COMPONENTS
 * Pure functional templates for building the UI.
 * These functions return HTML strings and do not manage state directly.
 * ============================================================================
 */

const Icons = {
  Trash: `<svg width="14" height="14" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>`
};

const Components = {
  /**
   * Renders a Color Group card for the sidebar.
   * @param {Object} group - Color object.
   * @param {number} idx - Index in the collection.
   * @param {Object} config - Current app state.
   */
  ColorGroupCard: (group, idx, config) => {
    const gId = `group-${idx}`;
    const hexValue = normalizeHex(group.value) || "#000000";
    const lightBgHex = normalizeHex(config.themes[0].bg) || "#FFFFFF";
    const darkBgHex = normalizeHex(config.themes[1].bg) || "#000000";
    const lightC = contrastRatio(hexValue, lightBgHex);
    const darkC = contrastRatio(hexValue, darkBgHex);

    return `
      <div class="color-group-card-plugin bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] p-4 space-y-4 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
        <div class="grid grid-cols-[20px_1fr_1fr_40px] gap-2">
          <div class="flex flex-col gap-0.5 self-center">
            <button onclick="moveGroup(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move up">▲</button>
            <span class="drag-handle text-[var(--text-muted)] cursor-grab select-none text-[14px] leading-none text-center" title="Drag to reorder">⠿</span>
            <button onclick="moveGroup(${idx}, 1)" ${idx === config.colors.length - 1 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move down">▼</button>
          </div>
          <div class="flex-[3] space-y-1">
            <label for="${gId}-name" class="text-[var(--text-muted)] text-[12px] font-medium">Color Name</label>
            <input type="text" id="${gId}-name" value="${group.name}" oninput="updateGroup(${idx}, 'name', this.value)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
          </div>
          <div class="flex-[4] space-y-1">
            <label for="${gId}-hex" class="text-[var(--text-muted)] text-[12px] font-medium">Source Color</label>
            <div class="flex items-center gap-2 w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 pl-1 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px]">
                <input type="color" value="${hexValue}" onchange="updateGroup(${idx}, 'value', this.value)" class="cursor-pointer size- bg-transparent border-none rounded-[8px]">
                <input type="text" id="${gId}-hex" value="${group.value}" oninput="updateGroup(${idx}, 'value', this.value, this)" class="w-full bg-transparent text-[13px] uppercase outline-none text-[var(--text-primary)]">
            </div>
          </div>
          <button onclick="removeGroup(${idx})" class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 self-end size-[40px] flex items-center justify-center rounded-[8px] transition-all hover:bg-[var(--danger)]/20">
            <svg width="16" height="16" viewBox="0 0 12 14" fill="none"><path d="M8.00021 1.98568C8.00021 1.4562 7.5944 1.03371 7.09136 1.01758C6.72911 1.00599 6.36531 1 6.00021 1C5.63511 1 5.27131 1.00599 4.90906 1.01758C4.40602 1.03371 4.00021 1.4562 4.00021 1.98568V2.0612C4.6618 2.02102 5.32864 2 6.00021 2C6.67179 2 7.33862 2.02102 8.00021 2.0612V1.98568ZM6.00021 3C5.17177 3 4.35078 3.03229 3.53862 3.09505C2.92606 3.14239 2.31853 3.20784 1.71636 3.28971L2.39214 12.0768C2.43227 12.5978 2.86704 13 3.38953 13H8.61089C9.13338 13 9.56815 12.5978 9.60828 12.0768L10.2834 3.28971C9.68144 3.20789 9.07415 3.14237 8.4618 3.09505C7.64964 3.03229 6.82865 3 6.00021 3ZM4.15386 4.50065C4.42969 4.49004 4.66196 4.70468 4.67274 4.98047L4.90386 10.9805C4.91447 11.2564 4.69927 11.4887 4.42339 11.4993C4.14756 11.51 3.91529 11.2953 3.90451 11.0195L3.67339 5.01953C3.66278 4.74367 3.87803 4.51138 4.15386 4.50065ZM7.84656 4.50065C8.12239 4.51138 8.33764 4.74367 8.32703 5.01953L8.09591 11.0195C8.08513 11.2953 7.85287 11.51 7.57703 11.4993C7.30115 11.4887 7.08595 11.2564 7.09656 10.9805L7.32768 4.98047C7.33846 4.70468 7.57073 4.49004 7.84656 4.50065ZM9.00021 2.13737C9.63667 2.19563 10.2681 2.27144 10.8934 2.36589C11.125 2.40085 11.3556 2.43869 11.5855 2.47852C11.8575 2.52564 12.04 2.78399 11.993 3.05599C11.9459 3.32806 11.687 3.51064 11.4149 3.46354C11.3684 3.45548 11.3216 3.44861 11.2749 3.44076L10.605 12.1536C10.5247 13.1955 9.65587 14 8.61089 14H3.38953C2.34455 14 1.47568 13.1955 1.39539 12.1536L0.72482 3.44076C0.678419 3.44858 0.631829 3.45552 0.585497 3.46354C0.313427 3.51064 0.0545012 3.32806 0.00737211 3.05599C-0.0396145 2.78399 0.142913 2.52563 0.414924 2.47852C0.644818 2.43869 0.875465 2.40085 1.10698 2.36589C1.73236 2.27144 2.36375 2.19563 3.00021 2.13737V1.98568C3.00021 0.9427 3.80857 0.0524197 4.87716 0.0182292C5.25006 0.00630041 5.62445 0 6.00021 0C6.37597 0 6.75036 0.00630037 7.12326 0.0182292C8.19185 0.0524197 9.00021 0.9427 9.00021 1.98568V2.13737Z" fill="currentColor"/></svg>
          </button>
        </div>
        <div class="grid grid-cols-[1fr_1fr_1fr] items-end gap-2">
          <div class="flex-[3] space-y-1">
            <label for="${gId}-shorthand" class="text-[var(--text-muted)] text-[12px] font-medium">Shorthand</label>
            <input type="text" id="${gId}-shorthand" value="${group.shorthand}" oninput="updateGroup(${idx}, 'shorthand', this.value)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
          </div>
          <div class="flex-[3.5] space-y-1">
            <span class="text-[var(--text-muted)] text-[12px] font-medium">Light Contrast</span>
            <div class="h-[40px] bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-[8px] px-2 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
              <span>${lightC.toFixed(2)}:1</span>
              <span class="font-bold ${lightC >= 4.5 ? "text-[var(--success)]" : lightC >= 3 ? "text-[var(--warning)]" : "text-[var(--danger)]"}">${contrastRating(hexValue, lightBgHex)}</span>
            </div>
          </div>
          <div class="flex-[3.5] space-y-1">
            <span class="text-[var(--text-muted)] text-[12px] font-medium">Dark Contrast</span>
            <div class="h-[40px] bg-[var(--bg-input)]/30 border border-[var(--border)] rounded-[8px] px-2 flex items-center justify-between text-[12px] text-[var(--text-primary)]">
              <span>${darkC.toFixed(2)}:1</span>
              <span class="font-bold ${darkC >= 4.5 ? "text-[var(--success)]" : darkC >= 3 ? "text-[var(--warning)]" : "text-[var(--danger)]"}">${contrastRating(hexValue, darkBgHex)}</span>
            </div>
          </div>
        </div>
        ${config.pluginMode === "direct" ? `
        <div class="space-y-1">
          <label class="text-[var(--text-muted)] text-[12px] font-medium">Color Solver</label>
          <select onchange="updateGroup(${idx}, 'solverMode', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] appearance-none cursor-pointer">
            <option value="natural"          ${(group.solverMode || "natural") === "natural" ? "selected" : ""}>Balanced — adjusts hue and vibrancy naturally</option>
            <option value="saturated"        ${(group.solverMode || "natural") === "saturated" ? "selected" : ""}>Vivid — preserves saturation, adjusts brightness only</option>
            <option value="luminance"        ${(group.solverMode || "natural") === "luminance" ? "selected" : ""}>Muted — fades toward neutral at low/high lightness</option>
            <option value="hue-locked"       ${(group.solverMode || "natural") === "hue-locked" ? "selected" : ""}>Hue Faithful — locks hue angle, adjusts brightness and vibrancy</option>
            <option value="chroma-maximized" ${(group.solverMode || "natural") === "chroma-maximized" ? "selected" : ""}>Max Vibrancy — most saturated color that meets contrast</option>
          </select>
        </div>` : ""}
        ${config.includeDescriptions ? `
        <div class="space-y-1">
          <label for="${gId}-desc" class="text-[var(--text-muted)] text-[12px] font-medium">Description</label>
          <input type="text" id="${gId}-desc" value="${(group.description || "").replace(/"/g, "&quot;")}" oninput="updateGroup(${idx}, 'description', this.value)" placeholder="Color description (optional)" class="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[14px] outline-none focus:border-[var(--border-focus)] h-[40px] text-[var(--text-primary)]">
        </div>` : ""}
      </div>
    `;
  },

  /**
   * Renders a Color Role card for the sidebar.
   * @param {Object} role - Role object.
   * @param {number} idx - Index in the collection.
   * @param {Object} config - Current app state.
   * @param {string} secondRowHtml - Pre-rendered second row HTML.
   * @param {string} overrideSection - Pre-rendered override section HTML.
   */
  RoleGroupCard: (role, idx, config, secondRowHtml, overrideSection) => {
    return `
      <div class="flex items-end gap-2">
        <div class="flex flex-col gap-0.5 self-center flex-shrink-0">
          <button onclick="moveRole(${idx}, -1)" ${idx === 0 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move up">▲</button>
          <span class="drag-handle text-[var(--text-muted)] cursor-grab select-none text-[14px] leading-none text-center" title="Drag to reorder">⠿</span>
          <button onclick="moveRole(${idx}, 1)" ${idx === config.roles.length - 1 ? "disabled" : ""} class="w-5 h-5 flex items-center justify-center rounded-[4px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-20 disabled:cursor-not-allowed transition-all" title="Move down">▼</button>
        </div>
        <div class="flex-1 space-y-1">
          <label for="role-${idx}-name" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Role Name</label>
          <div class="flex items-center gap-1">
            <input type="text" id="role-${idx}-name" value="${role.name || ""}" oninput="updateRole(${idx}, 'name', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
          </div>
        </div>
        <div class="w-[72px] space-y-1">
          <label for="role-${idx}-shorthand" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Shorthand</label>
          <input type="text" id="role-${idx}-shorthand" value="${role.shorthand || ""}" oninput="updateRole(${idx}, 'shorthand', this.value)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
        </div>
        <button onclick="removeRole(${idx})" class="bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 size-[40px] shrink-0 flex items-center justify-center rounded-[8px] transition-all hover:bg-[var(--danger)]/20">${Icons.Trash}</button>
      </div>
      ${config.includeDescriptions ? `
      <div class="space-y-1">
        <label for="role-${idx}-desc" class="text-[var(--text-muted)] text-[11px] font-bold tracking-wider ml-1">Description</label>
        <input type="text" id="role-${idx}-desc" value="${(role.description || "").replace(/"/g, "&quot;")}" oninput="updateRole(${idx}, 'description', this.value)" placeholder="Role description (optional)" class="w-full h-[40px] bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] p-2 text-[13px] outline-none focus:border-[var(--border-focus)] text-[var(--text-primary)]">
      </div>` : ""}
      ${secondRowHtml}
      ${overrideSection}
    `;
  }
};
