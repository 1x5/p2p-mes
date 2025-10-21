// Простой background.js только для badge

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateBadge') {
    updateBadge(message.online);
  }
});

function updateBadge(online) {
  const color = online ? '#10b981' : '#ef4444';
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text: '●' });
}

chrome.runtime.onInstalled.addListener(() => {
  updateBadge(false);
});
