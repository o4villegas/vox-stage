/* Headless bench runner for the S1 spike (sandbox/desktop CPU only — real
 * phone numbers still come from opening dist/index.html on devices).
 * Serves dist/ locally, loads ?bench=1 in Chromium, prints the JSON result. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("./dist/", import.meta.url).pathname;
const MIME = { ".html": "text/html", ".js": "text/javascript" };

const server = createServer(async (req, res) => {
  const path = join(ROOT, req.url.split("?")[0] === "/" ? "index.html" : req.url.split("?")[0]);
  try {
    const body = await readFile(path);
    res.writeHead(200, { "content-type": MIME[extname(path)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("nope");
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
page.on("console", (m) => console.error("[page]", m.text()));
await page.goto(`http://127.0.0.1:${port}/index.html?bench=1`);
await page.waitForFunction(() => window.__benchResult, null, { timeout: 300_000 });
const result = await page.evaluate(() => window.__benchResult);
console.log(JSON.stringify(result, null, 2));
await browser.close();
server.close();
process.exit(result.error ? 1 : 0);
