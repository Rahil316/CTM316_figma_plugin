/**
 * BannerManager — self-contained notification banner system.
 *
 * MODES:
 *   Stack    — multiple banners visible at once (default for show())
 *   Queue    — one at a time; next appears when current is dismissed
 *   Carousel — one at a time with prev/next navigation + optional auto-advance
 *
 * QUICK API:
 *   BannerManager.show(config)             → id  (stack)
 *   BannerManager.queue([config, ...])          (sequential)
 *   BannerManager.enqueue(config)               (add to running queue)
 *   BannerManager.carousel([config, ...], opts) (carousel)
 *   BannerManager.warn / .error / .info / .success(message, opts)
 *   BannerManager.remove(id)
 *   BannerManager.clear()
 *   BannerManager.has(id) → bool
 *
 * CONFIG SHAPE:
 *   id          string    — deduplication key; re-showing updates the message
 *   type        string    — "warning" | "error" | "info" | "success" | "neutral"
 *   icon        string    — override default icon (any char / emoji)
 *   title       string    — optional bold line above message
 *   message     string    — main text
 *   detail      string    — expandable section revealed by "Show more"
 *   dismissable bool      — show ✕ button (default true)
 *   autoClose   number    — ms before auto-dismiss; shows progress bar
 *   onClick     fn(id)    — whole banner body becomes clickable
 *   onDismiss   fn(id)    — called when banner leaves (any reason)
 *   actions     [{label, onClick(id), style:"primary"|"ghost"}]
 */
const BannerManager = (() => {
  // ── Tailwind Class System ──────────────────────────────────────────────────
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

    // Carousel nav
    nav: "bn-carousel__nav flex items-center justify-center gap-1.5 px-3 py-1 bg-[var(--bn-bg)] border-b border-[var(--bn-border)]",
    dot: "bn-carousel__dot w-1.5 h-1.5 rounded-full bg-[var(--bn-text)] opacity-30 border-none p-0 cursor-pointer transition-opacity",
    dotActive: "active opacity-100",
    arrow: "bn-carousel__arrow bg-none border-none text-[var(--bn-text)] opacity-45 cursor-pointer text-[13px] px-0.5 leading-none transition-opacity hover:enabled:opacity-100 disabled:opacity-15 disabled:cursor-default",
    count: "bn-carousel__count text-[10px] text-[var(--bn-text)] opacity-45",

    // Queue
    queueMore: "bn-queue__more text-[10px] px-3 py-1 text-right text-[var(--bn-text)] opacity-45 bg-[var(--bn-bg)] border-b border-[var(--bn-border)]",
  };

  // ── Injected CSS (Theme Variables Only) ────────────────────────────────────
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

  // ── Constants ──────────────────────────────────────────────────────────────
  const TYPES = {
    warning: { icon: "⚠", cls: "banner--warning" },
    error: { icon: "✕", cls: "banner--error" },
    info: { icon: "ℹ", cls: "banner--info" },
    success: { icon: "✓", cls: "banner--success" },
    neutral: { icon: "·", cls: "banner--neutral" },
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const _timers = new Map();
  let _queueList = [];
  let _queueBusy = false;
  let _carouselWrap = null;
  let _carouselData = [];
  let _carouselIdx = 0;
  let _carouselAutoTimer = null;
  let _carouselOpts = {};

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  // Build a banner DOM element from config. Returns { id, el }.
  function _build(cfg, dismissCb) {
    const id = cfg.id || _uid();
    const td = TYPES[cfg.type || "neutral"] || TYPES.neutral;
    const dim = cfg.dismissable !== false;

    const el = document.createElement("div");
    el.id = id;
    el.className = `${CLASSES.banner} ${td.cls}`;
    el._bnCfg = cfg;
    if (cfg.onClick) el.classList.add(...CLASSES.clickable.split(" "));

    // Body
    let h = `<div class="${CLASSES.body}">`;
    h += `<span class="${CLASSES.icon}">${cfg.icon || td.icon}</span>`;
    h += `<div class="${CLASSES.content}">`;
    if (cfg.title) h += `<p class="${CLASSES.title}">${cfg.title}</p>`;
    h += `<p class="${CLASSES.message}">${cfg.message || ""}</p>`;
    if (cfg.detail) {
      h += `<div class="${CLASSES.detail} bn-hidden">${cfg.detail}</div>`;
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
    h += `</div>`; // content
    if (dim) h += `<button class="${CLASSES.dismiss}" title="Dismiss">✕</button>`;
    h += `</div>`; // body
    if (cfg.autoClose) h += `<div class="${CLASSES.barWrap}"><div class="${CLASSES.bar}"></div></div>`;
    el.innerHTML = h;

    // onClick on body (excluding interactive children)
    if (cfg.onClick) {
      el.querySelector(".banner__body").addEventListener("click", (e) => {
        if (!e.target.closest(".banner__dismiss, .banner__action, .banner__expand")) {
          cfg.onClick(id);
        }
      });
    }

    // Expand / collapse detail
    if (cfg.detail) {
      const btn = el.querySelector(".banner__expand");
      const det = el.querySelector(".banner__detail");
      btn.addEventListener("click", () => {
        const open = !det.classList.contains("bn-hidden");
        det.classList.toggle("bn-hidden", open);
        btn.textContent = open ? "Show more ▾" : "Show less ▴";
      });
    }

    // Action buttons
    if (cfg.actions) {
      cfg.actions.forEach((a, i) => {
        el.querySelector(`[data-ai="${i}"]`).addEventListener("click", () => {
          if (a.onClick) a.onClick(id);
        });
      });
    }

    // Dismiss button
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

  // ── Stack mode ─────────────────────────────────────────────────────────────
  function show(cfg) {
    const slot = _slot();
    if (!slot) return null;

    // Dedup: update in place
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

  // ── Queue mode ─────────────────────────────────────────────────────────────
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
      // After this banner is gone, show the next
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
    // Inherit color vars from the active banner
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

  // ── Carousel mode ──────────────────────────────────────────────────────────
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

    // Banner body (no individual dismiss; carousel manages lifecycle)
    const { el } = _build({ ...cfg, dismissable: false });
    // Transplant body + bar children into carousel wrap
    Array.from(el.children).forEach((c) => _carouselWrap.appendChild(c));
    _carouselWrap._bnCfg = cfg;

    // Nav bar (only when >1 item)
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

  // ── Template shorthands ────────────────────────────────────────────────────
  const warn = (msg, o = {}) => show({ type: "warning", message: msg, ...o });
  const error = (msg, o = {}) => show({ type: "error", message: msg, ...o });
  const info = (msg, o = {}) => show({ type: "info", message: msg, ...o });
  const success = (msg, o = {}) => show({ type: "success", message: msg, ...o });

  return {
    show,
    remove,
    clear,
    has,
    queue,
    enqueue,
    carousel,
    carouselDismiss,
    warn,
    error,
    info,
    success,
  };
})();
