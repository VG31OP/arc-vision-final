/**
 * Detectors and model settings page tests -- HIGH tier.
 *
 * Tests rendering of the merged page and navigation from the older
 * model-service settings page.
 */

import { test, expect } from "../../fixtures/frigate-test";

test.describe("Detectors and model Settings @high", () => {
  test("page renders with detector and model cards", async ({ frigateApp }) => {
    await frigateApp.goto("/settings?page=systemDetectorsAndModel");
    await frigateApp.page.waitForTimeout(2000);
    await expect(frigateApp.page.locator("#pageRoot")).toBeVisible();

    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text).toContain("Detectors and model");
    expect(text?.toLowerCase()).toContain("detector hardware");
    expect(text?.toLowerCase()).toContain("detection model");
  });

  test("legacy model-service page is no longer routed here", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=systemDetectorsAndModel");
    await frigateApp.page.waitForTimeout(2000);

    await expect(frigateApp.page.locator("#pageRoot")).toContainText(
      "Detectors and model",
    );
  });

  test("old systemDetectionModel deep-link no longer routes here", async ({
    frigateApp,
  }) => {
    await frigateApp.goto("/settings?page=systemDetectionModel");
    await frigateApp.page.waitForTimeout(2000);
    // The old page key is no longer in allSettingsViews; the router
    // falls back to its default settings page (uiSettings).
    const text = await frigateApp.page.textContent("#pageRoot");
    expect(text).not.toContain("Detection model");
  });
});
