// Runs automatically before dev/build/start (see package.json). If this is
// the first run on this computer, it creates .env.local with a random
// session-signing secret so there's zero manual setup — no accounts, no
// API keys, nothing to copy in. The secret only needs to stay the same on
// THIS computer so existing logins keep working across restarts; it's
// never sent anywhere.
import fs from "node:fs";
import crypto from "node:crypto";

const envPath = new URL("../.env.local", import.meta.url);
const content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

if (!/^SESSION_SECRET=.+$/m.test(content)) {
  const secret = crypto.randomBytes(32).toString("hex");
  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(envPath, `${content}${separator}SESSION_SECRET=${secret}\n`);
  console.log("First run on this computer: generated a SESSION_SECRET in .env.local");
}
