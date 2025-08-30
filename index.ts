
import axios from "axios";
import { chromium, Cookie } from "playwright";
import promptSync from "prompt-sync";

const BASE_URL = "https://chatbot.delhimetrorail.com";
const CHATBOT_API = `${BASE_URL}/metroAPI/API/bot/sendQuery/en`;

interface ChatbotAuth {
  userToken: string;
  sessionToken: string;
  cookies: string;
}

export async function getChatbotAuth(): Promise<ChatbotAuth> {
  console.log("Loading... [fetching cookies and user access tokens]");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({});

  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: "networkidle" });

  // ✅ Click confirm if required
  try {
    const confirmBtn = await page.waitForSelector("button:has-text('Proceed')", { timeout: 5000 });
    await confirmBtn.click();
  } catch {
    console.log("No proceed button found, continuing...");
  }
   try {
    const notnowBtn = await page.waitForSelector("button:has-text('Not Now')", { timeout: 5000 });
    await notnowBtn.click();
  } catch {
    console.log("No notnow button found, continuing...");
  }

  // ✅ Give site a moment to populate tokens
  await page.waitForTimeout(2000);

  // Extract tokens (strip extra quotes if needed)
  const userToken = await page.evaluate(() => {
    const raw = localStorage.getItem("userToken");
    return raw ? JSON.parse(raw) : null;
  });

  const sessionToken = await page.evaluate(() => {
    const raw = sessionStorage.getItem("sessionToken");
    return raw ? JSON.parse(raw) : null;
  });

  if (!userToken || !sessionToken) {
    await browser.close();
    throw new Error("❌ Could not find tokens in storage");
  }


  // Extract cookies for headers
  const cookies = await context.cookies();

  const cookieHeader = cookies.map((c:Cookie) => `${c.name}=${c.value}`).join("; ");

  await browser.close();

  console.log("✅ Fetched tokens and cookies successfully.");

  return {
    userToken,
    sessionToken,
    cookies: cookieHeader,
  };
}

async function main() {
  // Get tokens + cookies
  const { userToken, sessionToken, cookies } = await getChatbotAuth();

  const prompt = promptSync({ sigint: true });

  console.log("☠ DMRC Chetna Browser Bypass\n\nType '/bye' to quit.\n");

  while (true) {
    const query = prompt("You> ");
    if (!query || query.toLowerCase() === "/bye") {
      console.log("--!!Chat ended!!--");
      break;
    }

    try {
      const response = await axios.post(
        CHATBOT_API,
        {
          query,
          inputType: "TEXT",
          userLocation: null,
          prev_context: null,
          date: null,
          source: null,
          destination: null,
          selectedData: null,
          deviceType:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
          userToken: userToken,
          sessionToken: sessionToken,
        },
        {
          headers: {
            accept: "application/json, text/plain, */*",
            "content-type": "application/json",
            origin: BASE_URL,
            referer: `${BASE_URL}/`,
            "user-agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
            cookie: cookies,
          },
        }
      );

      console.log(`Chetna> ${JSON.stringify(response.data)}`);
    } catch (err: any) {
      console.error("!! API error !!:", err.response?.status, err.response?.data || err.message);
    }
  }
}

main().catch(console.error);