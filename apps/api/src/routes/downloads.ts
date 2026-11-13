import { Hono } from "hono";

export const downloadsRoutes = new Hono();

const ANDROID_APP_URL =
  process.env.ANDROID_DOWNLOAD_URL ||
  "https://wateam.ayyansystems.com/downloads/wateaminbox.apk";

const IOS_APP_URL =
  process.env.IOS_DOWNLOAD_URL ||
  "https://apps.apple.com/app/wateaminbox";

/**
 * GET /downloads/info
 * Returns URLs and metadata for mobile applications
 */
downloadsRoutes.get("/info", (c) => {
  return c.json({
    android: {
      url: ANDROID_APP_URL,
      platform: "android",
      version: "1.0.0",
      bundleId: "com.ayyansystems.wateaminbox",
    },
    ios: {
      url: IOS_APP_URL,
      platform: "ios",
      version: "1.0.0",
      bundleId: "com.ayyansystems.wateaminbox",
    },
  });
});

/**
 * GET /downloads/android
 * Direct redirect to Android download / Play Store
 */
downloadsRoutes.get("/android", (c) => {
  return c.redirect(ANDROID_APP_URL, 302);
});

/**
 * GET /downloads/ios
 * Direct redirect to Apple App Store / TestFlight
 */
downloadsRoutes.get("/ios", (c) => {
  return c.redirect(IOS_APP_URL, 302);
});

