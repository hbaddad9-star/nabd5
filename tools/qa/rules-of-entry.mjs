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

// ---- V6.11: the owner's decisions after the split ----
const errs = [];
await send('Runtime.enable');
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); });
const vis = `(e => !!e && e.offsetWidth > 0 && e.offsetHeight > 0)`;
const byMail = async mail => { await go('/login'); await evalJs(`(() => { document.getElementById('login-email').value = ${JSON.stringify(mail)}; document.getElementById('auth-pane-login').requestSubmit(); })()`); await sleep(1500); };
await go('/login'); await evalJs(`localStorage.clear(); sessionStorage.clear()`);

// 1. a first sign-in with an unknown e-mail goes to registration
await byMail('new.person@example.com');
console.log('1 unknown e-mail →', await evalJs(`JSON.stringify({ signedIn: authState.isAuthenticated, regPane: ${vis}(document.getElementById('auth-pane-register')), loginPane: ${vis}(document.getElementById('auth-pane-login')), mail: document.getElementById('reg-email').value, msg: document.getElementById('reg-error-msg').textContent.trim(), yearShown: ${vis}(document.getElementById('reg-year')), path: location.pathname })`));
await shot(`v611-${tag}-register`);

// 2. registration asks the year
await evalJs(`(() => { document.getElementById('reg-name').value = 'سارة الخطيب'; document.querySelector('#reg-rolecards [data-rc="medicine"]').click(); document.getElementById('reg-year').value = '2'; })()`); await sleep(300);
await evalJs(`document.getElementById('reg-next-btn').click()`); await sleep(2000);
console.log('2 registered →', await evalJs(`JSON.stringify({ signedIn: authState.isAuthenticated, name: authState.user.name, track: authState.user.track, year: authState.user.year, label: authState.user.roleLabel, view: currentView })`));
console.log('2 scripts:', await evalJs(`[...document.scripts].map(s => s.src.split('/').pop()).filter(s => /admin|app|er-plus/.test(s)).join(' ')`), '| hooks:', await evalJs(`['NabdStore','NabdUni','NabdAccess','NabdCoachData','NabdCoachDrill','NabdShell','NabdRoom'].map(k => k + ':' + (typeof window[k])).join(' ')`));
console.log('2 home:', await evalJs(`[...document.querySelectorAll('#app-header nav button')].filter(${vis}).map(b => b.textContent.trim()).join(' · ') + ' | facts: ' + (document.getElementById('nh-me-facts') || {}).innerText.replace(/\\s+/g, ' ').slice(0, 120) + ' | coach card: ' + !!document.getElementById('nbx-coach')`));
await shot(`v611-${tag}-home`);

// 3. the role in the room is the track's
await evalJs(`document.getElementById('launch-er-random-btn').click()`); await sleep(2000);
console.log('3 doctor track →', await evalJs(`JSON.stringify({ view: currentView, role: __nbER.role, sw: !!document.querySelector('#view-er .er-role-sw'), line: (document.querySelector('#view-er .er-role-now') || {}).innerText })`));
await shot(`v611-${tag}-brief`);
await evalJs(`navigateTo('profile')`); await sleep(600);
await evalJs(`document.querySelector('.profile-tab-btn[data-ptab="dash"]').click()`); await sleep(400);
console.log('3 retake button shown:', await evalJs(`${vis}(document.getElementById('dash-retake'))`));
await evalJs(`document.querySelector('.profile-tab-btn[data-ptab="settings"]').click()`); await sleep(400);
await evalJs(`(() => { const f = document.querySelector('.nbx-me-form'); f.querySelector('[name="track"]').value = 'nursing'; f.requestSubmit(); })()`); await sleep(900);
await evalJs(`navigateTo('home')`); await sleep(400);
await evalJs(`document.getElementById('launch-er-random-btn').click()`); await sleep(2000);
console.log('3 after changing the track in my data →', await evalJs(`JSON.stringify({ track: authState.user.track, role: __nbER.role, sw: !!document.querySelector('#view-er .er-role-sw'), line: (document.querySelector('#view-er .er-role-now') || {}).innerText })`));
await evalJs(`navigateTo('home')`); await sleep(300); await evalJs(`logoutUser()`); await sleep(700);

// 4. a known e-mail signs in directly; a university's student too; a supervisor keeps the switch
await byMail('new.person@example.com');
console.log('4 known e-mail →', await evalJs(`JSON.stringify({ signedIn: authState.isAuthenticated, name: authState.user && authState.user.name, year: authState.user && authState.user.year, view: currentView })`));
await evalJs(`logoutUser()`); await sleep(700);
await byMail('rana.m@uni1.edu.jo');
console.log('4 roster e-mail →', await evalJs(`JSON.stringify({ signedIn: authState.isAuthenticated, name: authState.user && authState.user.name, uni: authState.user && authState.user.uni, view: currentView })`));
await evalJs(`document.getElementById('launch-er-random-btn').click()`); await sleep(2000);
console.log('4 university student in the room →', await evalJs(`JSON.stringify({ role: __nbER.role, sw: !!document.querySelector('#view-er .er-role-sw'), line: (document.querySelector('#view-er .er-role-now') || {}).innerText })`));
await evalJs(`navigateTo('home')`); await sleep(300); await evalJs(`logoutUser()`); await sleep(700);
await login('doctor'); await sleep(1200);
await evalJs(`document.querySelector('.nbx-nav [data-nbx-go="shome"]').click()`); await sleep(500);
await evalJs(`document.querySelector('[data-nbxs-act="try-er"]').click()`); await sleep(2200);
console.log('4 supervisor trying the room →', await evalJs(`JSON.stringify({ view: currentView, sw: !!document.querySelector('#view-er .er-role-sw') })`));
await evalJs(`logoutUser()`); await sleep(700);

// 5. the pages of the trainee's application after the split
await byMail('new.person@example.com');
await evalJs(`document.getElementById('app-nav-coach').click()`); await sleep(900);
console.log('5 coach page:', await evalJs(`currentView + ' | ' + (document.getElementById('view-coach').innerText || '').replace(/\\s+/g, ' ').slice(0, 140)`));
await shot(`v611-${tag}-coach`);
await evalJs(`navigateTo('profile')`); await sleep(700);
console.log('5 profile:', await evalJs(`currentView + ' | ' + document.getElementById('profile-name-heading').textContent + ' | ' + document.getElementById('profile-role-pill').textContent.trim()`));
await shot(`v611-${tag}-profile`);
await evalJs(`document.querySelector('.side-nav, #side-nav, aside') && 1`);
console.log('errors:', JSON.stringify(errs));
ws.close(); chrome.kill(); process.exit(0);
