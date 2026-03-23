import { test, expect, type Page, type Locator } from "@playwright/test";

// dnd-kit uses PointerSensor with distance:5 — needs slow movement to activate
async function dndKitDrag(page: Page, source: Locator, target: Locator) {
  const s = await source.boundingBox();
  const t = await target.boundingBox();
  if (!s || !t) throw new Error("Could not get bounding boxes for drag");

  const sx = s.x + s.width / 2;
  const sy = s.y + s.height / 2;
  const tx = t.x + t.width / 2;
  const ty = t.y + t.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Move enough to cross the 5px activation threshold
  await page.mouse.move(sx, sy + 8, { steps: 4 });
  // Slowly move to target so dnd-kit registers the over event
  await page.mouse.move(tx, ty, { steps: 20 });
  await page.mouse.up();
  // Wait for reorderTasksAction + revalidatePath to settle
  await page.waitForLoadState("networkidle");
}

async function createTask(page: Page, title: string) {
  await page.locator("button", { hasText: "+" }).click();
  await page.getByPlaceholder("What needs to be done?").fill(title);
  await page.getByRole("button", { name: "Add Task" }).click();
  await page.waitForLoadState("networkidle");
}

async function getCardIndex(page: Page, titleSubstring: string) {
  const cards = page.locator(".task-card");
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).textContent();
    if (text?.includes(titleSubstring)) return i;
  }
  return -1;
}

test.describe("drag and drop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
  });

  test("drag handle is visible on each task card", async ({ page }) => {
    const cards = page.locator(".task-card");
    const count = await cards.count();
    if (count === 0) {
      await createTask(page, `handle visibility test ${Date.now()}`);
    }

    const handle = page.locator(".task-card").first().locator(".drag-handle");
    await expect(handle).toBeVisible();
  });

  test("drag handle has grab cursor", async ({ page }) => {
    const cards = page.locator(".task-card");
    const count = await cards.count();
    if (count === 0) {
      await createTask(page, `cursor test ${Date.now()}`);
    }

    const handle = page.locator(".task-card").first().locator(".drag-handle");
    await expect(handle).toHaveCSS("cursor", "grab");
  });

  test("dragging a task changes its position in the list", async ({ page }) => {
    const suffix = Date.now();
    await createTask(page, `DragFirst-${suffix}`);
    await createTask(page, `DragSecond-${suffix}`);

    const indexABefore = await getCardIndex(page, `DragFirst-${suffix}`);
    const indexBBefore = await getCardIndex(page, `DragSecond-${suffix}`);
    expect(indexABefore).toBeLessThan(indexBBefore);

    const cardA = page.locator(".task-card", { hasText: `DragFirst-${suffix}` });
    const cardB = page.locator(".task-card", { hasText: `DragSecond-${suffix}` });

    await dndKitDrag(page, cardA.locator(".drag-handle"), cardB.locator(".drag-handle"));

    const indexAAfter = await getCardIndex(page, `DragFirst-${suffix}`);
    const indexBAfter = await getCardIndex(page, `DragSecond-${suffix}`);

    // A moved down past B
    expect(indexAAfter).toBeGreaterThan(indexBAfter);
  });

  test("drag order persists after page reload", async ({ page }) => {
    const suffix = Date.now();
    await createTask(page, `PersistA-${suffix}`);
    await createTask(page, `PersistB-${suffix}`);

    const cardA = page.locator(".task-card", { hasText: `PersistA-${suffix}` });
    const cardB = page.locator(".task-card", { hasText: `PersistB-${suffix}` });

    await dndKitDrag(page, cardA.locator(".drag-handle"), cardB.locator(".drag-handle"));

    const indexAAfterDrag = await getCardIndex(page, `PersistA-${suffix}`);
    const indexBAfterDrag = await getCardIndex(page, `PersistB-${suffix}`);
    expect(indexAAfterDrag).toBeGreaterThan(indexBAfterDrag);

    await page.reload();
    await page.waitForLoadState("networkidle");

    const indexAAfterReload = await getCardIndex(page, `PersistA-${suffix}`);
    const indexBAfterReload = await getCardIndex(page, `PersistB-${suffix}`);
    expect(indexAAfterReload).toBeGreaterThan(indexBAfterReload);
  });
});
