// Run from the project folder:  node diagnose-gemini.mjs
// Reads GEMINI_API_KEY from the environment or from the .env file. Never prints the key.
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { devNull } from "node:os";
import dns from "node:dns";

if (process.argv.includes("--ipv4")) dns.setDefaultResultOrder("ipv4first");

let key = process.env.GEMINI_API_KEY?.trim();
if (!key && existsSync(".env")) {
  const m = readFileSync(".env", "utf8").match(/^\s*GEMINI_API_KEY\s*=\s*"?([^"\r\n]+)"?/m);
  key = m?.[1]?.trim();
}
if (!key) {
  console.log("No GEMINI_API_KEY found. Put it in .env first.");
  process.exit(1);
}
console.log(`Key found (starts with "${key.slice(0, 3)}", length ${key.length}). Node ${process.version}. IPv4-first: ${process.argv.includes("--ipv4")}\n`);

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 20000;

async function probe(name, url, body) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: { "x-goog-api-key": key, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = (await res.text()).replace(key, "[key]").replace(/\s+/g, " ").slice(0, 220);
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`${res.ok ? "OK  " : "FAIL"} ${name}: HTTP ${res.status} in ${secs}s\n     ${text}\n`);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    const secs = ((Date.now() - start) / 1000).toFixed(1);
    const why = controller.signal.aborted ? `NO RESPONSE after ${secs}s (hang)` : `${e.name}: ${e.cause?.code ?? e.message}`;
    console.log(`FAIL ${name}: ${why}\n`);
    return { ok: false, status: 0, hang: controller.signal.aborted };
  } finally {
    clearTimeout(timer);
  }
}

function curlProbe() {
  return new Promise((resolve) => {
    const bin = process.platform === "win32" ? "curl.exe" : "curl";
    execFile(
      bin,
      ["-s", "-m", "20", "-o", devNull, "-w", "HTTP %{http_code} in %{time_total}s", "-H", `x-goog-api-key: ${key}`, `${BASE}/models`],
      (err, stdout) => {
        console.log(err && !stdout ? `FAIL curl: ${err.message.slice(0, 120)}\n` : `curl (independent of Node): ${stdout}\n`);
        resolve(stdout || "");
      },
    );
  });
}

const r1 = await probe("1. List models (just checks key + network)", `${BASE}/models`);
const r2 = await probe("2. generateContent, gemini-2.5-flash", `${BASE}/models/gemini-2.5-flash:generateContent`, {
  contents: [{ parts: [{ text: "Say hi" }] }],
});
const r3 = await probe("3. Interactions API, gemini-3.8-flash (what the app uses now)", `${BASE}/interactions`, {
  model: "gemini-3.8-flash",
  input: "Say hi",
});
const c = await curlProbe();

console.log("=== VERDICT ===");
if (r1.hang && r2.hang && r3.hang) {
  console.log(/HTTP 200/.test(c)
    ? "Node hangs but curl works -> a Node/Windows networking issue. Re-run with:  node diagnose-gemini.mjs --ipv4"
    : "Everything hangs, even curl -> your network/router/ISP/VPN/antivirus is stalling Google API traffic. Try a phone hotspot.");
} else if (r1.status === 401 || r1.status === 403 || r2.status === 401 || r2.status === 403) {
  console.log("Google rejected the key -> create a NEW key in Google AI Studio and put it in .env.");
} else if (r2.ok && !r3.ok) {
  console.log("The older generateContent endpoint works but the Interactions API does not -> the app code should be switched to generateContent. Send me this output.");
} else if (r3.ok) {
  console.log("Interactions API works from Node here -> the app should work. Restart `npm run dev` and try again.");
} else {
  console.log("Mixed result -> copy ALL of the output above and send it to me.");
}
