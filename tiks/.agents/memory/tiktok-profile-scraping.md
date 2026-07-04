---
name: TikTok profile scraping
description: Free method to fetch TikTok profile data (nickname, avatar, followerCount) without API key — scrapes __UNIVERSAL_DATA_FOR_REHYDRATION__ JSON from tiktok.com page.
---

## Method: Scrape tiktok.com embedded JSON

TikTok embeds profile data in a `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` tag on every profile page. No API key needed.

```ts
const r = await fetch(`https://www.tiktok.com/@${handle}`, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
  },
});
const html = await r.text();
const match = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/);
const json = JSON.parse(match[1]);
const info = json.__DEFAULT_SCOPE__?.["webapp.user-detail"]?.userInfo;
// info.user?.nickname, info.user?.avatarLarger, info.stats?.followerCount
```

**Why:** tik.tools sandbox tier only allows webcast endpoints; /api/user/profile and /webcast/user_profile both require Pro tier. This scraping method is free.

**Gotchas:**
- Avatar URLs from TikTok CDN (p16-common-sign.tiktokcdn-us.com) include signed expiry tokens — they expire (hours/days). Store them but expect to refresh periodically via the per-partner refresh route.
- TikTok may add bot detection over time — monitor if this breaks.
- The `__DEFAULT_SCOPE__` key may vary; always null-check deeply.
