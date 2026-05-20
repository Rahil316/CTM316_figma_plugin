/**
 * ============================================================================
 * CTM316 UI OUTPUT
 * All plugin output and feedback: notification banners, live preview rendering,
 * import/export coordination, and Figma sync dispatch.
 * ============================================================================
 */

// ── TOAST HUB ────────────────────────────────────────────────────────────────
//
// Lightweight stacking toast system. Toasts appear at bottom-center,
// stack upward, and self-dismiss after a configurable timeout.
//
// API:
//   ToastManager.show(message, opts)   → id
//   ToastManager.success(message, opts)
//   ToastManager.error(message, opts)
//   ToastManager.info(message, opts)
//   ToastManager.warn(message, opts)
//   ToastManager.dismiss(id)
//
// opts: { timeout (ms, default 2000), icon }

const ToastManager = (() => {
  const TYPES = {
    success: { icon: "✓", bg: "rgba(34,197,94,.15)", border: "rgba(34,197,94,.35)", text: "rgb(134,239,172)" },
    error: { icon: "✕", bg: "rgba(239,68,68,.15)", border: "rgba(239,68,68,.35)", text: "rgb(252,165,165)" },
    info: { icon: "ℹ", bg: "rgba(59,130,246,.15)", border: "rgba(59,130,246,.35)", text: "rgb(147,197,253)" },
    warn: { icon: "⚠", bg: "rgba(234,179,8,.15)", border: "rgba(234,179,8,.35)", text: "rgb(253,224,71)" },
    neutral: { icon: "·", bg: "rgba(255,255,255,.07)", border: "rgba(255,255,255,.14)", text: "rgba(255,255,255,.8)" },
  };
  const DEFAULT_TIMEOUT = 2000;
  const MAX_STACK = 5;
  const _timers = new Map();
  let _uid = 0;

  function _hub() {
    return document.getElementById("toast-hub");
  }

  function _remove(id) {
    clearTimeout(_timers.get(id));
    _timers.delete(id);
    const node = document.getElementById("toast-" + id);
    if (!node) return;
    node.style.opacity = "0";
    node.style.transform = "translateY(8px) scale(0.96)";
    setTimeout(() => node && node.remove(), 220);
  }

  function show(message, opts = {}) {
    const hub = _hub();
    if (!hub) return;
    const type = TYPES[opts.type] || TYPES.neutral;
    const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
    const id = ++_uid;

    // cap stack
    const existing = hub.querySelectorAll(".toast-item");
    if (existing.length >= MAX_STACK) existing[0].remove();

    const node = document.createElement("div");
    node.id = "toast-" + id;
    node.className = "toast-item";
    node.style.cssText = `
      display:flex;align-items:center;gap:7px;
      padding:7px 12px 7px 10px;
      border-radius:8px;
      border:1px solid ${type.border};
      background:${type.bg};
      color:${type.text};
      font-size:11px;font-weight:500;
      backdrop-filter:blur(8px);
      box-shadow:0 4px 16px rgba(0,0,0,.3);
      pointer-events:auto;cursor:default;
      opacity:0;transform:translateY(10px) scale(0.97);
      transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.3,1);
    `;
    node.innerHTML = `<span style="font-size:12px;opacity:.9">${opts.icon || type.icon}</span><span>${message}</span>`;
    node.onclick = () => _remove(id);

    hub.appendChild(node);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        node.style.opacity = "1";
        node.style.transform = "translateY(0) scale(1)";
      }),
    );

    if (timeout > 0)
      _timers.set(
        id,
        setTimeout(() => _remove(id), timeout),
      );
    return id;
  }

  const success = (msg, opts) => show(msg, { type: "success", ...opts });
  const error = (msg, opts) => show(msg, { type: "error", ...opts });
  const info = (msg, opts) => show(msg, { type: "info", ...opts });
  const warn = (msg, opts) => show(msg, { type: "warn", ...opts });
  const dismiss = (id) => _remove(id);

  return { show, success, error, info, warn, dismiss };
})();

// ── BANNERS ──────────────────────────────────────────────────────────────────
//
// BannerManager — self-contained notification banner system.
//
// MODES:
//   Stack    — multiple banners visible at once (default for show())
//   Queue    — one at a time; next appears when current is dismissed
//   Carousel — one at a time with prev/next navigation + optional auto-advance
//
// QUICK API:
//   BannerManager.show(config)             → id  (stack)
//   BannerManager.queue([config, ...])          (sequential)
//   BannerManager.enqueue(config)               (add to running queue)
//   BannerManager.carousel([config, ...], opts) (carousel)
//   BannerManager.warn / .error / .info / .success(message, opts)
//   BannerManager.remove(id)
//   BannerManager.clear()
//   BannerManager.has(id) → bool

const BannerManager = (() => {
  const CLASSES = {
    banner: "banner relative overflow-hidden border-b border-[var(--bn-border,rgba(255,255,255,.1))] bg-[var(--bn-bg,rgba(255,255,255,.04))]",
    clickable: "banner--clickable cursor-pointer hover:bg-white/[0.03]",
    body: "banner__body flex items-start gap-2 px-3 py-2 cursor-default",
    icon: "banner__icon text-[12px] text-[var(--bn-icon)] shrink-0 mt-[1px] leading-[1.5]",
    content: "banner__content flex-1 min-w-0",
    title: "banner__title text-[11px] font-bold text-[var(--bn-text)] mb-0.5",
    message: "banner__message text-[11px] text-[var(--bn-text)] leading-[1.5] opacity-90",
    detail: "banner__detail text-[11px] text-[var(--bn-text)] opacity-70 leading-[1.5] mt-1.5 pt-1.5 border-t border-[var(--bn-border)]",
    expand: "banner__expand inline-block mt-1 text-[10px] text-[var(--bn-icon)] opacity-80 bg-none border-none p-0 cursor-pointer underline underline-offset-2 hover:opacity-100",
    actions: "banner__actions flex gap-1.5 mt-1.5 flex-wrap",
    action: "banner__action text-[10px] px-2.5 py-1 rounded border border-[var(--bn-border)] bg-none text-[var(--bn-text)] cursor-pointer transition-colors hover:bg-white/[0.07]",
    actionPrimary: "bn-primary bg-[var(--bn-icon)] !text-black border-transparent font-semibold hover:opacity-80",
    dismiss: "banner__dismiss shrink-0 w-[18px] h-[18px] flex items-center justify-center rounded-[3px] bg-none border-none text-[var(--bn-text)] opacity-35 cursor-pointer text-[10px] mt-[1px] transition-opacity hover:opacity-100",
    barWrap: "banner__bar-wrap h-[2px] bg-[var(--bn-border)]",
    bar: "banner__bar h-full w-full bg-[var(--bn-icon)]",
    nav: "bn-carousel__nav flex items-center justify-center gap-1.5 px-3 py-1 bg-[var(--bn-bg)] border-b border-[var(--bn-border)]",
    dot: "bn-carousel__dot w-1.5 h-1.5 rounded-full bg-[var(--bn-text)] opacity-30 border-none p-0 cursor-pointer transition-opacity",
    dotActive: "active opacity-100",
    arrow: "bn-carousel__arrow bg-none border-none text-[var(--bn-text)] opacity-45 cursor-pointer text-[13px] px-0.5 leading-none transition-opacity hover:enabled:opacity-100 disabled:opacity-15 disabled:cursor-default",
    count: "bn-carousel__count text-[10px] text-[var(--bn-text)] opacity-45",
    queueMore: "bn-queue__more text-[10px] px-3 py-1 text-right text-[var(--bn-text)] opacity-45 bg-[var(--bn-bg)] border-b border-[var(--bn-border)]",
  };

  const CSS = `
    .banner--warning { --bn-bg:rgba(234,179,8,.09);  --bn-border:rgba(234,179,8,.28);  --bn-text:rgb(253,224,71);  --bn-icon:rgb(250,204,21); }
    .banner--error   { --bn-bg:rgba(239,68,68,.09);  --bn-border:rgba(239,68,68,.28);  --bn-text:rgb(252,165,165); --bn-icon:rgb(248,113,113);}
    .banner--info    { --bn-bg:rgba(59,130,246,.09); --bn-border:rgba(59,130,246,.28); --bn-text:rgb(147,197,253); --bn-icon:rgb(96,165,250); }
    .banner--success { --bn-bg:rgba(34,197,94,.09);  --bn-border:rgba(34,197,94,.28);  --bn-text:rgb(134,239,172); --bn-icon:rgb(74,222,128); }
    .banner--neutral { --bn-bg:rgba(255,255,255,.03);--bn-border:rgba(255,255,255,.09);--bn-text:rgba(255,255,255,.55);--bn-icon:rgba(255,255,255,.4);}
    .bn-hidden { display:none !important; }
  `;

  (function injectCSS() {
    if (document.getElementById("__bm-styles__")) return;
    const s = document.createElement("style");
    s.id = "__bm-styles__";
    s.textContent = CSS;
    document.head.appendChild(s);
  })();

  const TYPES = {
    warning: { icon: "⚠", cls: "banner--warning" },
    error: { icon: "✕", cls: "banner--error" },
    info: { icon: "ℹ", cls: "banner--info" },
    success: { icon: "✓", cls: "banner--success" },
    neutral: { icon: "·", cls: "banner--neutral" },
  };

  const _timers = new Map();
  let _queueList = [];
  let _queueBusy = false;
  let _carouselWrap = null;
  let _carouselData = [];
  let _carouselIdx = 0;
  let _carouselAutoTimer = null;
  let _carouselOpts = {};

  function _slot() {
    return document.getElementById("banner-slot");
  }
  function _uid() {
    return "bn-" + Math.random().toString(36).slice(2, 8);
  }

  function _animOut(el, cb) {
    const h = el.offsetHeight;
    el.style.cssText += `height:${h}px;overflow:hidden;transition:height .18s ease,opacity .18s ease,padding .18s ease,border-width .18s ease;`;
    requestAnimationFrame(() => {
      el.style.height = "0";
      el.style.opacity = "0";
      el.style.paddingTop = "0";
      el.style.paddingBottom = "0";
      el.style.borderBottomWidth = "0";
    });
    setTimeout(cb, 200);
  }

  function _cancelTimer(id) {
    if (_timers.has(id)) {
      clearTimeout(_timers.get(id));
      _timers.delete(id);
    }
  }

  function _build(cfg, dismissCb) {
    const id = cfg.id || _uid();
    const td = TYPES[cfg.type || "neutral"] || TYPES.neutral;
    const dim = cfg.dismissable !== false;

    const el = document.createElement("div");
    el.id = id;
    el.className = `${CLASSES.banner} ${td.cls}`;
    el._bnCfg = cfg;
    if (cfg.onClick) el.classList.add(...CLASSES.clickable.split(" "));

    let h = `<div class="${CLASSES.body}">`;
    h += `<span class="${CLASSES.icon}">${cfg.icon || td.icon}</span>`;
    h += `<div class="${CLASSES.content}">`;
    if (cfg.title) h += `<p class="${CLASSES.title}">${cfg.title}</p>`;
    h += `<p class="${CLASSES.message}">${cfg.message || ""}</p>`;
    if (cfg.detail || cfg.detailNode) {
      h += `<div class="${CLASSES.detail} bn-hidden">${cfg.detail || ""}</div>`;
      h += `<button class="${CLASSES.expand}">Show more ▾</button>`;
    }
    if (cfg.actions && cfg.actions.length) {
      h += `<div class="${CLASSES.actions}">`;
      cfg.actions.forEach((a, i) => {
        const c = a.style === "primary" ? `${CLASSES.action} ${CLASSES.actionPrimary}` : CLASSES.action;
        h += `<button class="${c}" data-ai="${i}">${a.label}</button>`;
      });
      h += `</div>`;
    }
    h += `</div>`;
    if (dim) h += `<button class="${CLASSES.dismiss}" title="Dismiss">✕</button>`;
    h += `</div>`;
    if (cfg.autoClose) h += `<div class="${CLASSES.barWrap}"><div class="${CLASSES.bar}"></div></div>`;
    el.innerHTML = h;

    if (cfg.detailNode) {
      const detEl = el.querySelector(".banner__detail");
      if (detEl) detEl.appendChild(cfg.detailNode);
    }

    if (cfg.onClick) {
      el.querySelector(".banner__body").addEventListener("click", (e) => {
        if (!e.target.closest(".banner__dismiss, .banner__action, .banner__expand")) {
          cfg.onClick(id);
        }
      });
    }

    if (cfg.detail || cfg.detailNode) {
      const btn = el.querySelector(".banner__expand");
      const det = el.querySelector(".banner__detail");
      btn.addEventListener("click", () => {
        const open = !det.classList.contains("bn-hidden");
        det.classList.toggle("bn-hidden", open);
        btn.textContent = open ? "Show more ▾" : "Show less ▴";
      });
    }

    if (cfg.actions) {
      cfg.actions.forEach((a, i) => {
        el.querySelector(`[data-ai="${i}"]`).addEventListener("click", () => {
          if (a.onClick) a.onClick(id);
        });
      });
    }

    const actualDismissCb = dismissCb || (() => remove(id));
    if (dim) {
      el.querySelector(".banner__dismiss").addEventListener("click", () => {
        _cancelTimer(id);
        _animOut(el, () => {
          el.remove();
          if (cfg.onDismiss) cfg.onDismiss(id);
          actualDismissCb(id);
        });
      });
    }

    return { id, el };
  }

  function _startBar(id, ms, el) {
    const bar = el.querySelector(".banner__bar");
    if (bar) {
      requestAnimationFrame(() => {
        bar.style.transition = `width ${ms}ms linear`;
        bar.style.width = "0%";
      });
    }
    _timers.set(
      id,
      setTimeout(() => remove(id), ms),
    );
  }

  function show(cfg) {
    const slot = _slot();
    if (!slot) return null;
    if (cfg.id) {
      const existing = document.getElementById(cfg.id);
      if (existing) {
        const m = existing.querySelector(".banner__message");
        if (m && cfg.message !== undefined) m.textContent = cfg.message;
        return cfg.id;
      }
    }
    const { id, el } = _build(cfg);
    slot.appendChild(el);
    if (cfg.autoClose) _startBar(id, cfg.autoClose, el);
    return id;
  }

  function remove(id) {
    const el = document.getElementById(id);
    if (!el) return;
    _cancelTimer(id);
    _animOut(el, () => {
      const cfg = el._bnCfg;
      el.remove();
      if (cfg && cfg.onDismiss) cfg.onDismiss(id);
    });
  }

  function clear() {
    _timers.forEach(clearTimeout);
    _timers.clear();
    _queueList = [];
    _queueBusy = false;
    _carouselData = [];
    _carouselIdx = 0;
    if (_carouselAutoTimer) clearInterval(_carouselAutoTimer);
    _carouselWrap = null;
    const slot = _slot();
    if (slot) slot.innerHTML = "";
  }

  function has(id) {
    return !!document.getElementById(id);
  }

  function _showQueued() {
    const slot = _slot();
    if (!slot || _queueList.length === 0) {
      _queueBusy = false;
      _clearQueueMore();
      return;
    }
    _queueBusy = true;
    const cfg = _queueList.shift();
    const { id, el } = _build(cfg, (dismissedId) => {
      const c = el._bnCfg;
      if (c && c.onDismiss) c.onDismiss(dismissedId);
      _queueBusy = false;
      _showQueued();
    });
    slot.appendChild(el);
    _renderQueueMore(el);
    if (cfg.autoClose) _startBar(id, cfg.autoClose, el);
  }

  function _renderQueueMore(currentEl) {
    _clearQueueMore();
    if (_queueList.length === 0) return;
    const pill = document.createElement("div");
    pill.id = "__bn-qmore__";
    pill.className = CLASSES.queueMore;
    const type = currentEl._bnCfg.type || "neutral";
    const td = TYPES[type] || TYPES.neutral;
    pill.classList.add(td.cls);
    pill.textContent = `${_queueList.length} more notification${_queueList.length > 1 ? "s" : ""} queued`;
    _slot().appendChild(pill);
  }

  function _clearQueueMore() {
    const el = document.getElementById("__bn-qmore__");
    if (el) el.remove();
  }

  function queue(cfgs) {
    if (!Array.isArray(cfgs) || !cfgs.length) return;
    _queueList = [...cfgs];
    _queueBusy = false;
    _showQueued();
  }

  function enqueue(cfg) {
    if (!_queueBusy && _queueList.length === 0) {
      queue([cfg]);
    } else {
      _queueList.push(cfg);
      const active = _slot() && _slot().querySelector(".banner");
      if (active) _renderQueueMore(active);
    }
  }

  function carousel(cfgs, opts = {}) {
    if (!Array.isArray(cfgs) || !cfgs.length) return;
    const slot = _slot();
    if (!slot) return;
    _destroyCarousel();
    _carouselData = cfgs;
    _carouselIdx = 0;
    _carouselOpts = opts;
    _carouselWrap = document.createElement("div");
    _carouselWrap.id = "__bn-carousel__";
    slot.appendChild(_carouselWrap);
    _renderCarousel();
    if (opts.autoAdvance) {
      _carouselAutoTimer = setInterval(() => {
        const next = _carouselIdx + 1;
        if (next < _carouselData.length) _carouselGoTo(next);
        else if (opts.loop) _carouselGoTo(0);
        else _destroyCarousel();
      }, opts.autoAdvance);
    }
  }

  function _renderCarousel() {
    if (!_carouselWrap) return;
    _carouselWrap.innerHTML = "";
    const cfg = _carouselData[_carouselIdx];
    const td = TYPES[cfg.type || "neutral"] || TYPES.neutral;
    _carouselWrap.className = `${CLASSES.banner} ${td.cls}`;
    const { el } = _build({ ...cfg, dismissable: false });
    Array.from(el.children).forEach((c) => _carouselWrap.appendChild(c));
    _carouselWrap._bnCfg = cfg;

    if (_carouselData.length > 1) {
      const nav = document.createElement("div");
      nav.className = `${CLASSES.nav} ${td.cls}`;
      const prev = document.createElement("button");
      prev.className = CLASSES.arrow;
      prev.textContent = "‹";
      prev.disabled = _carouselIdx === 0 && !_carouselOpts.loop;
      prev.addEventListener("click", () => {
        const p = _carouselIdx - 1;
        _carouselGoTo(p >= 0 ? p : _carouselOpts.loop ? _carouselData.length - 1 : 0);
      });
      nav.appendChild(prev);
      _carouselData.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = CLASSES.dot + (i === _carouselIdx ? ` ${CLASSES.dotActive}` : "");
        dot.addEventListener("click", () => _carouselGoTo(i));
        nav.appendChild(dot);
      });
      const count = document.createElement("span");
      count.className = CLASSES.count;
      count.textContent = `${_carouselIdx + 1} / ${_carouselData.length}`;
      nav.appendChild(count);
      const next = document.createElement("button");
      next.className = CLASSES.arrow;
      next.textContent = "›";
      next.disabled = _carouselIdx === _carouselData.length - 1 && !_carouselOpts.loop;
      next.addEventListener("click", () => {
        const n = _carouselIdx + 1;
        _carouselGoTo(n < _carouselData.length ? n : _carouselOpts.loop ? 0 : _carouselIdx);
      });
      nav.appendChild(next);
      _carouselWrap.appendChild(nav);
    }
  }

  function _carouselGoTo(i) {
    if (i < 0 || i >= _carouselData.length) return;
    _carouselIdx = i;
    _renderCarousel();
  }

  function _destroyCarousel() {
    if (_carouselAutoTimer) {
      clearInterval(_carouselAutoTimer);
      _carouselAutoTimer = null;
    }
    if (_carouselWrap) {
      _carouselWrap.remove();
      _carouselWrap = null;
    }
    _carouselData = [];
    _carouselIdx = 0;
  }

  function carouselDismiss() {
    _destroyCarousel();
  }

  const warn = (msg, o = {}) => show({ type: "warning", message: msg, ...o });
  const error = (msg, o = {}) => show({ type: "error", message: msg, ...o });
  const info = (msg, o = {}) => show({ type: "info", message: msg, ...o });
  const success = (msg, o = {}) => show({ type: "success", message: msg, ...o });

  return { show, remove, clear, has, queue, enqueue, carousel, carouselDismiss, warn, error, info, success };
})();

// ── PREVIEW ──────────────────────────────────────────────────────────────────

function useWhiteLabel(hex) {
  const lum = relLum(normalizeHex(hex) || "#888888");
  return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05;
}

const schedulePreview = debounce(() => {
  if (document.getElementById("preview-screen").classList.contains("hidden")) return;
  const result = variableMaker(translateConfig(appState));
  renderPreviewPanel(result);
}, 500);

function renderPreviewPanel(result) {
  const themes = appState.themes || [];

  const colorEl = document.getElementById("preview-colors");
  colorEl.innerHTML = "";
  if (Object.keys(result.tonalScales).length === 0) {
    colorEl.innerHTML = `<p class="text-[12px] text-[var(--text-muted)] px-1 py-4 text-center">No tonal scale in Adaptive Engine mode. Colors are solved directly per variation target.</p>`;
  } else {
    const themeKeys = themes.map((t) => t.name.toLowerCase());
    for (const [colorName, ramp] of Object.entries(result.tonalScales)) {
      const colorEntry = appState.colors.find((c) => c.name === colorName);
      const srcHex = "#" + (colorEntry ? colorEntry.value.replace(/^#/, "") : "888888");
      const colorIdx = appState.colors.findIndex((c) => c.name === colorName);

      const hexDisplay = el("span", { class: "text-[12px] font-bold font-mono" });
      const numDisplay = el("span", { class: "text-[11px] text-[var(--text-muted)] font-mono" });
      const infoDisplay = el("span", { class: "ml-auto text-[10px] text-[var(--text-muted)]" });

      // Source color swatch — also acts as an inline color picker
      const pickerInput = el("input", {
        type: "color",
        value: srcHex,
        class: "absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10",
        oninput: (e) => {
          const clean = e.target.value.replace("#", "").toUpperCase();
          if (colorIdx >= 0) {
            updateGroup(colorIdx, "value", clean);
            swatchDiv.style.background = "#" + clean;
          }
        },
        title: "Click to edit color",
      });
      const swatchDiv = el("div", {
        class: "size-8 rounded-md shrink-0",
        style: `background:${srcHex}`,
        title: "Click to edit source color",
      });
      const swatchWrap = el("div", { class: "relative size-6 shrink-0 cursor-pointer", title: "Click to edit color" }, [pickerInput, swatchDiv]);

      const spectrum = el("div", {
        class: "col-span-3 flex w-full h-20 rounded-[10px] overflow-hidden cursor-crosshair",
        style: "box-shadow:0 10px 30px #0000001f;border:1px solid #8888881A",
      });

      for (const [weight, data] of Object.entries(ramp)) {
        const labelEl = el(
          "div",
          {
            class: "absolute inset-0 flex flex-col items-center justify-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
            style: `color:${useWhiteLabel(data.value) ? "#fff" : "#000"}`,
          },
          [el("span", { class: "text-[12px] font-bold leading-none" }, weight), el("span", { class: "text-[14px] font-mono leading-none opacity-80" }, data.value)],
        );
        const step = el(
          "div",
          {
            class: "preview-swatch group relative flex-1 h-full hover:flex-[4] hover:z-10 hover:rounded-[8px] transition-all cursor-pointer",
            style: `background:${data.value}`,
            title: `${weight} · ${data.value} — click to copy`,
            onclick: () => {
              copyToClipboard(data.value);
              ToastManager.success(`Copied ${data.value}`);
            },
          },
          [labelEl],
        );
        step.onmouseenter = () => {
          hexDisplay.textContent = data.value;
          hexDisplay.style.color = data.value;
          numDisplay.textContent = weight;
          const ratios = themeKeys
            .map((k) => (data.contrast[k] ? `${k}: ${data.contrast[k].ratio}` : ""))
            .filter(Boolean)
            .join(" · ");
          infoDisplay.textContent = ratios;
        };
        spectrum.appendChild(step);
      }

      const section = el("div", { class: "grid items-center gap-2 mb-3", style: "grid-template-columns:28px 1fr auto;grid-template-rows:28px auto" }, [
        swatchWrap,
        el("div", { class: "text-[12px] font-bold text-[var(--text-primary)]" }, colorName),
        el("div", { class: "flex items-center gap-2" }, [numDisplay, hexDisplay, infoDisplay]),
        spectrum,
      ]);
      colorEl.appendChild(section);
    }
  }

  // Alpha tints section — only shown when both Global Colors and Alpha Tints are enabled
  if (appState.includeAlphaTints && appState.includeGlobalColors) {
    const alphaInts = (appState.alphaValues || "10, 25, 50, 75, 90")
      .split(",")
      .map((v) => parseInt(v.trim()))
      .filter((v) => !isNaN(v));
    if (alphaInts.length > 0) {
      const alphaSection = el("div", { class: "mb-4 mt-1" }, [
        el("div", { class: "text-[11px] font-bold tracking-[0.1em] uppercase text-[var(--text-muted)] mb-2 px-1" }, "Alpha Tints"),
      ]);
      for (const color of appState.colors) {
        const hex = "#" + color.value.replace(/^#/, "").toUpperCase().padEnd(6, "0");
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        const swatches = alphaInts.map((opacity) => {
          const a = (opacity / 100).toFixed(2);
          const rgbaStr = `rgba(${r},${g},${b},${a})`;
          return el("div", {
            class: "flex-1 h-6 rounded cursor-pointer",
            style: `background:${rgbaStr};box-shadow:inset 0 0 0 1px rgba(128,128,128,.2)`,
            title: `${color.name} ${opacity}%\n${rgbaStr}`,
            onclick: () => { copyToClipboard(rgbaStr); ToastManager.success(`Copied ${rgbaStr}`); },
          });
        });
        const strip = el("div", { class: "flex gap-0.5 items-center mb-1.5" }, [
          el("div", { class: "w-16 text-[11px] text-[var(--text-muted)] truncate shrink-0", title: color.name }, color.name),
          ...swatches,
        ]);
        alphaSection.appendChild(strip);
      }
      colorEl.appendChild(alphaSection);
    }
  }

  // render one panel per theme
  const panelArea = document.getElementById("preview-theme-panels");
  if (!panelArea) return;
  // ensure correct number of panels
  themes.forEach((theme, i) => {
    const panelId = `preview-theme-panel-${i}`;
    let panel = panelArea.querySelector(`[data-theme-idx="${i}"]`);
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "preview-panel preview-theme-panel";
      panel.dataset.themeIdx = i;
      panel.id = panelId;
      panelArea.appendChild(panel);
    } else {
      panel.id = panelId;
    }
    const themeKey = theme.name.toLowerCase();
    const bgHex = normalizeHex(theme.bg) || "#FFFFFF";
    const tokens = result.colorTokens[themeKey] || {};
    renderThemePanel(panel, tokens, bgHex, result);
  });
  // remove extras — if the active panel is one being removed, fall back to first visible tab
  panelArea.querySelectorAll(".preview-theme-panel").forEach((p) => {
    if (parseInt(p.dataset.themeIdx) >= themes.length) {
      if (p.classList.contains("active")) {
        const firstTab = document.querySelector("#preview-screen .preview-tab-btn:not(.hidden)");
        document.querySelectorAll("#preview-screen .preview-tab-btn").forEach((b) => b.classList.remove("active"));
        document.querySelectorAll("#preview-content .preview-panel, #preview-theme-panels > div").forEach((q) => q.classList.remove("active"));
        if (firstTab) {
          firstTab.classList.add("active");
          const fallback = document.getElementById(firstTab.dataset.target);
          if (fallback) fallback.classList.add("active");
        }
      }
      p.remove();
    }
  });
}

function renderThemePanel(panelOrId, themeTokens, bgHex, result) {
  const panelEl = typeof panelOrId === "string" ? document.getElementById(panelOrId) : panelOrId;
  panelEl.innerHTML = "";
  panelEl.style.backgroundColor = bgHex || "";

  // Derive adaptive UI colors from the panel background luminance.
  // Use actual contrast ratio against black vs white to pick the higher-contrast ink,
  // then derive muted/border/hover from that same ink at reduced opacity.
  const bgLum = relLum(bgHex || "#FFFFFF");
  const useWhiteInk = 1.05 / (bgLum + 0.05) >= (bgLum + 0.05) / 0.05;
  const ink = useWhiteInk ? "255,255,255" : "0,0,0";
  const pvText = `rgb(${ink})`;
  const pvMuted = `rgba(${ink},0.55)`;
  const pvBorder = `rgba(${ink},0.15)`;
  const pvHover = `rgba(${ink},0.07)`;
  const pvHoverBorder = `rgba(${ink},0.25)`;
  panelEl.style.setProperty("--pv-text", pvText);
  panelEl.style.setProperty("--pv-muted", pvMuted);
  panelEl.style.setProperty("--pv-border", pvBorder);
  panelEl.style.setProperty("--pv-hover", pvHover);
  panelEl.style.setProperty("--pv-hover-border", pvHoverBorder);

  const varLabel = (varKey) => {
    const i = parseInt(varKey);
    if (!isNaN(i) && appState.variations && appState.variations[i]) {
      return appState.variations[i].name || appState.variations[i].shorthand;
    }
    return varKey;
  };

  for (const [colorName, roles] of Object.entries(themeTokens)) {
    const ramp = result.tonalScales[colorName];
    const srcColor = (appState.colors.find((c) => c.name === colorName) || {}).value || "888888";
    const baseColor = ramp ? ramp[Object.keys(ramp)[Math.floor(Object.keys(ramp).length / 2)]].value : `#${srcColor.replace(/^#/, "")}`;

    const section = el("div", { class: "mb-4 px-2 pt-2" }, [
      el("div", { class: "flex items-center gap-2 mb-2" }, [el("div", { class: "size-5 rounded-md shrink-0", style: `background:${baseColor}` }), el("div", { class: "text-[12px] font-bold", style: "color:var(--pv-text)" }, colorName)]),
      el("div", { class: "space-y-3" }),
    ]);
    const content = section.querySelector(".space-y-3");

    for (const [roleIdx, variations] of Object.entries(roles)) {
      const rName = (appState.roles[roleIdx] && appState.roles[roleIdx].name) || `Role ${roleIdx}`;
      const grid = el("div", { class: "grid grid-cols-swatches gap-2" });
      const roleGroup = el("div", { class: "mb-2" }, [
        el("div", { class: "flex items-center gap-1 mb-1.5" }, [el("div", { class: "text-[10px] font-extrabold tracking-[0.12em] uppercase", style: "color:var(--pv-muted)" }, rName), el("div", { class: "flex-1 h-px", style: "background:var(--pv-border)" })]),
        grid,
      ]);

      for (const [varKey, token] of Object.entries(variations)) {
        const cData = token.contrast || { ratio: 1, rating: "FAIL" };
        const ratio = typeof cData.ratio === "number" ? cData.ratio.toFixed(1) : String(cData.ratio);
        const swatchInk = useWhiteLabel(token.value) ? "255,255,255" : "0,0,0";
        const swatchText = `rgb(${swatchInk})`;

        // contrast + hex overlay — both absolutely positioned so they swap cleanly
        const contrastEl = el(
          "div",
          {
            class: "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
          },
          [el("span", { class: "text-[14px] font-bold leading-none tabular-nums", style: `color:${swatchText}` }, ratio)],
        );

        const hexEl = el(
          "div",
          {
            class: "absolute inset-0 flex items-center justify-center transition-opacity duration-150",
            style: "opacity:0",
          },
          [el("span", { class: "text-[12px] font-mono leading-none", style: `color:${swatchText}` }, token.value)],
        );

        const nameEl = el("div", { class: "text-[12px] font-medium leading-none text-center", style: "color:var(--pv-muted)" }, varLabel(varKey));

        const swatch = el(
          "div",
          {
            class: "relative rounded-[6px] cursor-pointer transition-all duration-150",
            style: `background:${token.value};height:52px;box-shadow:inset 0 0 0 1px rgba(128,128,128,.18)`,
            onclick: (e) => {
              const text = e.altKey && token.tknName ? token.tknName : token.value;
              copyToClipboard(text);
              ToastManager.success(`Copied ${text}`);
            },
            onmouseenter: (e) => {
              contrastEl.style.opacity = "0";
              hexEl.style.opacity = "1";
              e.currentTarget.style.boxShadow = `inset 0 0 0 2px rgba(${swatchInk},0.4)`;
            },
            onmouseleave: (e) => {
              contrastEl.style.opacity = "1";
              hexEl.style.opacity = "0";
              e.currentTarget.style.boxShadow = "inset 0 0 0 1px rgba(128,128,128,.18)";
            },
          },
          [contrastEl, hexEl],
        );

        const card = el("div", { class: "flex flex-col gap-1" }, [swatch, nameEl]);
        grid.appendChild(card);
      }
      content.appendChild(roleGroup);
    }
    panelEl.appendChild(section);
  }
}

// ── FIGMA SYNC & IO ──────────────────────────────────────────────────────────

function handleSubmit(scope = "all") {
  const dupError = validateState();
  if (dupError) {
    showOverlay("error-overlay");
    document.getElementById("error-message").textContent = dupError;
    return;
  }
  pendingScope = scope;
  parent.postMessage(
    {
      pluginMessage: {
        type: "check-collections",
        colorName: appState.tonalScaleCollectionName || "_scale",
        contextualName: appState.tokenCollectionName || "contextual",
        state: appState,
        savedState: getSavedState(),
      },
    },
    "*",
  );
}

function proceedWithSync() {
  showOverlay("loading-overlay");
  setTimeout(() => {
    parent.postMessage({ pluginMessage: { type: "run-creator", state: appState, scope: pendingScope, savedState: getSavedState() } }, "*");
  }, 50);
}

function setRunScope(scope) {
  pendingScope = scope;
  ["all", "groups", "roles"].forEach((s) => {
    const btn = document.getElementById("rd-scope-" + s);
    if (btn) btn.classList.toggle("active", s === scope);
  });
  refreshRunDialog();
}

function refreshRunDialog() {
  const existing = lastCollectionCheckResult;
  const colorName = appState.tonalScaleCollectionName || "_scale";
  const ctxName = appState.tokenCollectionName || "contextual";
  const isDirect = appState.pluginMode === "adaptiveEngine";
  const skipRamps = appState.embedDirectly || isDirect;
  const tg = appState.variableStructure || "color";
  const shortC = appState.useShorthandColors;
  const shortR = appState.useShorthandRoles;
  const scope = pendingScope || "all";

  syncOutputToggles();

  const scopeSection = document.getElementById("rd-scope-section");
  if (scopeSection) scopeSection.classList.toggle("hidden", isDirect);
  const skipRampsRow = document.getElementById("embed-colors-directly");
  if (skipRampsRow) skipRampsRow.classList.toggle("hidden", isDirect);

  const colsEl = document.getElementById("rd-collections");
  if (colsEl) {
    colsEl.innerHTML = "";
    const entries = [];
    if (!skipRamps && scope !== "roles") {
      const exists = existing.includes(colorName);
      entries.push([colorName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (scope !== "groups") {
      const exists = existing.includes(ctxName);
      entries.push([ctxName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (appState.includeGlobalColors) {
      const constName = appState.globalColorsCollectionName || "_constants";
      const exists = existing.includes(constName);
      entries.push([constName, exists ? "UPDATE" : "CREATE", exists]);
    }
    if (entries.length) {
      entries.forEach(([name, label, isExisting]) => {
        colsEl.appendChild(
          el("div", { class: "flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2" }, [
            el("span", { class: "text-[13px] text-[var(--text-primary)] font-mono" }, name),
            el("span", { class: `text-[11px] font-bold px-2 py-0.5 rounded ${isExisting ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-[var(--success)]/15 text-[var(--success)]"}` }, label),
          ]),
        );
      });
    } else {
      colsEl.appendChild(el("p", { class: "text-[12px] text-[var(--text-muted)] px-1" }, "No collections will be modified for this scope."));
    }
  }

  const sampleColor = appState.colors[0] || { name: "Primary", shorthand: "pr" };
  const sampleRole = appState.roles[0] || { name: "Text", shorthand: "tx" };
  const cLabel = shortC ? sampleColor.shorthand || sampleColor.name : sampleColor.name;
  const rLabel = shortR ? sampleRole.shorthand || sampleRole.name : sampleRole.name;
  const stepLabel = appState.variations && appState.variations[2] ? (appState.useShorthandVariations && appState.variations[2].shorthand ? appState.variations[2].shorthand : appState.variations[2].name) : "3";
  const exName = tg === "role" ? `${rLabel}/${cLabel}/${stepLabel}` : `${cLabel}/${rLabel}/${stepLabel}`;
  const previewEl = document.getElementById("rd-name-preview");
  if (previewEl) previewEl.textContent = exName;

  const renameEl = document.getElementById("rd-renames");
  const renameListEl = document.getElementById("rd-renames-list");
  if (renameEl && renameListEl) {
    const summary = lastRenameData && lastRenameData.summary;
    const rampCount = isDirect ? 0 : (summary && summary.rampCount) || 0;
    const ctxCount = (summary && summary.contextualCount) || 0;
    const changes = ((summary && summary.changes) || []).filter((ch) => (isDirect ? ch.type !== "stepNames" : true));

    if (rampCount + ctxCount > 0 && changes.length > 0) {
      renameEl.classList.remove("hidden");
      renameListEl.innerHTML = "";
      const typeLabels = { color: "Color", role: "Role", stepNames: "Scale Steps", roleStepNames: "Variation Levels", grouping: "Grouping" };
      changes.forEach((ch) => {
        renameListEl.appendChild(
          el("div", { class: "flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[8px] px-3 py-2 min-w-0" }, [
            el("span", { class: "text-[11px] text-[var(--text-muted)] w-[68px] shrink-0" }, typeLabels[ch.type] || ch.type),
            el("span", { class: "text-[11px] font-mono text-[var(--text-primary)] truncate flex-1" }, ch.from),
            el("span", { class: "text-[11px] text-[var(--accent)] shrink-0 px-0.5" }, "→"),
            el("span", { class: "text-[11px] font-mono text-[var(--accent)] truncate flex-1" }, ch.to),
          ]),
        );
      });
      const parts = [rampCount > 0 ? `${rampCount} scale var${rampCount > 1 ? "s" : ""}` : "", ctxCount > 0 ? `${ctxCount} token var${ctxCount > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
      renameListEl.appendChild(el("div", { class: "flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1 pt-0.5" }, [el("span", { class: "inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" }), el("span", {}, `${parts} will be renamed`)]));
    } else {
      renameEl.classList.add("hidden");
    }
  }

  const sumEl = document.getElementById("rd-summary");
  if (sumEl) {
    sumEl.innerHTML = "";
    const colorList = appState.colors.map((c) => `${c.name}${c.shorthand ? ` (${c.shorthand})` : ""}`).join(", ");
    const roleList = appState.roles.map((r) => `${r.name}${r.shorthand ? ` (${r.shorthand})` : ""}`).join(", ");
    const rows = [
      ["Project Name", appState.name || "—"],
      [`Colors x${appState.colors.length}`, colorList],
      [`Roles x${appState.roles.length}`, roleList],
      ["Mode", isDirect ? "Adaptive Engine" : "Tonal Scale Based"],
      ...(isDirect
        ? []
        : [
            ["Base Selection", appState.baseSelection || "By Contrast"],
            ...(appState.baseSelection !== "Manual" ? [["Spread Unit", (appState.spreadUnit || "steps") === "contrast" ? "Contrast Gap" : "Steps"]] : []),
            ["Color Steps", String(appState.scaleLength || 25)],
            ["Scale Algorithm", appState.scaleAlgorithm || "Natural"],
          ]),
    ];
    rows.forEach(([label, value]) => {
      sumEl.appendChild(
        el("div", { class: "flex items-start justify-between gap-2 text-[12px] py-1 border-b border-[var(--border)]/40 last:border-0" }, [el("span", { class: "text-[var(--text-muted)] shrink-0" }, label), el("span", { class: "text-[var(--text-primary)] text-right text-[11px]" }, value)]),
      );
    });
  }

  const warnEl = document.getElementById("rd-warnings");
  if (warnEl) {
    const relevant = existing.filter((n) => (n === colorName && !skipRamps && scope !== "roles") || (n === ctxName && scope !== "groups"));
    if (relevant.length > 0) {
      warnEl.classList.remove("hidden");
      document.getElementById("rd-warning-text").textContent = `${relevant.map((n) => `"${n}"`).join(" and ")} already exist. Variables will be added or updated — nothing deleted.`;
    } else {
      warnEl.classList.add("hidden");
    }
  }
}

let _pendingImportData = null;

function handleImportJSON(json) {
  try {
    const imported = typeof json === "string" ? JSON.parse(json) : json;
    if (!imported.colors || !imported.roles) throw new Error("Invalid config format");
    _pendingImportData = imported;
    showOverlay("confirm-import-overlay");
    document.getElementById("btn-import-save").onclick = () => {
      exportConfig();
      finalizeImport();
    };
    document.getElementById("btn-import-now").onclick = () => {
      finalizeImport();
    };
  } catch (err) {
    BannerManager.error("Import failed: " + err.message);
  }
}

function finalizeImport() {
  if (!_pendingImportData) return;
  loadState(_pendingImportData);
  _pendingImportData = null;
  hideOverlay("confirm-import-overlay");
  syncInputsFromState();
  renderColorGroups();
  renderRoles();
  BannerManager.success("Config imported successfully");
}

function exportConfig() {
  const data = JSON.stringify(appState, null, 2);
  triggerDownload(data, exportFileName("config", "json"), "application/json");
}

function exportToCSS() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "css" } }, "*");
}

function exportToCSV() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "csv" } }, "*");
}

function exportToSCSS() {
  parent.postMessage({ pluginMessage: { type: "request-processed-data", state: appState, exportType: "scss" } }, "*");
}

function triggerDownload(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportFileName(type, ext) {
  const name = (appState.name || "design_system").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
  return `${name}_${type}_${date}_${time}.${ext}`;
}

function showSystemBanners(errors, result = null) {
  if (!errors) return;

  const accessFails = [];
  if (result && result.colorTokens) {
    for (const mode of Object.keys(result.colorTokens)) {
      const modeTokens = result.colorTokens[mode];
      if (!modeTokens) continue;
      for (const clrName in modeTokens) {
        for (const roleId in modeTokens[clrName]) {
          const roleTokens = modeTokens[clrName][roleId];
          for (const varKey in roleTokens) {
            const tkn = roleTokens[varKey];
            if (tkn.contrast && tkn.contrast.rating === "Fail") {
              accessFails.push(`${clrName}/${tkn.role} (${mode})`);
            }
          }
        }
      }
    }
  }

  const critCount = errors.critical ? errors.critical.length : 0;
  const warnCount = errors.warnings ? errors.warnings.length : 0;
  const auditCount = accessFails.length;

  if (critCount === 0 && warnCount === 0 && auditCount === 0) {
    BannerManager.clear();
    return;
  }

  const detailNode = document.createElement("div");
  detailNode.className = "flex flex-col gap-1 mt-2 border-t border-white/10 pt-2";

  function _detailSection(headerText, headerClass, items) {
    const section = document.createElement("div");
    section.className = "mb-2";
    const header = document.createElement("p");
    header.className = `font-bold ${headerClass} mb-1`;
    header.textContent = headerText;
    section.appendChild(header);
    items.forEach((text) => {
      const row = document.createElement("div");
      row.className = "ml-2 text-[10px] opacity-90";
      row.textContent = `• ${text}`;
      section.appendChild(row);
    });
    return section;
  }

  if (critCount > 0)
    detailNode.appendChild(
      _detailSection(
        "Critical Issues:",
        "text-red-400",
        errors.critical.map((e) => `${e.color}/${e.role}: ${e.error}`),
      ),
    );
  if (warnCount > 0)
    detailNode.appendChild(
      _detailSection(
        "Warnings:",
        "text-amber-400",
        errors.warnings.map((w) => `${w.color}/${w.role}: ${w.warning}`),
      ),
    );

  if (auditCount > 0) {
    const section = document.createElement("div");
    const header = document.createElement("p");
    header.className = "font-bold text-blue-400 mb-1";
    header.textContent = "Accessibility Concerns:";
    section.appendChild(header);
    const body = document.createElement("div");
    body.className = "ml-2 text-[10px] opacity-90";
    const shown = accessFails.slice(0, 8);
    shown.forEach((text, i) => {
      if (i > 0) body.appendChild(document.createElement("br"));
      body.appendChild(document.createTextNode(text));
    });
    if (auditCount > 8) {
      body.appendChild(document.createElement("br"));
      body.appendChild(document.createTextNode(`...and ${auditCount - 8} more`));
    }
    section.appendChild(body);
    detailNode.appendChild(section);
  }

  BannerManager.show({
    id: "system-status-banner",
    type: critCount > 0 ? "error" : warnCount > 0 ? "warning" : "info",
    title: critCount > 0 ? "Color System Errors" : "System Audit Results",
    message: `${critCount > 0 ? `${critCount} Critical · ` : ""}${warnCount} Warnings · ${auditCount} Access concerns detected.`,
    detailNode,
    dismissable: true,
  });
}
