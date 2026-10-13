import { getToken, save, setToken } from './client';
import type { Outcome } from './ingest';
import { t } from './strings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const MESSAGES: Record<Outcome, [string, 'ok' | 'err']> = {
  saved: [t.saved, 'ok'],
  duplicate: [t.duplicate, 'ok'],
  'bad-token': [t.badToken, 'err'],
  'rate-limited': [t.rateLimited, 'err'],
  error: [t.error, 'err'],
};

function status(text: string, kind: 'ok' | 'err' | '' = '') {
  const el = $('status');
  el.textContent = text;
  el.className = kind;
}

async function init() {
  $('title').textContent = t.title;
  $<HTMLTextAreaElement>('note').placeholder = t.notePlaceholder;
  $('save').textContent = t.save;
  $('token-label').textContent = t.tokenLabel;
  $<HTMLInputElement>('token').placeholder = t.tokenPlaceholder;
  $('token-save').textContent = t.saveToken;
  $('token-summary').textContent = t.changeToken;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  // textContent only: page titles are untrusted (security rule).
  $('page').textContent = tab?.title ? `${tab.title} — ${url}` : url;
  const savable = /^https?:\/\//.test(url);
  const hasToken = (await getToken()) !== null;

  $('save-form').hidden = !savable || !hasToken;
  $<HTMLDetailsElement>('token-box').open = !hasToken;
  if (!savable) status(t.notSavable, 'err');
  else if (!hasToken) status(t.needToken);
  else $('note').focus();

  $('save-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = $<HTMLButtonElement>('save');
    button.disabled = true;
    button.textContent = t.saving;
    const outcome = await save(url, $<HTMLTextAreaElement>('note').value);
    button.disabled = false;
    button.textContent = t.save;
    status(...MESSAGES[outcome]);
    if (outcome === 'bad-token') $<HTMLDetailsElement>('token-box').open = true;
    if (outcome === 'saved' || outcome === 'duplicate') setTimeout(() => window.close(), 900);
  });

  $('token-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $<HTMLInputElement>('token');
    await setToken(input.value);
    input.value = '';
    status(t.tokenSaved, 'ok');
    $('save-form').hidden = !savable;
    $<HTMLDetailsElement>('token-box').open = false;
  });
}

void init();
