import { chromium, request } from "playwright";

const BASE = "http://localhost:3000";

const reqCtx = await request.newContext();
const csrfRes = await reqCtx.get(`${BASE}/api/auth/csrf`);
const { csrfToken } = await csrfRes.json();
await reqCtx.post(`${BASE}/api/auth/callback/dev-credentials`, {
  form: { csrfToken, key: "creator", json: "true" },
});
const cookies = await reqCtx.storageState();

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: cookies, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

await page.goto(`${BASE}/profile`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
await page.getByText("My Ad Slots", { exact: true }).first().click();
await page.waitForTimeout(1500);

// Scroll down to the slot cards (Available/Locked)
await page.evaluate(() => window.scrollBy(0, 650));
await page.waitForTimeout(500);
await page.screenshot({ path: "shot-ads-slots.png", fullPage: false });
console.log("screenshot 2 saved");

await browser.close();
await reqCtx.dispose();
