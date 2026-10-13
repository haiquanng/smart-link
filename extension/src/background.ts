import { save } from './client';
import { isSaved } from './savedIndex';
import { loadSaved, markSaved, SAVED_STORAGE_KEY, syncSaved } from './savedStore';
import { t } from './strings';

const MENU_ID = 'smart-link-save';
const SYNC_ALARM = 'sync-saved';
const GREEN = '#047857';
const RED = '#dc2626';

/** ✓ on the icon when this tab's page is already saved; checked on-device only. */
async function showState(tabId: number, url: string | undefined): Promise<void> {
  const saved = !!url && isSaved(url, await loadSaved());
  await chrome.action.setBadgeBackgroundColor({ tabId, color: GREEN });
  await chrome.action.setBadgeText({ tabId, text: saved ? '✓' : '' });
  await chrome.action.setTitle({ tabId, title: saved ? t.badgeSaved : t.title });
}

async function refreshActiveTabs(): Promise<void> {
  const tabs = await chrome.tabs.query({ active: true });
  await Promise.all(tabs.map((tab) => (tab.id === undefined ? undefined : showState(tab.id, tab.url))));
}

// Alarms may be dropped on browser restart, so (re)create them on both events.
function startSync(): void {
  void chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 30 });
  void syncSaved();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: t.menuSave, contexts: ['page', 'link'] });
  startSync();
});
chrome.runtime.onStartup.addListener(startSync);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SYNC_ALARM) void syncSaved();
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  void chrome.tabs.get(tabId).then((tab) => showState(tabId, tab.url));
});
chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  if (change.url || change.status === 'complete') void showState(tabId, tab.url);
});
// Saves, sign-in and sign-out rewrite the list; repaint the visible tabs.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && SAVED_STORAGE_KEY in changes) void refreshActiveTabs();
});

// Right-click save without a note.
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const url = info.linkUrl ?? info.pageUrl ?? tab?.url;
  if (!url || !/^https?:\/\//.test(url)) return;
  const outcome = await save(url, '');
  if (outcome === 'saved' || outcome === 'duplicate') return markSaved(url);
  if (tab?.id === undefined) return;
  const tabId = tab.id;
  await chrome.action.setBadgeBackgroundColor({ tabId, color: RED });
  await chrome.action.setBadgeText({ tabId, text: '!' });
  await chrome.action.setTitle({ tabId, title: outcome === 'signed-out' ? t.needLogin : t.error });
  setTimeout(() => void showState(tabId, tab.url), 3000);
});
