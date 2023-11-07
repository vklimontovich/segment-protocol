import { test, expect } from "bun:test";
import { inferAnalyticsContextFields } from "../src/helper";

test("test_inferAnalyticsContextFields", () => {
  const ctx = inferAnalyticsContextFields({
    page: {
      url: "https://www.google.com/search?q=hello&utm_source=google&utm_medium=cpc",
      referrer: "https://yahoo.com",
    },
  });
  expect(ctx.page?.host).toEqual("www.google.com");
  expect(ctx.page?.search).toEqual("?q=hello&utm_source=google&utm_medium=cpc");
  expect(ctx.page?.path).toEqual("/search");
  expect(ctx.page?.referring_domain).toEqual("yahoo.com");
  expect(ctx.campaign?.source).toEqual("google");
  expect(ctx.campaign?.medium).toEqual("cpc");
});
