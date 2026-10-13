import { downscaleToJpeg } from '@/lib/image';
import { save } from './client';
import { captureByDefault, type Outcome } from './ingest';
import { isSaved } from './savedIndex';
import { clearSaved, loadSaved, markSaved, syncSaved } from './savedStore';
import { getSession, signOut, supabase } from './session';
import { t } from './strings';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const MESSAGES: Record<Outcome, [string, 'ok' | 'err']> = {
  saved: [t.saved, 'ok'],
  duplicate: [t.duplicate, 'ok'],
  'signed-out': [t.signedOut, 'err'],
  'rate-limited': [t.rateLimited, 'err'],
  error: [t.error, 'err'],
};

function status(text: string, kind: 'ok' | 'err' | '' = '') {
  const el = $('status');
  el.textContent = text;
  el.className = kind;
}

function setText() {
  $('title').textContent = t.title;
  $('login-hint').textContent = t.needLogin;
  $('email-label').textContent = t.email;
  $('password-label').textContent = t.password;
  $('login').textContent = t.login;
  $<HTMLTextAreaElement>('note').placeholder = t.notePlaceholder;
  $('capture-label').textContent = t.capture;
  $('save').textContent = t.save;
  $('logout').textContent = t.logout;
}

/** The visible tab as a downscaled JPEG (same 2000px cap as the web app). */
async function captureTab(): Promise<Blob> {
  const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'jpeg', quality: 90 });
  return downscaleToJpeg(await (await fetch(dataUrl)).blob());
}

async function showLogin() {
  $('app').hidden = true;
  $('login-form').hidden = false;
  $('email').focus();
}

async function showApp(email: string) {
  $('login-form').hidden = true;
  $('app').hidden = false;
  $('account').textContent = email;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  // textContent only: page titles are untrusted (security rule).
  $('page').textContent = tab?.title ? `${tab.title} — ${url}` : url;
  const savable = /^https?:\/\//.test(url);
  $('save-form').hidden = !savable;
  if (!savable) return status(t.notSavable, 'err');

  const already = $('already');
  already.textContent = t.alreadySaved;
  already.hidden = !isSaved(url, await loadSaved());
  $<HTMLInputElement>('capture').checked = captureByDefault(url);
  $('note').focus();
}

async function onSave(e: SubmitEvent) {
  e.preventDefault();
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';
  const button = $<HTMLButtonElement>('save');
  button.disabled = true;
  button.textContent = t.saving;
  status('');
  try {
    let image: Blob | undefined;
    if ($<HTMLInputElement>('capture').checked) {
      try {
        image = await captureTab();
      } catch {
        return status(t.captureFailed, 'err');
      }
    }
    const outcome = await save(url, $<HTMLTextAreaElement>('note').value, image);
    status(...MESSAGES[outcome]);
    if (outcome === 'signed-out') return showLogin();
    if (outcome === 'saved' || outcome === 'duplicate') {
      await markSaved(url);
      setTimeout(() => window.close(), 900);
    }
  } finally {
    button.disabled = false;
    button.textContent = t.save;
  }
}

async function onLogin(e: SubmitEvent) {
  e.preventDefault();
  const button = $<HTMLButtonElement>('login');
  button.disabled = true;
  button.textContent = t.loggingIn;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: $<HTMLInputElement>('email').value.trim(),
    password: $<HTMLInputElement>('password').value,
  });
  button.disabled = false;
  button.textContent = t.login;
  if (error || !data.session) return status(t.loginFailed, 'err');
  $<HTMLInputElement>('password').value = '';
  status('');
  await syncSaved();
  await showApp(data.session.user.email ?? '');
}

async function onLogout() {
  await signOut();
  await clearSaved();
  status('');
  await showLogin();
}

async function init() {
  setText();
  $('save-form').addEventListener('submit', (e) => void onSave(e as SubmitEvent));
  $('login-form').addEventListener('submit', (e) => void onLogin(e as SubmitEvent));
  $('logout').addEventListener('click', () => void onLogout());
  const session = await getSession();
  if (session) await showApp(session.user.email ?? '');
  else await showLogin();
}

void init();
