// Headless Chrome walk over the DevTools protocol (no dependencies; Node 22+ for the built-in WebSocket).
// usage: node tools/qa/<walk>.mjs <outDir> [width=1440] [height=900]
// env: NABD_HOST (default http://localhost:5054), CHROME (path to chrome or msedge)
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const [outDir = 'qa-out', W = '1440', H = '900'] = process.argv.slice(2);
const HOST = process.env.NABD_HOST || 'http://localhost:5054';
const PORT = 9333 + Math.floor(Math.random() * 200);
const profile = path.join(os.tmpdir(), 'nabd-qa-chrome-' + PORT); // a fresh browser: empty storage every run
fs.mkdirSync(outDir, { recursive: true });
const CHROME = process.env.CHROME || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'google-chrome');
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  '--hide-scrollbars', '--no-first-run', '--disable-gpu', 'about:blank',
], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 120 && !target; i++) {
  await sleep(250);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find(t => t.type === 'page'); } catch { /* not up yet */ }
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(res => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async name => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(r.result.data, 'base64'));
  console.log('shot', name);
};
const go = async url => { await send('Page.navigate', { url: HOST + url }); await sleep(2200); };
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: +W < 600 });
const tag = `${W}`;
const at = async (sel, name, offset = -90) => {
  const ok = await evalJs(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; document.documentElement.style.scrollBehavior = 'auto'; const y = e.getBoundingClientRect().top + scrollY + (${offset}); scrollTo(0, y); return true; })()`);
  await sleep(900);
  if (ok) await shot(name); else console.log('missing', sel);
};
const login = async who => {
  await go('/login');
  await evalJs(`document.querySelector('[data-demo-login="${who}"]').click()`);
  await sleep(1800);
};

// ---- QA 5 (V6.11): every seat, every screen: errors, broken images, overflow, empty pages ----
const errs = [];
await send('Runtime.enable');
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').split('\n')[0]); if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('console.error: ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 160)); });
const vis = `(e => !!e && e.offsetWidth > 0 && e.offsetHeight > 0)`;
const check = async label => {
  const r = await evalJs(`(() => {
    const over = document.documentElement.scrollWidth - innerWidth;
    const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.offsetWidth > 0).map(i => i.getAttribute('src'));
    const views = [...document.querySelectorAll('section[id^="view-"]')].filter(${vis}).map(s => s.id);
    const main = views.length ? document.getElementById(views[0]).innerText.trim().length : document.body.innerText.trim().length;
    const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 2 || r.left < -2) && getComputedStyle(e).position !== 'fixed' && !e.closest('[aria-hidden="true"], .hidden, #app-sidebar, .nbx-table-wrap, .nbx-tbl, table, pre, .er-chat'); }).slice(0, 3).map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]) + ' ' + Math.round(e.getBoundingClientRect().left) + '..' + Math.round(e.getBoundingClientRect().right));
    return JSON.stringify({ over, broken, views, chars: main, wide });
  })()`);
  const o = JSON.parse(r || '{}');
  const bad = o.over > 1 || (o.broken || []).length || !o.chars;
  console.log((bad ? '✗ ' : '✓ ') + label + ' | views ' + (o.views || []).join(',') + ' | chars ' + o.chars + (o.over > 1 ? ' | OVERFLOW ' + o.over + 'px ' + (o.wide || []).join(' ; ') : '') + ((o.broken || []).length ? ' | BROKEN ' + o.broken.join(' ') : ''));
};
const byMail = async mail => { await go('/login'); await evalJs(`(() => { document.getElementById('login-email').value = ${JSON.stringify(mail)}; document.getElementById('auth-pane-login').requestSubmit(); })()`); await sleep(1500); };
const out = async () => { await evalJs(`(() => { try { navigateTo('home'); } catch (e) {} try { logoutUser(); } catch (e) {} })()`); await sleep(700); };
const nav = async id => { await evalJs(`(b => b && b.click())(document.getElementById('${id}'))`); await sleep(800); };
await go('/'); await evalJs(`localStorage.clear(); sessionStorage.clear()`);

// ===== A. guest =====
await go('/'); await check('A guest landing');
for (const y of [0.25, 0.5, 0.75, 1]) { await evalJs(`scrollTo(0, document.documentElement.scrollHeight * ${y} - innerHeight)`); await sleep(500); }
await check('A guest landing (scrolled, lazy images)');
await shot(`qa5-${tag}-A-landing`);
console.log('A header links:', await evalJs(`[...document.querySelectorAll('.nl-site-header a, .nl-site-header button')].filter(${vis}).map(b => b.textContent.trim().replace(/\\s+/g, ' ')).filter(Boolean).join(' · ')`));
await go('/login'); await check('A /login');
await go('/register'); await check('A /register');

// ===== B. sign-in edge cases =====
await go('/login');
await evalJs(`(() => { document.getElementById('login-email').value = ''; document.getElementById('auth-pane-login').requestSubmit(); })()`); await sleep(500);
console.log('B empty e-mail →', await evalJs(`document.getElementById('login-error-msg').textContent.trim() + ' | signed in ' + authState.isAuthenticated`));
await evalJs(`(() => { document.getElementById('login-email').value = 'not-an-email'; document.getElementById('auth-pane-login').requestSubmit(); })()`); await sleep(500);
console.log('B bad e-mail →', await evalJs(`document.getElementById('login-error-msg').textContent.trim() + ' | signed in ' + authState.isAuthenticated`));
await byMail('someone@uni1.edu.jo');
console.log('B contracted domain, not on roster →', await evalJs(`JSON.stringify({ signedIn: authState.isAuthenticated, path: location.pathname, login: document.getElementById('login-error-msg').textContent.trim().slice(0, 120), reg: document.getElementById('reg-error-msg').textContent.trim().slice(0, 120) })`));
await go('/register');
await evalJs(`(() => { document.getElementById('reg-name').value = ''; document.getElementById('reg-email').value = 'x1@example.com'; document.getElementById('reg-next-btn').click(); })()`); await sleep(600);
console.log('B register without a name →', await evalJs(`document.getElementById('reg-error-msg').textContent.trim() + ' | signed in ' + authState.isAuthenticated`));
await evalJs(`(() => { document.getElementById('reg-name').value = 'سين'; document.getElementById('reg-email').value = 'x1@example.com'; document.querySelectorAll('#reg-rolecards [data-rc]').forEach(c => c.classList.remove('is-on', 'active', 'selected')); document.getElementById('reg-next-btn').click(); })()`); await sleep(1200);
console.log('B register without choosing a track →', await evalJs(`JSON.stringify({ msg: document.getElementById('reg-error-msg').textContent.trim(), signedIn: authState.isAuthenticated, track: authState.user && authState.user.track })`));
await out();

// ===== C. independent trainee =====
await go('/register');
await evalJs(`(() => { document.getElementById('reg-name').value = 'ليان حداد'; document.getElementById('reg-email').value = 'layan.h@example.com'; document.querySelector('#reg-rolecards [data-rc="nursing"]').click(); document.getElementById('reg-year').value = '3'; document.getElementById('reg-next-btn').click(); })()`); await sleep(2200);
await check('C home');
await shot(`qa5-${tag}-C-home`);
console.log('C header:', await evalJs(`[...document.querySelectorAll('#app-header nav button')].filter(${vis}).map(b => b.textContent.trim()).join(' · ')`));
console.log('C academic part visible:', await evalJs(`['home-quick-uni-btn','app-nav-uni','home-student-uni-section','side-uni-portal-btn'].filter(id => ${vis}(document.getElementById(id))).join(',') || 'none'`));
await evalJs(`(b => b && b.click())(document.querySelector('#sidebar-toggle, #app-menu-btn, [aria-controls="app-sidebar"]'))`); await sleep(600);
console.log('C sidebar:', await evalJs(`[...document.querySelectorAll('#app-sidebar button, #app-sidebar a')].filter(${vis}).map(b => b.textContent.trim().replace(/\\s+/g, ' ')).filter(Boolean).join(' | ')`));
const locked = await evalJs(`(() => { const b = [...document.querySelectorAll('#app-sidebar button, #app-sidebar a')].find(x => /قريباً/.test(x.textContent)); if (!b) return 'no locked item'; const v = currentView; b.click(); return 'clicked «' + b.textContent.trim().replace(/\\s+/g, ' ') + '» → ' + currentView + (currentView === v ? ' (stayed)' : ''); })()`); await sleep(600);
console.log('C locked room:', locked);
await evalJs(`(b => b && b.click())(document.querySelector('[data-close-sidebar], #sidebar-close, #app-sidebar-backdrop'))`); await sleep(300);
await nav('app-nav-fields'); await check('C training sections');
await nav('app-nav-reports'); await check('C my reports');
await nav('app-nav-coach'); await check('C coach page'); await shot(`qa5-${tag}-C-coach`);
await evalJs(`navigateTo('profile')`); await sleep(700); await check('C profile');
for (const t of ['dash', 'settings', 'certificate']) { await evalJs(`(b => b && b.click())(document.querySelector('.profile-tab-btn[data-ptab="${t}"]'))`); await sleep(400); await check('C profile tab ' + t); }
await evalJs(`navigateTo('home')`); await sleep(400);
await evalJs(`document.getElementById('launch-er-random-btn').click()`); await sleep(2200);
await check('C ER briefing'); await shot(`qa5-${tag}-C-room`);
console.log('C room role:', await evalJs(`__nbER.role + ' | ' + ((document.querySelector('#view-er .er-role-now') || {}).innerText || 'no line')`));
await evalJs(`document.getElementById('er-brief-go') && document.getElementById('er-brief-go').click()`); await sleep(1200);
await check('C ER room running');
await evalJs(`history.back()`); await sleep(1000);
console.log('C back from the room →', await evalJs(`currentView + ' ' + location.pathname + ' | signed in ' + authState.isAuthenticated`));
await out();
console.log('C after sign-out →', await evalJs(`currentView + ' ' + location.pathname + ' | signed in ' + authState.isAuthenticated`));
await evalJs(`history.back()`); await sleep(1000);
console.log('C back after sign-out →', await evalJs(`currentView + ' ' + location.pathname + ' | signed in ' + authState.isAuthenticated + ' | app header shown ' + ${vis}(document.getElementById('app-header'))`));

// ===== D. university student =====
await byMail('zaid.a@uni1.edu.jo');
await check('D student home');
console.log('D academic part:', await evalJs(`['home-quick-uni-btn','app-nav-uni','home-student-uni-section','side-uni-portal-btn'].filter(id => ${vis}(document.getElementById(id))).join(',')`));
await evalJs(`navigateTo('university')`); await sleep(900); await check('D university part');
console.log('D assignments:', await evalJs(`[...document.querySelectorAll('[data-nb8-open-case]')].filter(${vis}).map(b => b.getAttribute('data-nb8-open-case') + ':' + b.textContent.trim().slice(0, 30)).join(' | ') || 'none'`));
const firstCase = await evalJs(`(b => b ? (b.click(), b.getAttribute('data-nb8-open-case')) : '')([...document.querySelectorAll('[data-nb8-open-case]')].find(${vis}))`); await sleep(2400);
if (firstCase) console.log('D assignment opens →', await evalJs(`currentView + ' ' + (__nbER.E && __nbER.E.c.id)`), 'asked', firstCase);
await out();

// ===== E. supervisor =====
await login('doctor'); await sleep(1000);
for (const p of ['shome', 'sassign', 'sstudents', 'sresults']) { await evalJs(`(b => b && b.click())(document.querySelector('.nbx-nav [data-nbx-go="${p}"]'))`); await sleep(700); await check('E supervisor ' + p + ' «' + await evalJs(`(document.getElementById('nbx-title') || {}).textContent`) + '»'); }
await shot(`qa5-${tag}-E-results`);
for (const v of ['home', 'profile', 'coach']) { await evalJs(`navigateTo('${v}')`); await sleep(500); console.log('E supervisor → ' + v + ':', await evalJs(`currentView`)); }
await out();

// ===== F. university admin =====
await login('uniadmin'); await sleep(1000);
for (const p of ['uhome', 'ucourses', 'ustaff', 'ustudents', 'ulibrary', 'ureports', 'usettings']) { await evalJs(`(b => b && b.click())(document.querySelector('.nbx-nav [data-nbx-go="${p}"]'))`); await sleep(700); await check('F university ' + p + ' «' + await evalJs(`(document.getElementById('nbx-title') || {}).textContent`) + '»'); }
await shot(`qa5-${tag}-F-settings`);
await out();

// ===== G. Nabd admin =====
await login('admin'); await sleep(1000);
for (const p of ['overview', 'unis', 'users', 'subs', 'cases', 'sources', 'rules', 'audit', 'settings']) { await evalJs(`(b => b && b.click())(document.querySelector('.nbx-nav [data-nbx-go="${p}"]'))`); await sleep(700); await check('G admin ' + p + ' «' + await evalJs(`(document.getElementById('nbx-title') || {}).textContent`) + '»'); }
await shot(`qa5-${tag}-G-overview`);
await out();

console.log('errors:', JSON.stringify([...new Set(errs)]));
ws.close(); chrome.kill(); process.exit(0);
