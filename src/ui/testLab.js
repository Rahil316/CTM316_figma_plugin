/**
 * ============================================================================
 * TEMP — Design Lab
 * Set LAB_ENABLED = true to expose the Design Lab entry point in More Options.
 * Delete this file and its <script> tag in ui.html when no longer needed.
 * ============================================================================
 */

const LAB_ENABLED = false;

(function () {
  if (!LAB_ENABLED) return;

  function init() {
    const moreSheet = document.getElementById("more-sheet");
    if (!moreSheet) return;

    const clearSection = moreSheet.querySelector("#opt-clear");
    const anchor = clearSection ? clearSection.closest("div") : null;

    const btn = document.createElement("button");
    btn.className = "w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-left hover:bg-[var(--bg-hover)] transition-all group";
    btn.innerHTML = `<span class="text-[18px]">⚗</span><div><div class="text-[13px] font-medium text-[var(--text-primary)]">Design Lab</div><div class="text-[11px] text-[var(--text-muted)]">Test role card variations</div></div>`;
    btn.onclick = () => {
      // Close the more sheet
      const closeBtn = document.getElementById("close-more");
      if (closeBtn) closeBtn.click();
      // TODO: open lab overlay if needed in the future
      // TODO (#design-lab): replace alert with actual overlay when Design Lab is implemented
      alert("Design Lab — not yet implemented.");
    };

    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(btn, anchor);
    } else {
      moreSheet.querySelector(".p-2")?.appendChild(btn);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
