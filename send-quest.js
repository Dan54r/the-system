// Picks a random urgent quest and sends it to your phone as a push notification.
// Run by GitHub Actions (see .github/workflows/urgent-quest.yml).
const webpush = require("web-push");

const QUESTS = [
  { t: "50 PUSH-UPS", xp: 30 },
  { t: "100 SQUATS", xp: 30 },
  { t: "3 MIN PLANK", xp: 25, note: "Split it into sets if you need to." },
  { t: "30 BURPEES", xp: 40 },
  { t: "20 PULL-UPS", xp: 40 },
  { t: "50 SIT-UPS", xp: 20 },
  { t: "60 LUNGES", xp: 25, note: "30 on each leg." },
  { t: "40 DIPS", xp: 30 },
  { t: "2 MIN WALL SIT", xp: 20 },
  { t: "100 JUMPING JACKS", xp: 20 }
];

const force = process.env.FORCE === "true";
const chance = Number(process.env.CHANCE || 0.18);

if (!force && Math.random() > chance) {
  console.log("No urgent quest this time.");
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

const q = QUESTS[Math.floor(Math.random() * QUESTS.length)];

webpush.sendNotification(cfg.subscription, JSON.stringify({ quest: q }), { TTL: 3 * 3600, urgency: "high" })
  .then(res => console.log("Sent urgent quest:", q.t, "(status " + res.statusCode + ")"))
  .catch(err => {
    console.error("Sending failed:", err.statusCode, err.body || err.message);
    if (err.statusCode === 404 || err.statusCode === 410) {
      console.error("Your phone's subscription has expired. Open the app → Profile → Refresh code, " +
        "then paste the new code into the PUSH_CONFIG secret.");
    }
    process.exit(1);
  });
