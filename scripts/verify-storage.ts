import assert from "node:assert/strict";
import { readFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import { detectImage, saveImage, storageBackend } from "../src/lib/storage";

let n = 0;
const ok = (s: string) => console.log(`  ✓ ${++n}. ${s}`);

async function main() {
  const jpg = readFileSync("public/images/look-ivory.jpg");
  assert.equal(detectImage(jpg)?.ext, "jpg");
  assert.equal(detectImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]))?.ext, "png");
  assert.equal(detectImage(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(8)]))?.ext, "webp");
  ok("JPEG, PNG and WebP are recognised by their real file signature");

  assert.equal(detectImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(detectImage(Buffer.from("<?php system($_GET['x']); ?>".padEnd(40, " "))), null);
  assert.equal(detectImage(Buffer.from("MZ\x90\x00".padEnd(40, "\0"))), null); // Windows executable
  assert.equal(detectImage(Buffer.alloc(3)), null);
  ok("SVG-with-script, PHP, EXE and truncated files are rejected even if named .jpg");

  assert.equal(storageBackend(), "local");
  const url = await saveImage(jpg, detectImage(jpg)!);
  assert.match(url, /^\/uploads\/[0-9a-f-]{36}\.jpg$/);
  const file = path.join("public", url);
  assert.ok(existsSync(file) && readFileSync(file).equals(jpg));
  rmSync(file);
  ok("local backend writes a randomly named file and returns a /uploads URL");

  // S3 backend: with an unreachable endpoint it must fail (not hang or silently return a URL)
  process.env.S3_BUCKET = "test-bucket"; process.env.S3_ENDPOINT = "http://127.0.0.1:1";
  process.env.S3_ACCESS_KEY_ID = "x"; process.env.S3_SECRET_ACCESS_KEY = "y"; process.env.S3_PUBLIC_URL = "https://cdn.example.com";
  assert.equal(storageBackend(), "s3");
  const t0 = Date.now();
  await assert.rejects(() => saveImage(jpg, detectImage(jpg)!));
  assert.ok(Date.now() - t0 < 30_000);
  ok(`S3 backend selected by env; an unreachable bucket fails cleanly in ${((Date.now() - t0) / 1000).toFixed(1)}s (the admin sees a friendly error)`);

  console.log(`\nAll ${n} storage checks passed.`);
}
main().catch((e) => { console.error("✗ FAILED:", e); process.exit(1); });
