import test from "node:test";
import assert from "node:assert/strict";
import { mayUseTestAccount, rateLimitPeer } from "../src/lib/security-config";
import { readLimitedJson } from "../src/lib/limited-json";

test("las cuentas de prueba se limitan al desarrollo local", () => {
  assert.equal(mayUseTestAccount("http://127.0.0.1:3000", "development"), true);
  assert.equal(mayUseTestAccount("http://localhost", "production"), false);
  assert.equal(mayUseTestAccount("https://quedo.example", "development"), false);
  assert.equal(mayUseTestAccount(undefined, "development"), false);
});

test("solo se acepta una IP válida de un proxy configurado", () => {
  assert.equal(rateLimitPeer("192.0.2.1", undefined), "shared");
  assert.equal(rateLimitPeer("192.0.2.1", "true"), "192.0.2.1");
  assert.equal(rateLimitPeer("invalid", "true"), "shared");
});

test("el límite del JSON se aplica a bytes recibidos y valida el objeto", async () => {
  const read = (body: string) => readLimitedJson(new Request("http://localhost", { method: "POST", body }), 16);
  assert.deepEqual(await read('{"ok":1}'), { status: 200, data: { ok: 1 } });
  assert.equal((await read(JSON.stringify({ text: "ñ".repeat(8) }))).status, 413);
  assert.equal((await read("null")).status, 400);
  assert.equal((await read("[]")).status, 400);
});
