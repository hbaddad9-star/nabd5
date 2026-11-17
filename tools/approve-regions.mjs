// Records the approved snapshots of the designed regions of the page (tests/Nabd.Tests/LandingBaseline/NAME.html)
// from a running site. SiteAssetsTests then requires the served regions to equal them exactly.
//
// This is an approval step, not a way to make a failing test pass: run it only after the change has been looked
// at in the browser (tools/qa) and accepted, review the diff of the snapshots, and commit them with the change.
//
// usage: node tools/approve-regions.mjs [--host http://localhost:5054]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const host = (argv.indexOf('--host') >= 0 ? argv[argv.indexOf('--host') + 1] : 'http://localhost:5054').replace(/\/$/, '');
const dir = path.join(REPO, 'tests', 'Nabd.Tests', 'LandingBaseline');
const { regions } = JSON.parse(fs.readFileSync(path.join(dir, 'regions.json'), 'utf8'));

const page = (await (await fetch(host + '/')).text()).replace(/\r\n/g, '\n');
for (const { name } of regions) {
  const start = page.indexOf(`<!-- nabd:region ${name} `), endMarker = `<!-- /nabd:region ${name} -->`, end = page.indexOf(endMarker);
  if (start < 0 || end < start || page.indexOf(`<!-- nabd:region ${name} `, start + 1) >= 0) throw new Error(`region ${name}: markers missing or repeated`);
  const text = page.slice(start, end + endMarker.length) + '\n';
  fs.writeFileSync(path.join(dir, `${name}.html`), text);
  console.log(`${name}.html  ${text.length} characters`);
}
