import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { crc32, inflateRawSync } from 'node:zlib';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'ghcr-build-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  for (const name of ['manifest.json', 'content.js', 'content.css', 'icons', 'scripts/build.mjs']) {
    cpSync(new URL(`../${name}`, import.meta.url), join(root, name), { recursive: true });
  }
  return {
    root,
    build: (...args) => spawnSync(process.execPath, [join(root, 'scripts/build.mjs'), ...args], {
      cwd: tmpdir(), encoding: 'utf8',
    }),
  };
}

test('both packages contain only runtime files and rebuild cleanly', t => {
  const { root, build } = fixture(t);
  const result = build();
  assert.equal(result.status, 0, result.stderr);
  const base = JSON.parse(readFileSync(join(root, 'manifest.json')));
  const expected = ['content.js', 'content.css', ...Object.values(base.icons), 'manifest.json'];
  for (const browser of ['chrome', 'firefox']) {
    const folder = join(root, 'dist', browser);
    const archive = readFileSync(join(root, 'dist', `github-collapse-repo-${browser}.zip`));
    const end = archive.length - 22;
    assert.equal(archive.readUInt32LE(end), 0x06054b50);
    assert.equal(archive.readUInt16LE(end + 10), expected.length);
    let cursor = archive.readUInt32LE(end + 16);
    for (const name of expected) {
      assert.equal(archive.readUInt32LE(cursor), 0x02014b50);
      const nameLength = archive.readUInt16LE(cursor + 28);
      assert.equal(archive.toString('utf8', cursor + 46, cursor + 46 + nameLength), name);
      const offset = archive.readUInt32LE(cursor + 42);
      assert.equal(archive.readUInt32LE(offset), 0x04034b50);
      const start = offset + 30 + nameLength;
      const data = inflateRawSync(archive.subarray(start, start + archive.readUInt32LE(cursor + 20)));
      assert.equal(data.length, archive.readUInt32LE(cursor + 24));
      assert.equal(crc32(data), archive.readUInt32LE(cursor + 16));
      assert.deepEqual(data, readFileSync(join(folder, name)));
      if (name !== 'manifest.json') assert.deepEqual(data, readFileSync(join(root, name)));
      cursor += 46 + nameLength;
    }
    assert.equal(cursor, end);
    const manifest = JSON.parse(readFileSync(join(folder, 'manifest.json')));
    if (browser === 'firefox') {
      assert.deepEqual(manifest.browser_specific_settings.gecko, {
        id: 'github-collapse-repo@brunofunnie', strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      });
      delete manifest.browser_specific_settings;
    }
    assert.deepEqual(manifest, base);
    writeFileSync(join(folder, 'stale.js'), 'old build');
  }
  const original = readFileSync(join(root, 'dist/github-collapse-repo-chrome.zip'));
  assert.equal(build().status, 0);
  assert.deepEqual(readFileSync(join(root, 'dist/github-collapse-repo-chrome.zip')), original);
  for (const browser of ['chrome', 'firefox']) {
    assert.equal(existsSync(join(root, 'dist', browser, 'stale.js')), false);
  }
  assert.deepEqual(JSON.parse(readFileSync(join(root, 'manifest.json'))), base);
});

test('single target builds and invalid arguments produce no output', t => {
  const { root, build } = fixture(t);
  assert.equal(build('safari').status, 1);
  assert.equal(build('chrome', 'firefox').status, 1);
  assert.equal(existsSync(join(root, 'dist')), false);
  assert.equal(build('firefox').status, 0);
  assert.equal(existsSync(join(root, 'dist/chrome')), false);
  assert.equal(existsSync(join(root, 'dist/firefox/manifest.json')), true);
});
