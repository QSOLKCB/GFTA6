// SPDX-License-Identifier: Apache-2.0
// Regression: a GitHub Pages job retry must not leave the deployment action
// choosing between multiple artifacts with the same name.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const yaml = await readFile(new URL('../.github/workflows/pages.yml', import.meta.url),'utf8');
const uploadStart=yaml.indexOf('      - name: Upload static game\n');
const deployStart=yaml.indexOf('      - name: Deploy GFTA6\n');
assert.ok(uploadStart>=0&&deployStart>uploadStart,'Pages workflow steps required');
const upload=yaml.slice(uploadStart,deployStart);
const deploy=yaml.slice(deployStart);
const readKey=(src,key)=>{
  const line=src.split('\n').find(row => row.trimStart().startsWith(key+':'));
  assert.ok(line,'missing Pages '+key);
  return line.slice(line.indexOf(':')+1).trim();
};
test('Pages upload and deploy use the same unique per-attempt artifact',()=>{
  assert.match(upload,/uses: actions\/upload-pages-artifact@v4/);
  assert.match(deploy,/uses: actions\/deploy-pages@v4/);
  const name=readKey(upload,'name'),target=readKey(deploy,'artifact_name');
  assert.equal(name,target,'upload and deploy names must be identical');
  assert.equal(name,'github-pages-${{ github.run_id }}-${{ github.run_attempt }}');
  const render=(run,attempt)=>name
    .replace('${{ github.run_id }}',String(run))
    .replace('${{ github.run_attempt }}',String(attempt));
  assert.notEqual(render(123,1),render(123,2),'retry must not collide');
  assert.notEqual(render(123,1),render(124,1),'new run must not collide');
});

test('Pages deployment remains main-only with explicit permissions and no PR deploy',()=>{
  assert.match(yaml,/on:\n  push:\n    branches: \[main\]/);
  assert.match(yaml,/workflow_dispatch:/);
  assert.match(yaml,/if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml,/pages: write/);
  assert.match(yaml,/id-token: write/);
  assert.match(yaml,/cancel-in-progress: false/);
  assert.match(yaml,/node scripts\/check-assets\.mjs/);
});
,'m').exec(src);
  assert.ok(hit,'missing Pages '+key);
  return hit[1];
};

test('Pages upload and deploy use the same unique per-attempt artifact',()=>{
  assert.match(upload,/uses: actions\/upload-pages-artifact@v4/);
  assert.match(deploy,/uses: actions\/deploy-pages@v4/);
  const name=readKey(upload,'name'),target=readKey(deploy,'artifact_name');
  assert.equal(name,target,'upload and deploy names must be identical');
  assert.equal(name,'github-pages-${{ github.run_id }}-${{ github.run_attempt }}');
  const render=(run,attempt)=>name
    .replace('${{ github.run_id }}',String(run))
    .replace('${{ github.run_attempt }}',String(attempt));
  assert.notEqual(render(123,1),render(123,2),'retry must not collide');
  assert.notEqual(render(123,1),render(124,1),'new run must not collide');
});

test('Pages deployment remains main-only with explicit permissions and no PR deploy',()=>{
  assert.match(yaml,/on:\n  push:\n    branches: \[main\]/);
  assert.match(yaml,/workflow_dispatch:/);
  assert.match(yaml,/if: github\.ref == 'refs\/heads\/main'/);
  assert.match(yaml,/pages: write/);
  assert.match(yaml,/id-token: write/);
  assert.match(yaml,/cancel-in-progress: false/);
  assert.match(yaml,/node scripts\/check-assets\.mjs/);
});
