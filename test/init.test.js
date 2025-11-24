import { expect, test, describe } from "bun:test";
import { createDataLayer } from "../data";
import { FireBaseDataLayer, PocketbaseDataLayer } from "../data/drivers";

describe("DataLayer test", () => {
  test("Proper environment gives proper dataLayer", () => {
    const dataLayer = createDataLayer();
    expect(dataLayer.identifier).toBe("firebase");
  });
});