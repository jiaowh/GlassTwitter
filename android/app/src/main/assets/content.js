(() => {
  "use strict";

  const CELL = '[data-testid="cellInnerDiv"]';
  const PHOTO = '[data-testid="tweetPhoto"] img';
  const VIDEO = '[data-testid="videoPlayer"] video[poster]';
  // Quote previews have their own identity block. Their thumbnail must not
  // become a second background image or extend the parent post's reflection.
  const QUOTE = '[data-testid="quoteTweet"], div[role="link"][tabindex="0"]:has([data-testid="User-Name"])';
  const tracked = new Set();
  const visible = new Set();
  const dirty = new Set();
  let enabled = false;
  let frame = 0;
  let navigationToggle;
  const ensureNavigation = () => {
    if (!enabled || !document.body || document.documentElement.classList.contains("glass-x-app")) return;
    if (!navigationToggle) {
      navigationToggle = document.createElement("button");
      navigationToggle.id = "gx-navigation-toggle";
      navigationToggle.type = "button";
      navigationToggle.textContent = "Show navigation";
      navigationToggle.setAttribute("aria-expanded", "false");
      navigationToggle.addEventListener("click", () => {
        const open = document.documentElement.classList.toggle("glass-x-navigation");
        navigationToggle.setAttribute("aria-expanded", String(open));
        navigationToggle.textContent = open ? "Hide navigation" : "Show navigation";
      });
    }
    if (!navigationToggle.isConnected) document.body.append(navigationToggle);
  };
  const layouts = new WeakMap();
  const clearLayout = (cell) => {
    const previous = layouts.get(cell);
    previous?.roles.forEach((_, node) => node.removeAttribute("data-gx-layout"));
    previous?.media.forEach((node) => node.removeAttribute("data-gx-expand-media"));
    previous?.natural.forEach((_, node) => {
      node.removeAttribute("data-gx-natural-media");
      node.style.removeProperty("--gx-natural-ratio");
    });
    layouts.delete(cell);
  };
  const updateLayout = (cell) => {
    const article = cell.querySelector('article[data-testid="tweet"]');
    const own = (node) => node.closest('article[data-testid="tweet"]') === article && !node.closest(QUOTE);
    const avatar = article && Array.from(article.querySelectorAll(
      '[data-testid="Tweet-User-Avatar"], [data-testid^="UserAvatar-Container-"]'
    )).find(own);
    const identity = article && Array.from(article.querySelectorAll('[data-testid="User-Name"]')).find(own);
    if (!avatar || !identity) return clearLayout(cell);

    // Discover X's two-column row from semantic anchors, not generated classes
    // or a fixed number of wrapper divs. Keep React's DOM and event targets intact.
    let row = avatar.parentElement;
    while (row && row !== article && !row.contains(identity)) row = row.parentElement;
    if (!row || row === article) return clearLayout(cell);
    const branches = Array.from(row.children);
    const avatarColumn = branches.find((node) => node === avatar || node.contains(avatar));
    const contentColumn = branches.find((node) => node.contains(identity));
    if (branches.length !== 2 || !avatarColumn || !contentColumn || avatarColumn === contentColumn) {
      return clearLayout(cell);
    }
    const wrappers = [contentColumn];
    let content = contentColumn;
    while (content.children.length === 1 && content.firstElementChild.tagName === "DIV") {
      content = content.firstElementChild;
      wrappers.push(content);
    }
    const header = Array.from(content.children).find((node) => node === identity || node.contains(identity));
    // Unknown/nested layouts fall back to native rather than moving entire posts
    // into the header. Only unlabelled structural divs may use display:contents.
    if (!header || header.matches('[data-testid="tweetText"]') ||
        header.querySelector('[data-testid="tweetText"], [data-testid="tweetPhoto"], [data-testid="videoPlayer"], [role="group"]') ||
        wrappers.some((node) => node.tagName !== "DIV" || node.hasAttribute("role") || node.hasAttribute("tabindex"))) {
      return clearLayout(cell);
    }
    const roles = new Map([[article, "post"], [row, "row"], [avatarColumn, "avatar"], [header, "header"]]);
    wrappers.forEach((node) => roles.set(node, "contents"));
    Array.from(content.children).filter((node) => node !== header).forEach((node) => roles.set(node, "body"));
    const expanded = new Set();
    const natural = new Map();
    const photos = Array.from(article.querySelectorAll('[data-testid="tweetPhoto"]')).filter(own);
    // Only a single main photo: multi-image grids, quote thumbnails and video
    // player internals retain their native arrangement and aspect-ratio logic.
    if (photos.length === 1) {
      let node = photos[0];
      while (node && node !== content && !wrappers.includes(node)) {
        expanded.add(node);
        node = node.parentElement;
      }
      const image = photos[0].querySelector("img");
      if (image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0 &&
          !article.querySelector('[data-testid="videoPlayer"]')) {
        expanded.forEach((wrapper) => {
          natural.set(wrapper, wrapper === photos[0] ? "frame" : "path");
          // X's aspect-ratio spacer is empty and decorative. Do not hide any
          // element with children, text, semantics, or an interactive role.
          for (const child of wrapper.children) {
            if (child.tagName === "DIV" && !child.children.length && !child.textContent.trim() &&
                !child.hasAttribute("role") && !child.hasAttribute("aria-label") &&
                !child.hasAttribute("tabindex") && parseFloat(getComputedStyle(child).paddingBottom) > 0) {
              natural.set(child, "spacer");
            }
          }
        });
        natural.set(image, "image");
        photos[0].style.setProperty("--gx-natural-ratio", `${image.naturalWidth} / ${image.naturalHeight}`);
      }
    }
    const previous = layouts.get(cell);
    previous?.roles.forEach((_, node) => { if (!roles.has(node)) node.removeAttribute("data-gx-layout"); });
    previous?.media.forEach((node) => { if (!expanded.has(node)) node.removeAttribute("data-gx-expand-media"); });
    previous?.natural.forEach((_, node) => {
      if (!natural.has(node)) {
        node.removeAttribute("data-gx-natural-media");
        node.style.removeProperty("--gx-natural-ratio");
      }
    });
    natural.forEach((kind, node) => {
      if (node.getAttribute("data-gx-natural-media") !== kind) node.setAttribute("data-gx-natural-media", kind);
    });
    roles.forEach((role, node) => {
      if (node.getAttribute("data-gx-layout") !== role) node.setAttribute("data-gx-layout", role);
    });
    expanded.forEach((node) => {
      if (!node.hasAttribute("data-gx-expand-media")) node.setAttribute("data-gx-expand-media", "");
    });
    layouts.set(cell, { roles, media: expanded, natural });
  };
  const clearMedia = (cell) => {
    for (const property of ["--gx-media-image", "--gx-media-count", "--gx-media-position", "--gx-media-size", "--gx-media-top", "--gx-media-height", "--gx-media-left", "--gx-media-right", "--gx-fill-left", "--gx-fill-width"]) {
      cell.style.removeProperty(property);
    }
  };

  // CSS cannot copy a descendant image into its ancestor's background. Reuse
  // the existing URL, without canvas, pixel extraction, or video frame polling.
  const updateMedia = (cell) => {
    const article = cell.querySelector('article[data-testid="tweet"]');
    const isMainMedia = (item) => item.closest('article[data-testid="tweet"]') === article
      && !item.closest(QUOTE);
    const media = Array.from(cell.querySelectorAll(PHOTO)).filter(isMainMedia).slice(0, 4);
    if (!media.length) {
      const video = Array.from(cell.querySelectorAll(VIDEO)).find(isMainMedia);
      if (video) media.push(video);
    }
    const sources = media.map((item) => item.currentSrc && item instanceof HTMLImageElement
      ? item.currentSrc : item instanceof HTMLImageElement ? item.src : item.poster);
    const images = [];
    const bounds = [];
    for (const [index, source] of sources.entries()) {
      if (!source) continue;
      try {
        const url = new URL(source, location.href);
        const rect = media[index].getBoundingClientRect();
        if (url.protocol === "https:" && rect.width > 0 && rect.height > 0) {
          images.push(`url(${JSON.stringify(url.href)})`);
          bounds.push(rect);
        }
      } catch { /* An incomplete lazy-load URL is retried on its next update. */ }
    }
    const value = images.join(", ");
    if (value) {
      // Only read geometry when media changes, loads, enters view, or resizes.
      // Align vertically to the media so reflections do not flood the header.
      const top = Math.min(...bounds.map((rect) => rect.top));
      const bottom = Math.max(...bounds.map((rect) => rect.bottom));
      const left = Math.min(...bounds.map((rect) => rect.left));
      const right = Math.max(...bounds.map((rect) => rect.right));
      const cellBounds = cell.getBoundingClientRect();

      cell.style.setProperty("--gx-media-top", `${Math.round(top - cellBounds.top)}px`);
      cell.style.setProperty("--gx-media-height", `${Math.round(bottom - top)}px`);
      cell.style.setProperty("--gx-media-left", `${Math.round(left - cellBounds.left)}px`);
      cell.style.setProperty("--gx-media-right", `${Math.round(cellBounds.right - right)}px`);
      // Preserve the photo grid's arrangement, including 2x2 grids. Background
      // percentage positions describe the available space, not the layer width.
      const width = right - left;
      const height = bottom - top;
      cell.style.setProperty("--gx-media-size", bounds.map((rect) =>
        images.length === 1 ? "cover" : `${rect.width / width * 100}% auto`
      ).join(", "));
      cell.style.setProperty("--gx-media-position", bounds.map((rect) => {
        const x = width - rect.width > 0.5 ? (rect.left - left) / (width - rect.width) * 100 : 50;
        const y = height - rect.height > 0.5 ? (rect.top - top) / (height - rect.height) * 100 : 50;
        return `${x}% ${y}%`;
      }).join(", "));
    }
    if (cell.style.getPropertyValue("--gx-media-image") !== value) {
      if (value) {
        cell.style.setProperty("--gx-media-image", value);
        cell.style.setProperty("--gx-media-count", String(images.length));
      } else clearMedia(cell);
    }
  };

  const sizes = new ResizeObserver((entries) => {
    if (!enabled) return;
    entries.forEach(({ target }) => dirty.add(target));
    schedule();
  });
  const visibility = new IntersectionObserver((entries) => {
    if (!enabled) return;
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visible.add(target);
        sizes.observe(target);
        dirty.add(target);
      } else {
        visible.delete(target);
        sizes.unobserve(target);
        clearMedia(target);
      }
    }
    schedule();
  }, { rootMargin: "200px 0px" });

  const flush = () => {
    frame = 0;
    ensureNavigation();
    for (const cell of tracked) {
      if (!cell.isConnected || !cell.closest('[data-testid="primaryColumn"]')) {
        visibility.unobserve(cell);
        sizes.unobserve(cell);
        tracked.delete(cell);
        visible.delete(cell);
        clearMedia(cell);
        clearLayout(cell);
      }
    }
    for (const cell of dirty) {
      if (tracked.has(cell)) {
        updateLayout(cell);
        if (visible.has(cell)) updateMedia(cell);
      }
    }
    dirty.clear();
  };
  const schedule = () => {
    if (enabled && !frame) frame = requestAnimationFrame(flush);
  };
  const mark = (cell) => {
    if (!cell?.closest('[data-testid="primaryColumn"]')) return;
    if (!tracked.has(cell)) {
      tracked.add(cell);
      visibility.observe(cell);
    }
    dirty.add(cell);
  };
  const discover = (node) => {
    if (!(node instanceof Element)) return;
    mark(node.closest(CELL));
    node.querySelectorAll(CELL).forEach(mark);
  };
  const mutations = new MutationObserver((records) => {
    for (const record of records) {
      mark(record.target.closest?.(CELL));
      for (const node of record.addedNodes) discover(node);
    }
    schedule();
  });
  const mediaLoaded = (event) => {
    if (event.target instanceof HTMLImageElement) {
      mark(event.target.closest(CELL));
      schedule();
    }
  };

  // Observe only while home is active. Process changed subtrees in one frame,
  // and decorate only near-visible cells. No per-post event listeners.
  const syncRoute = () => {
    const home = /^\/home\/?$/.test(window.location.pathname);
    document.documentElement.classList.toggle("glass-x-home", home);
    if (home === enabled) return;
    enabled = home;
    if (enabled) {
      discover(document.documentElement);
      mutations.observe(document.documentElement, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["src", "srcset", "poster"]
      });
      document.addEventListener("load", mediaLoaded, true);
      schedule();
    } else {
      document.documentElement.classList.remove("glass-x-navigation");
      navigationToggle?.remove();
      navigationToggle = null;
      mutations.disconnect();
      visibility.disconnect();
      sizes.disconnect();
      document.removeEventListener("load", mediaLoaded, true);
      cancelAnimationFrame(frame);
      frame = 0;
      tracked.forEach(clearMedia);
      tracked.forEach(clearLayout);
      tracked.clear();
      visible.clear();
      dirty.clear();
    }
  };

  syncRoute();
  // Chrome 111+ exposes this event for history.pushState/replaceState as well
  // as back/forward navigation. No patching X's scripts or polling the DOM.
  if (window.navigation) {
    window.navigation.addEventListener("currententrychange", syncRoute);
  } else {
    // Older Firefox: check only the URL, never scan the DOM on a timer.
    let route = location.pathname;
    setInterval(() => {
      if (route !== location.pathname) { route = location.pathname; syncRoute(); }
    }, 500);
    window.addEventListener("popstate", syncRoute);
  }
  window.addEventListener("pageshow", syncRoute);
  window.addEventListener("resize", () => {
    if (!enabled) return;
    visible.forEach((cell) => dirty.add(cell));
    schedule();
  });
})();
