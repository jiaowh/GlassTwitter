(() => {
  const marked = new Set();
  let frame = 0;
  const home = () => /^\/home\/?$/.test(location.pathname);
  function mark(node) {
    if (!node.hasAttribute('data-gx-home-hidden')) node.setAttribute('data-gx-home-hidden', '');
    marked.add(node);
  }
  function update() {
    frame = 0;
    if (!home()) {
      for (const node of marked) node.removeAttribute('data-gx-home-hidden');
      marked.clear(); return;
    }
    for (const node of marked) if (!node.isConnected) marked.delete(node);
    // Mobile X can mount its header OUTSIDE primaryColumn. Find the tablist
    // globally, but never hide ancestors containing posts or the primary column.
    for (const tabs of document.querySelectorAll('[role="tablist"]')) {
      if (tabs.closest('article,[role="dialog"]')) continue;
      mark(tabs);
      for (let node = tabs.parentElement; node && !['MAIN','BODY','HTML'].includes(node.tagName); node = node.parentElement) {
        if (node.matches('[data-testid="primaryColumn"]') || node.querySelector('article,[data-testid="cellInnerDiv"],[data-testid="primaryColumn"]')) break;
        const position = getComputedStyle(node).position;
        if (position === 'fixed' || position === 'sticky') mark(node);
      }
    }
    // Hide only the new-posts pill, not general errors/toasts or post contents.
    for (const node of document.querySelectorAll('[data-testid="newTweetsPill"], [data-testid="NewTweetsPill"], button, [role="button"]')) {
      if (node.closest('article,[role="dialog"]')) continue;
      const text = (node.textContent || '').trim();
      if (/^(?:↑\s*)?(?:\d+\s+)?(?:new posts?|new tweets?|posted)$/i.test(text) ||
          node.matches('[data-testid="newTweetsPill"],[data-testid="NewTweetsPill"]')) mark(node);
    }
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree:true, childList:true, characterData:true, attributes:true,
    attributeFilter:['role','data-testid','style']
  });
  window.navigation?.addEventListener('currententrychange', schedule);
  addEventListener('popstate', schedule);
  update();
})();
