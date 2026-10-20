#!/usr/bin/env node
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browsers = ['chrome', 'firefox'];
const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !browsers.includes(args[0]))) {
  console.error('Usage: node scripts/build.mjs [chrome|firefox]');
  process.exit(1);
}

// shortcut: classic ZIP with ASCII paths; use a ZIP library if packages need ZIP64 or Unicode paths.
function zip(files) {
  const entries = [];
  const directory = [];
  let offset = 0;
  for (const [name, data] of files) {
    const filename = Buffer.from(name);
    const compressed = deflateRawSync(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(33, 12); // Fixed January 1, 1980 date makes builds reproducible.
    header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(filename.length, 26);
    entries.push(header, filename, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    header.copy(central, 6, 4, 30);
    central.writeUInt32LE(offset, 42);
    directory.push(central, filename);
    offset += header.length + filename.length + compressed.length;
  }
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.size, 8);
  end.writeUInt16LE(files.size, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...entries, central, end]);
}

for (const browser of args.length ? args : browsers) {
  const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
  if (browser === 'firefox') {
    manifest.browser_specific_settings = {
      gecko: {
        id: 'github-collapse-repo@brunofunnie',
        strict_min_version: '140.0',
        data_collection_permissions: { required: ['none'] },
      },
    };
  }
  const files = new Map(
    ['content.js', 'content.css', ...Object.values(manifest.icons)]
      .map(name => [name, readFileSync(join(root, name))]),
  );
  files.set('manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
  const archive = zip(files);
  const output = join(root, 'dist', browser);
  rmSync(output, { recursive: true, force: true });
  for (const [name, data] of files) {
    const target = join(output, name);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, data);
  }
  writeFileSync(join(root, 'dist', `github-collapse-repo-${browser}.zip`), archive);
  console.log(`Built dist/${browser} and dist/github-collapse-repo-${browser}.zip`);
}
