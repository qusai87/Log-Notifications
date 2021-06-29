(async () => {
  const src = chrome.runtime.getURL("src/content/content-main.js");
  const contentMain = await import(src);
})();