// Picks a random urgent quest and sends it to your phone as a push notification.
// Run by GitHub Actions (see .github/workflows/urgent-quest.yml).
const webpush = require("web-push");

const QUESTS = [
  { t: "20 PUSH-UPS", xp: 25 },
  { t: "30 SQUATS", xp: 20 },
  { t: "1 MIN PLANK", xp: 20 },
  { t: "10 BURPEES", xp: 30 },
  { t: "5 PULL-UPS", xp: 30 },
  { t: "20 SIT-UPS", xp: 20 },
  { t: "20 LUNGES", xp: 20, note: "10 on each leg." },
  { t: "10 DIPS", xp: 25 },
  { t: "45 SEC WALL SIT", xp: 20 },
  { t: "40 JUMPING JACKS", xp: 20 }
];

const force = process.env.FORCE === "true";

// One urgent quest a day, at a random time between 9am and 10pm (UTC-5).
// Each day picks its own hour from the date, and this hourly run only sends if it's that hour.
const UTC_OFFSET = -5;
const FIRST_HOUR = 9, HOURS = 13; // 9am ... 9pm start hours
const local = new Date(Date.now() + UTC_OFFSET * 3600 * 1000);
const dateKey = local.toISOString().slice(0, 10);
const localHour = local.getUTCHours();

function hash(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}
const chosenHour = FIRST_HOUR + hash("system-" + dateKey) % HOURS;

if (!force && localHour !== chosenHour) {
  console.log("Not quest time yet. Today's quest is due in the " + chosenHour + ":00 hour.");
  process.exit(0);
}

const raw = (process.env.PUSH_CONFIG || "").trim();
if (!raw) {
  console.error("The PUSH_CONFIG secret is missing. Add it in Settings → Secrets and variables → Actions.");
  process.exit(1);
}

let cfg;
try {
  cfg = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
} catch (e) {
  console.error("PUSH_CONFIG doesn't look right. Copy the code from the app's Profile tab again.");
  process.exit(1);
}

const owner = process.env.GITHUB_REPOSITORY_OWNER || "example";
webpush.setVapidDetails("https://" + owner.toLowerCase() + ".github.io", cfg.publicKey, cfg.privateKey);

// Scheduled quests are picked from the date, so the app can work out the same quest as a backup.
// Must stay in the same order as URGENT_POOL in index.html.
const q = Object.assign({}, force
  ? QUESTS[Math.floor(Math.random() * QUESTS.length)]
  : QUESTS[hash("quest-" + dateKey) % QUESTS.length]);
q.id = force ? "test-" + Date.now() : dateKey;

// wait a random 0–40 minutes so it never lands at the same minute
const delayMs = force ? 0 : Math.floor(Math.random() * 40 * 60 * 1000);
if (delayMs) console.log("Waiting " + Math.round(delayMs / 60000) + " minutes before sending...");

new Promise(r => setTimeout(r, delayMs)).then(() => webpush.sendNotification(cfg.subscription, JSON.stringify({ quest: q }), { TTL: 3 * 3600, urgency: "high" })
  .then(res => console.log("Sent urgent quest:", q.t, "(status " + res.statusCode + ")"))
  .catch(err => {
    console.error("Sending failed:", err.statusCode, err.body || err.message);
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.error("Your phone's subscription has expired. Open the app → Profile → Refresh code, " +
        "then paste the new code into the PUSH_CONFIG secret.");
    }
    process.exit(1);
  }));
