#!/usr/bin/env node

/**
 * Delete embeddings from Cloudflare KV (all or by document prefix)
 *
 * Usage examples:
 *   # List keys (optionally by prefix)
 *   CF_ACCOUNT_ID=... CF_KV_NAMESPACE_ID=... CF_API_TOKEN=... node scripts/kv-delete-embeddings.mjs list --prefix docs/resume
 *
 *   # Delete all keys for a document (new scheme)
 *   node scripts/kv-delete-embeddings.mjs delete --prefix docs/resume --yes
 *
 *   # Delete ALL embeddings (danger!)
 *   node scripts/kv-delete-embeddings.mjs delete --all --yes
 *
 *   # Delete legacy per-file chunks
 *   node scripts/kv-delete-embeddings.mjs delete --prefix resume.md- --yes
 */

import fetch from 'node-fetch';
import process from 'node:process';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_NAMESPACE_ID = process.env.CF_KV_NAMESPACE_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_KV_NAMESPACE_ID || !CF_API_TOKEN) {
  console.error('Missing env: CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN');
  process.exit(1);
}

const [, , cmd = 'list', ...rest] = process.argv;

function parseArgs(args) {
  const out = { prefix: undefined, all: false, yes: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--prefix' && i + 1 < args.length) {
      out.prefix = args[++i];
    } else if (a === '--all') {
      out.all = true;
    } else if (a === '--yes' || a === '-y') {
      out.yes = true;
    }
  }
  return out;
}

const opts = parseArgs(rest);

async function listKeys(prefix) {
  let cursor = undefined;
  const keys = [];
  while (true) {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/keys`
    );
    if (prefix) url.searchParams.set('prefix', prefix);
    if (cursor) url.searchParams.set('cursor', cursor);
    url.searchParams.set('limit', '1000');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` }
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error('KV list failed: ' + JSON.stringify(data.errors || data));
    }
    for (const k of data.result) keys.push(k.name);
    if (!data.result_info?.cursor) break;
    cursor = data.result_info.cursor;
  }
  return keys;
}

async function deleteKeys(keys) {
  let deleted = 0;
  for (const k of keys) {
    const delUrl = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${encodeURIComponent(k)}`;
    const res = await fetch(delUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` }
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`Failed to delete ${k}: ${text}`);
    } else {
      deleted++;
      if (deleted % 100 === 0) console.log(`...deleted ${deleted} keys so far`);
    }
  }
  return deleted;
}

async function main() {
  if (cmd === 'list') {
    const keys = await listKeys(opts.prefix);
    console.log(`Found ${keys.length} keys${opts.prefix ? ` with prefix "${opts.prefix}"` : ''}`);
    for (const k of keys) console.log(k);
    return;
  }

  if (cmd === 'delete') {
    if (!opts.all && !opts.prefix) {
      console.error('Specify --prefix <prefix> to delete by document, or --all to delete everything.');
      process.exit(1);
    }

    if (!opts.yes) {
      console.error('Refusing to delete without confirmation. Re-run with --yes.');
      process.exit(1);
    }

    const prefix = opts.all ? undefined : opts.prefix;
    const keys = await listKeys(prefix);
    if (keys.length === 0) {
      console.log('No keys found to delete.');
      return;
    }
    console.log(`About to delete ${keys.length} keys${prefix ? ` with prefix "${prefix}"` : ''}...`);
    const deleted = await deleteKeys(keys);
    console.log(`Deleted ${deleted} / ${keys.length} keys.`);
    return;
  }

  console.error(`Unknown command: ${cmd}. Use: list | delete`);
  process.exit(1);
}

main().catch((e) => {
  console.error('Error:', e?.message || e);
  process.exit(1);
});
