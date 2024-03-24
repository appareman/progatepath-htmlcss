import fs from "fs";
import path from "node:path";
import {
  MatchImageSnapshotOptions,
  toMatchImageSnapshot,
} from "jest-image-snapshot";
import { BoundingBox, Page } from "puppeteer";

const ACTUAL_PATH = path.resolve(__dirname, "../docs/top.html");
const EXPECTED_PATH = path.resolve(__dirname, "./expected/top.html");
const SNAPSHOTS_DIR = path.resolve(__dirname, "snapshots");
const VIEWPORT_LARGE = { width: 768, height: 100 };
const VIEWPORT_SMALL = { width: 767, height: 100 };
const TARGET_ELEMENT_SELECTOR = '[data-test="article-list"]';

const OPTION: MatchImageSnapshotOptions = {
  comparisonMethod: "pixelmatch",
  allowSizeMismatch: true,
  failureThreshold: 0.05,
  failureThresholdType: "percent",
};

expect.extend({ toMatchImageSnapshot });

const clipTargetElement = async (
  page: Page,
  selector: string
): Promise<BoundingBox> => {
  const [top, left, width, height] = await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    const rect = (element as HTMLHeadingElement).getBoundingClientRect();
    return [rect.top, rect.left, rect.width, rect.height];
  }, selector);

  return {
    x: left,
    y: top,
    width: width,
    height: height,
  };
};

describe("snapshot test", () => {
  beforeAll(async () => {
    fs.promises.mkdir(SNAPSHOTS_DIR, { recursive: true });
  });

  test("viewport width >= 768px", async () => {
    await page.goto(`file://${EXPECTED_PATH}`);
    await page.setViewport(VIEWPORT_LARGE);
    await new Promise((r) => setTimeout(r, 100));
    await maskImage(page as unknown as Page, "[src$='article_thumbnail.png']");
    await page.screenshot({
      path: path.resolve(SNAPSHOTS_DIR, "large_expected.png"),
      clip: await clipTargetElement(
        page as unknown as Page,
        TARGET_ELEMENT_SELECTOR
      ),
    });

    await page.goto(`file://${ACTUAL_PATH}`);
    await page.setViewport(VIEWPORT_LARGE);
    await maskImage(page as unknown as Page, "[src$='article_thumbnail.png']");
    const actual = await page.screenshot({
      path: path.resolve(SNAPSHOTS_DIR, "large_actual.png"),
      clip: await clipTargetElement(
        page as unknown as Page,
        TARGET_ELEMENT_SELECTOR
      ),
    });

    expect(actual).toMatchImageSnapshot({
      ...OPTION,
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: "large_expected",
      customDiffDir: SNAPSHOTS_DIR,
    });
  });

  test("viewport width < 768px", async () => {
    await page.goto(`file://${EXPECTED_PATH}`);
    await page.setViewport(VIEWPORT_SMALL);
    await new Promise((r) => setTimeout(r, 100));
    await maskImage(page as unknown as Page, "[src$='article_thumbnail.png']");
    await page.screenshot({
      path: path.resolve(SNAPSHOTS_DIR, "small_expected.png"),
      clip: await clipTargetElement(
        page as unknown as Page,
        TARGET_ELEMENT_SELECTOR
      ),
    });

    await page.goto(`file://${ACTUAL_PATH}`);
    await page.setViewport(VIEWPORT_SMALL);
    await maskImage(page as unknown as Page, "[src$='article_thumbnail.png']");
    const actual = await page.screenshot({
      path: path.resolve(SNAPSHOTS_DIR, "small_actual.png"),
      clip: await clipTargetElement(
        page as unknown as Page,
        TARGET_ELEMENT_SELECTOR
      ),
    });

    expect(actual).toMatchImageSnapshot({
      ...OPTION,
      customSnapshotsDir: SNAPSHOTS_DIR,
      customSnapshotIdentifier: "small_expected",
      customDiffDir: SNAPSHOTS_DIR,
    });
  });
});

async function maskImage(page: Page, selector: string) {
  await page.evaluate((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      (element as HTMLElement).style.filter = "brightness(0)";
    });
  }, selector);
}
