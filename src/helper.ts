import { AnalyticsContext } from "./events";

function parseUrl(url?: string): { host?: string; path?: string; search?: string, hash?: string } {
  if (!url) {
    return {};
  }
  try {
    const u = new URL(url);
    return {
      hash: u.hash,
      host: u.host,
      path: u.pathname,
      search: u.search,
    };
  } catch (e) {
    return {};
  }
}

function parseSearch(search?: string) {
  if (!search) {
    return {};
  }
  try {
    const searchParams = new URLSearchParams(search);
    return Object.fromEntries(
      [...searchParams.entries()].filter(([k]) => k.startsWith("utm_")).map(([k, v]) => [k.substring("utm_".length), v])
    );
  } catch (e) {
    return {};
  }
}

function parseReferer(referrer: string | undefined) {
  if (!referrer) {
    return undefined;
  }
  try {
    return new URL(referrer).host;
  } catch (e) {
    return undefined;
  }
}

function emptyToUndefined(param: any) {
  if (typeof param === "object" && param !== null && Object.keys(param).length === 0) {
    return undefined;
  }
  return param;
}

/**
 * Certain context fields can be infered from others. E.g. page.host can be infered from page.url.
 * This function infers such fields
 *
 * @param _ctx analytics context
 */
export function inferAnalyticsContextFields(_ctx: AnalyticsContext): AnalyticsContext {
  const ctx = { ..._ctx };
  if (ctx.page) {
    const { host, path, search } = parseUrl(ctx.page?.url);
    const campaign = parseSearch(search);
    ctx.page = { host, path, search, ...ctx.page };
    ctx.campaign = emptyToUndefined({ ...campaign, ...(ctx.campaign || {}) });
    ctx.page.referring_domain = ctx.page.referring_domain || parseReferer(ctx.page.referrer);
  }
  return ctx;
}
