(() => {
  'use strict';
  // Deliberately inspect disclosure metadata, not the post's free-form text.
  const CELL = '[data-testid="cellInnerDiv"]';
  const SIGNALS = '[data-testid="promotedIndicator"], [data-testid="adMetadata"], [data-testid="paidPartnership"]';
  const DISCLOSURE = /^(ad|promoted|promoted post|sponsored|paid partnership(?: with .+)?|paid promotion|広告|プロモーション|宣伝|赞助|推廣|廣告|广告)$/i;
  const blocked = new Set();
  const queue = new Set();
  const style = document.createElement('style');
  style.textContent = '[data-gx-ad-hidden]{display:none!important}';
  document.head.append(style);
  let frame = 0;
  function isAd(cell) {
    const tweet = cell.querySelector('article[data-testid="tweet"]');
    if (!tweet) return false;
    const quoted = node => node.closest('[data-testid="quoteTweet"],div[role="link"][tabindex="0"]');
    if ([...cell.querySelectorAll(SIGNALS)].some(node => !quoted(node))) return true;
    // X has shipped ads inside placementTracking wrappers. Require a tweet.
    if (cell.querySelector('[data-testid="placementTracking"]') || cell.closest('[data-testid="placementTracking"]')) return true;
    return [...tweet.querySelectorAll('span,[aria-label]')].some(node => {
      if (node.closest('[data-testid="tweetText"],[data-testid="quoteTweet"],div[role="link"][tabindex="0"]')) return false;
      const text = (node.getAttribute('aria-label') || (node.children.length ? '' : node.textContent)).trim();
      return DISCLOSURE.test(text) && !node.closest('[data-testid="User-Name"]');
    });
  }
  function flush() {
    frame = 0;
    for (const cell of queue) {
      if (!cell.isConnected) continue;
      const hide = isAd(cell);
      cell.toggleAttribute('data-gx-ad-hidden', hide);
      if (hide) blocked.add(cell); else blocked.delete(cell);
    }
    queue.clear();
    for (const cell of blocked) if (!cell.isConnected) blocked.delete(cell);
  }
  function mark(node) {
    if (!(node instanceof Element)) node = node.parentElement;
    if (!node) return;
    const cell = node.closest(CELL); if (cell) queue.add(cell);
    node.querySelectorAll(CELL).forEach(cell => queue.add(cell));
  }
  new MutationObserver(records => {
    for (const record of records) { mark(record.target); for (const node of record.addedNodes) mark(node); }
    if (queue.size && !frame) frame = requestAnimationFrame(flush);
  }).observe(document.documentElement, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['data-testid','aria-label']});
  mark(document.documentElement); flush();
})();
