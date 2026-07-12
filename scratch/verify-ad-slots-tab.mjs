import { chromium, request } from "playwright";

const BASE = "http://localhost:3000";

const reqCtx = await request.newContext();
const csrfRes = await reqCtx.get(`${BASE}/api/auth/csrf`);
const { csrfToken } = await csrfRes.json();

const loginRes = await reqCtx.post(`${BASE}/api/auth/callback/dev-credentials`, {
  form: { csrfToken, key: "creator", json: "true" },
});
console.log("login status:", loginRes.status());

const cookies = await reqCtx.storageState();

const browser = await chromium.launch();
const context = await browser.newContext({ storageState: cookies, viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

await page.goto(`${BASE}/profile`, { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);

// Click the "My Ad Slots" sidebar nav item
await page.getByText("My Ad Slots", { exact: true }).first().click();
await page.waitForTimeout(1500);

await page.screenshot({ path: "shot-ads-tab.png", fullPage: false });
console.log("screenshot saved");

await browser.close();
await reqCtx.dispose();
