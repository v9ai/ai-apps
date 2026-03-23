import { test as setup } from "@playwright/test";
import path from "path";
import fs from "fs";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  await page.goto("/login");
  await page.getByPlaceholder("you@example.com").fill(process.env.TEST_EMAIL!);
  await page.getByPlaceholder("Password").fill(process.env.TEST_PASSWORD!);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL("/app");

  await page.context().storageState({ path: authFile });
});
