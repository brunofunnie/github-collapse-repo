/*
 * GitHub Collapse Repo
 *
 * Turns the repository file list into a full-width accordion bar. The list
 * starts collapsed and the choice is remembered in localStorage; clicking the
 * bar (or pressing Enter/Space on it) expands or collapses it again.
 *
 * No permissions, no network requests: this only touches the DOM of
 * github.com and stores a single preference key.
 */
(() => {
  "use strict";

  const STORAGE_KEY = "ghcr:collapsed";
  const DEFAULT_COLLAPSED = true;

  // Class on <html> used to hide the list before the bar has been mounted.
  const ROOT_COLLAPSED_CLASS = "ghcr-collapsed";
  // Class on the file list itself once the bar is in place.
  const CONTENT_COLLAPSED_CLASS = "ghcr-files--collapsed";
  const BAR_CLASS = "ghcr-toggle";

  const CONTENT_SELECTORS = [
    '[data-testid="directory-content"]',
    'table[aria-labelledby="folders-and-files"]',
  ];

  const FOLDER_ICON =
    '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">' +
    '<path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>' +
    "</svg>";

  const CHEVRON_ICON =
    '<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">' +
    '<path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"></path>' +
    "</svg>";

  const STRINGS = {
    en: {
      label: "Folders and files",
      expand: "Expand",
      collapse: "Collapse",
      folder: ["folder", "folders"],
      file: ["file", "files"],
    },
    pt: {
      label: "Pastas e arquivos",
      expand: "Expandir",
      collapse: "Recolher",
      folder: ["pasta", "pastas"],
      file: ["arquivo", "arquivos"],
    },
    es: {
      label: "Carpetas y archivos",
      expand: "Expandir",
      collapse: "Contraer",
      folder: ["carpeta", "carpetas"],
      file: ["archivo", "archivos"],
    },
    fr: {
      label: "Dossiers et fichiers",
      expand: "Développer",
      collapse: "Réduire",
      folder: ["dossier", "dossiers"],
      file: ["fichier", "fichiers"],
    },
    de: {
      label: "Ordner und Dateien",
      expand: "Ausklappen",
      collapse: "Einklappen",
      folder: ["Ordner", "Ordner"],
      file: ["Datei", "Dateien"],
    },
    ja: {
      label: "フォルダーとファイル",
      expand: "展開",
      collapse: "折りたたむ",
      folder: ["フォルダー", "フォルダー"],
      file: ["ファイル", "ファイル"],
    },
  };

  const state = { collapsed: loadCollapsed() };

  let bar = null;
  let content = null;
  let animationId = 0;
  let ensureScheduled = false;
  let stringsCache = null;

  // Hide the list as early as possible (the CSS is injected at document_start)
  // so a collapsed list never flashes open while the page is still loading.
  if (state.collapsed && document.documentElement) {
    document.documentElement.classList.add(ROOT_COLLAPSED_CLASS);
  }

  // Safety net: if something goes wrong before the bar is mounted, never leave
  // the file list hidden without a way to expand it.
  window.setTimeout(() => {
    if (!bar && document.documentElement) {
      document.documentElement.classList.remove(ROOT_COLLAPSED_CLASS);
    }
  }, 8000);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  /* ------------------------------------------------------------------ setup */

  function boot() {
    ensureBar();

    const observer = new MutationObserver(scheduleEnsure);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // GitHub's soft navigation (Turbo/PJAX) replaces chunks of the page without
    // a full reload. Re-check the tree after each navigation event.
    const navigationEvents = [
      "turbo:load",
      "turbo:render",
      "turbo:frame-load",
      "pjax:end",
      "soft-nav:end",
      "soft-nav:success",
    ];
    for (const eventName of navigationEvents) {
      document.addEventListener(eventName, scheduleEnsure, true);
    }

    window.addEventListener("pageshow", scheduleEnsure);
    window.addEventListener("storage", onStorageChange);
  }

  function scheduleEnsure() {
    if (ensureScheduled) return;
    ensureScheduled = true;
    window.setTimeout(() => {
      ensureScheduled = false;
      ensureBar();
    }, 120);
  }

  function ensureBar() {
    const nextContent = findFileList();

    if (!nextContent) {
      if (bar && !bar.isConnected) {
        bar = null;
        content = null;
      }
      return;
    }

    if (
      nextContent === content &&
      bar &&
      bar.isConnected &&
      bar.parentElement === nextContent.parentElement &&
      bar.nextElementSibling === nextContent
    ) {
      // React occasionally re-renders the wrapper and drops our class.
      const isCollapsed = nextContent.classList.contains(CONTENT_COLLAPSED_CLASS);
      if (isCollapsed !== state.collapsed) {
        renderState({ animate: false });
      }
      return;
    }

    content = nextContent;
    if (bar) bar.remove();

    bar = createBar();
    if (!content.id) content.id = uniqueContentId();
    bar.setAttribute("aria-controls", content.id);

    content.parentElement.insertBefore(bar, content);
    renderState({ animate: false });
  }

  function findFileList() {
    for (const selector of CONTENT_SELECTORS) {
      const candidates = document.querySelectorAll(selector);
      for (const candidate of candidates) {
        if (candidate.tagName === "TABLE" || candidate.querySelector("table")) {
          return candidate;
        }
      }
    }
    return null;
  }

  function createBar() {
    const element = document.createElement("button");
    element.type = "button";
    element.className = BAR_CLASS;
    element.innerHTML =
      '<span class="ghcr-toggle__icon" aria-hidden="true">' +
      FOLDER_ICON +
      "</span>" +
      '<span class="ghcr-toggle__label"></span>' +
      '<span class="ghcr-toggle__count"></span>' +
      '<span class="ghcr-toggle__spacer" aria-hidden="true"></span>' +
      '<span class="ghcr-toggle__action" aria-hidden="true"></span>' +
      '<span class="ghcr-toggle__chevron" aria-hidden="true">' +
      CHEVRON_ICON +
      "</span>";

    element.addEventListener("click", () => {
      setCollapsed(!state.collapsed);
    });

    return element;
  }

  /* ------------------------------------------------------------------ state */

  function setCollapsed(next, { animate = true, persist = true } = {}) {
    const changed = state.collapsed !== next;
    state.collapsed = next;

    if (persist) saveCollapsed(next);
    if (!bar || !content) return;

    updateBar();
    if (changed) renderState({ animate });
  }

  function renderState({ animate }) {
    if (!content || !bar) return;

    updateBar();

    if (!animate || prefersReducedMotion()) {
      animationId += 1;
      clearAnimationStyles();
      content.classList.toggle(CONTENT_COLLAPSED_CLASS, state.collapsed);
      // Keep <html> marked while collapsed so a React re-render (or a soft
      // navigation) cannot briefly reveal the list before this script reacts.
      document.documentElement.classList.toggle(
        ROOT_COLLAPSED_CLASS,
        state.collapsed
      );
      return;
    }

    if (state.collapsed) {
      animateCollapse();
    } else {
      animateExpand();
    }
  }

  function animateCollapse() {
    const token = ++animationId;

    // The early-hide class would kill the animation, so it is only re-applied
    // once the list has finished collapsing (in finishAnimation).
    document.documentElement.classList.remove(ROOT_COLLAPSED_CLASS);
    content.classList.remove(CONTENT_COLLAPSED_CLASS);

    const height = content.getBoundingClientRect().height;
    if (!height) {
      finishAnimation(token, true);
      return;
    }

    content.style.overflow = "hidden";
    content.style.height = `${height}px`;
    content.style.opacity = "1";
    void content.offsetHeight; // force a reflow so the transition starts here

    content.style.transition =
      "height 220ms cubic-bezier(0.2, 0, 0, 1), opacity 160ms ease";
    content.style.height = "0px";
    content.style.opacity = "0";

    finishOnTransitionEnd(token, true);
  }

  function animateExpand() {
    const token = ++animationId;

    document.documentElement.classList.remove(ROOT_COLLAPSED_CLASS);
    const wasCollapsed = content.classList.contains(CONTENT_COLLAPSED_CLASS);
    content.classList.remove(CONTENT_COLLAPSED_CLASS);

    const from = wasCollapsed ? 0 : content.getBoundingClientRect().height;
    const to = content.getBoundingClientRect().height;
    if (!to || from === to) {
      finishAnimation(token, false);
      return;
    }

    content.style.overflow = "hidden";
    content.style.height = `${from}px`;
    content.style.opacity = from === 0 ? "0" : "1";
    void content.offsetHeight;

    content.style.transition =
      "height 240ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms ease";
    content.style.height = `${to}px`;
    content.style.opacity = "1";

    finishOnTransitionEnd(token, false);
  }

  function finishOnTransitionEnd(token, collapsed) {
    const onTransitionEnd = (event) => {
      if (event.target !== content || event.propertyName !== "height") return;
      content.removeEventListener("transitionend", onTransitionEnd);
      finishAnimation(token, collapsed);
    };

    content.addEventListener("transitionend", onTransitionEnd);
    // Fallback for browsers/situations where transitionend never fires.
    window.setTimeout(() => {
      content.removeEventListener("transitionend", onTransitionEnd);
      finishAnimation(token, collapsed);
    }, 400);
  }

  function finishAnimation(token, collapsed) {
    if (token !== animationId || !content) return;
    clearAnimationStyles();
    content.classList.toggle(CONTENT_COLLAPSED_CLASS, collapsed);
    document.documentElement.classList.toggle(ROOT_COLLAPSED_CLASS, collapsed);
  }

  function clearAnimationStyles() {
    if (!content) return;
    content.style.removeProperty("overflow");
    content.style.removeProperty("height");
    content.style.removeProperty("opacity");
    content.style.removeProperty("transition");
  }

  /* -------------------------------------------------------------------- bar */

  function updateBar() {
    if (!bar || !content) return;

    const strings = getStrings();
    const label = getListLabel(strings);
    const counts = describeCounts(countStrings());

    bar.querySelector(".ghcr-toggle__label").textContent = label;

    const countElement = bar.querySelector(".ghcr-toggle__count");
    countElement.textContent = counts;
    countElement.hidden = !counts;

    bar.querySelector(".ghcr-toggle__action").textContent = state.collapsed
      ? strings.expand
      : strings.collapse;

    bar.setAttribute("aria-expanded", String(!state.collapsed));
    bar.setAttribute("aria-label", counts ? `${label}, ${counts}` : label);
  }

  function getListLabel(strings) {
    // GitHub's visually hidden heading is already localized by GitHub itself.
    const heading = document.getElementById("folders-and-files");
    if (heading && /^H[1-6]$/.test(heading.tagName)) {
      const text = (heading.textContent || "").trim();
      if (text && text.length <= 60) return text;
    }
    return strings.label;
  }

  function countStrings() {
    if (!content) return { folders: 0, files: 0 };

    let rows = content.querySelectorAll("tbody tr.react-directory-row");
    if (!rows.length) {
      rows = Array.from(content.querySelectorAll("tbody tr")).filter(
        (row) => !row.classList.contains("d-none") && row.querySelector("a[href]")
      );
    }

    let folders = 0;
    let files = 0;
    for (const row of rows) {
      if (row.querySelector('svg[class*="octicon-file-directory"]')) {
        folders += 1;
      } else {
        files += 1;
      }
    }
    return { folders, files };
  }

  function describeCounts({ folders, files }) {
    const strings = getStrings();
    const parts = [];

    if (folders > 0) parts.push(formatCount(folders, strings.folder));
    if (files > 0) parts.push(formatCount(files, strings.file));

    return parts.join(" · ");
  }

  function formatCount(count, forms) {
    const form = count === 1 ? forms[0] : forms[1];
    return `${getStrings().numberFormat.format(count)} ${form}`;
  }

  function getStrings() {
    if (stringsCache) return stringsCache;

    const language = (document.documentElement.lang || navigator.language || "en")
      .toLowerCase()
      .split(/[-_]/)[0];
    const base = STRINGS[language] || STRINGS.en;

    stringsCache = {
      ...base,
      numberFormat: new Intl.NumberFormat(language),
    };
    return stringsCache;
  }

  /* ---------------------------------------------------------------- storage */

  function loadCollapsed() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === null) return DEFAULT_COLLAPSED;
      return raw !== "0";
    } catch {
      return DEFAULT_COLLAPSED;
    }
  }

  function saveCollapsed(collapsed) {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* Storage can be unavailable (private mode, blocked cookies); the
         current page still works, it just won't be remembered. */
    }
  }

  function onStorageChange(event) {
    if (event.key !== STORAGE_KEY) return;
    const next = event.newValue === null ? DEFAULT_COLLAPSED : event.newValue !== "0";
    if (next === state.collapsed) return;
    setCollapsed(next, { animate: true, persist: false });
  }

  /* ---------------------------------------------------------------- helpers */

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function uniqueContentId() {
    let id = "ghcr-files";
    let suffix = 2;
    while (document.getElementById(id)) {
      id = `ghcr-files-${suffix}`;
      suffix += 1;
    }
    return id;
  }
})();
