# Publishing WATeamInbox to cPanel (https://wateam.ayyansystems.com)

This guide walks you through deploying the generated production bundle to your cPanel hosting account.

---

## 1. Package Summary

- **File**: `wateaminbox-cpanel-publish.zip` (located in your repository root)
- **Size**: ~980 KB
- **Contents**:
  - `index.html` (Entry point with optimized CSS/JS preloads)
  - `assets/` (Production-compiled, chunked, minified JavaScript and CSS)
  - `.htaccess` (Configured for Apache / LiteSpeed on cPanel with client-side SPA routing and asset caching)
  - `web.config` (Configured for IIS / Plesk in case Windows hosting is used)
  - `notification-sw.js` (Web Push & Notification Service Worker)
  - `favicon.ico`, `favicon.svg`, `site.webmanifest`, web app icons
- **Target Domain**: `https://wateam.ayyansystems.com`
- **Realtime WebSocket Endpoint**: `wss://wateam.ayyansystems.com/connection/websocket`
- **API Endpoint**: `/api`

---

## 2. Step-by-Step cPanel Upload Instructions

### Step 1: Log in to cPanel
1. Open your cPanel login page (e.g. `https://wateam.ayyansystems.com:2083` or your host provider's cPanel link).
2. Enter your username and password.

### Step 2: Open File Manager
1. In cPanel, find and click on **File Manager** (under the **Files** section).
2. In the left directory tree, locate the document root for `wateam.ayyansystems.com`:
   - If `wateam.ayyansystems.com` is your main domain: go into `public_html/`.
   - If it is a subdomain or addon domain: go into `public_html/wateam/` or the specific folder assigned to `wateam.ayyansystems.com`.

### Step 3: Clean Previous Builds (Recommended)
1. If an older build is present in the directory:
   - Delete or backup the existing `assets/` folder and `index.html`.
   - Ensure your folder is ready for the new files.

### Step 4: Upload the ZIP File
1. Click the **Upload** button in the top toolbar.
2. Drag and drop or browse to select:
   `/Users/m.yousaf/Documents/NHC360/WaTeamInbox -whatsapp/wateaminbox-cpanel-publish.zip`
3. Wait for the upload bar to turn green (100%).
4. Click **Go Back to "/public_html"**.

### Step 5: Extract the Archive
1. Right-click on `wateaminbox-cpanel-publish.zip` and select **Extract** (or click **Extract** in the top toolbar).
2. When prompted for the extraction path, ensure it extracts directly into the domain root (e.g. `/public_html` or `/public_html/wateam`).
3. Click **Extract File(s)**.
4. Verify that `index.html`, `assets/`, `.htaccess`, and `web.config` are located directly in your web directory (not inside a subfolder).
5. (Optional) Delete `wateaminbox-cpanel-publish.zip` to save disk space.

### Step 6: Verify Hidden Files (.htaccess)
1. In cPanel File Manager, click **Settings** (top right gear icon).
2. Ensure **"Show Hidden Files (dotfiles)"** is checked and click **Save**.
3. Confirm that `.htaccess` is present. This file is required so that reloading routes like `/w/.../chat` or `/login` does not return a 404 error.

---

## 3. Backend & Realtime Proxying

The frontend makes HTTP requests to `/api/*` and WebSocket connections to `/connection/*`.

To connect the frontend to your backend services:
- **If your backend runs on a VPS (e.g., using Docker Compose `compose.production.yml`)**:
  - In your server / web server configuration, set up a reverse proxy:
    - Pass `/api/*` to your API server port (`http://<BACKEND_HOST>:4445/api`)
    - Pass `/connection/*` to Centrifugo (`http://<BACKEND_HOST>:4451/connection`)
- Alternatively, if you run the backend on a dedicated API subdomain (such as `api.ayyansystems.com`), you can point DNS or an Apache reverse proxy directive in `.htaccess` to forward `/api` and `/connection` traffic.

---

## 4. Verification

1. Open your browser and visit:
   `https://wateam.ayyansystems.com`
2. Confirm the page loads the fresh login/landing interface.
3. Test refreshing any internal route (e.g. `/login`) to verify `.htaccess` client-side rewrite is active.

