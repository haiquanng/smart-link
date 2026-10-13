import { save } from './client';
import { t } from './strings';

const MENU_ID = 'smart-link-save';
const BADGE: Record<string, [string, string]> = {
  saved: ['✓', '#047857'],
  duplicate: ['✓', '#047857'],
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: t.menuSave, contexts: ['page', 'link'] });
});

// Right-click save without a note; the badge shows the result briefly.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!url || !/^https?:\/\//.test(url)) return;
  const outcome = await save(url, '');
  const [text, color] = BADGE[outcome] ?? ['!', '#dc2626'];
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text, tabId: tab?.id });
  setTimeout(() => void chrome.action.setBadgeText({ text: '', tabId: tab?.id }), 3000);
});
