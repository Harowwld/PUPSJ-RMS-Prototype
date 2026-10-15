import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { assertNextPortAvailable } from "../scripts/nextPort.mjs";

test("startup reports an occupied Next.js port before launching OCR", async (t) => {
  const occupied = net.createServer();
  await new Promise((resolve) => occupied.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => occupied.close(resolve)));

  const port = occupied.address().port;
  await assert.rejects(assertNextPortAvailable(port), new RegExp(`Port ${port} is already in use`));
});
