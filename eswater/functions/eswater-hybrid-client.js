const { chromium } = require("playwright");
const axios = require("axios");

/**
 * Hybrid ESWater client that uses the working login flow
 * and extracts API authentication data for hourly usage calls
 */
class ESWaterHybridClient {
  constructor(logger) {
    this.logger = logger;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.authToken = null;
    this.accountId = null;
    this.meterSerial = null;
    this.cookies = [];

    this.baseUrl = "https://www.eswater.co.uk";
    this.loginUrl = "https://www.eswater.co.uk/login/";
    this.apiUrl = "https://www.eswater.co.uk/api/Customer/GetHourlyWaterUsage";
  }

  async initialize() {
    try {
      this.logger.info("Initializing ESWater hybrid client...");

      this.browser = await chromium.launch({
        headless: true,
        executablePath: "/usr/bin/chromium-browser",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-web-security",
          "--ignore-ssl-errors",
          "--ignore-certificate-errors",
          "--allow-running-insecure-content",
          "--disable-extensions",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          "--disable-renderer-backgrounding",
          "--disable-features=VizDisplayCompositor",
          "--no-first-run",
          "--no-zygote",
          // Anti-detection args
          "--disable-blink-features=AutomationControlled",
          "--exclude-switches=enable-automation",
        ],
      });

      this.context = await this.browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1366, height: 768 }, // Common screen resolution
        ignoreHTTPSErrors: true,
        locale: "en-GB",
        timezoneId: "Europe/London",
        extraHTTPHeaders: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          DNT: "1",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Cache-Control": "max-age=0",
        },
      });

      this.page = await this.context.newPage();

      // Add stealth measures to avoid bot detection
      await this.page.addInitScript(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });

        // Mock plugins
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });

        // Mock languages
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-GB", "en-US", "en"],
        });
      });

      // Intercept network requests to capture API calls and auth data
      await this.page.route("**/api/Customer/**", (route, request) => {
        const url = request.url();
        const method = request.method();
        const postData = request.postData();

        this.logger.info(`API call intercepted: ${method} ${url}`);

        if (postData) {
          try {
            const data = JSON.parse(postData);

            // Log data for specific endpoints we care about
            if (
              url.includes("GetHourlyWaterUsage") ||
              url.includes("GetDailyWaterUsage") ||
              url.includes("GetMeterReadHistory")
            ) {
              this.logger.info(
                `${url.split("/").pop()} request data: ${JSON.stringify(
                  data,
                  null,
                  2
                )}`
              );
            }

            if (data.Authorization && !this.authToken) {
              this.logger.info("Captured Authorization token!");
              this.authToken = data.Authorization;
            }
            if (data.AccountId && !this.accountId) {
              this.logger.info(`Captured Account ID: ${data.AccountId}`);
              this.accountId = data.AccountId;
            }
            if (data.MeterSerial && !this.meterSerial) {
              this.logger.info(`Captured Meter Serial: ${data.MeterSerial}`);
              this.meterSerial = data.MeterSerial;
            }
          } catch (e) {
            this.logger.debug("Could not parse API call data");
          }
        }

        route.continue();
      });

      // Also intercept responses to see what the actual API returns
      this.page.on("response", async (response) => {
        const url = response.url();
        if (url.includes("GetHourlyWaterUsage")) {
          try {
            const responseBody = await response.text();
            this.logger.info(
              `CAPTURED GetHourlyWaterUsage response: ${responseBody.substring(
                0,
                1000
              )}...`
            );
          } catch (error) {
            this.logger.debug(
              `Could not capture response for GetHourlyWaterUsage: ${error.message}`
            );
          }
        }
      });

      this.logger.info("ESWater hybrid client initialized");
      return true;
    } catch (error) {
      this.logger.error(`Failed to initialize client: ${error.message}`);
      throw error;
    }
  }

  async loginAndExtractAuth(username, password) {
    try {
      this.logger.info("Starting hybrid login and auth extraction...");

      // Validate credentials
      if (!username || !password) {
        throw new Error("Username and password are required");
      }

      if (!username.includes("@")) {
        this.logger.warning(
          "Username doesn't contain @, might not be an email address"
        );
      }

      this.logger.info(
        `Attempting login for user: ${username.substring(0, 3)}***@${
          username.split("@")[1] || "unknown"
        }`
      );

      // Use the proven working approach from the original client
      await this.page.goto(this.loginUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      this.logger.info("Navigated to login page");

      // Handle cookie consent if present
      try {
        const cookieSelectors = [
          'button:has-text("Accept all")',
          'button:has-text("Accept")',
          'button:has-text("Allow all")',
          'button:has-text("OK")',
          'button[id*="accept"]',
          'button[class*="accept"]',
        ];

        for (const selector of cookieSelectors) {
          try {
            const button = await this.page.$(selector);
            if (button) {
              await button.click();
              this.logger.info("Cookie consent accepted");
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        this.logger.debug("No cookie dialog found");
      }

      // Wait for the login form to be ready with human-like timing
      await this.page.waitForSelector("#loginForm", { timeout: 10000 });
      await this.page.waitForTimeout(2000 + Math.random() * 3000); // Random delay 2-5 seconds

      // Simulate human behavior - move mouse around a bit
      await this.page.mouse.move(
        100 + Math.random() * 200,
        100 + Math.random() * 200
      );
      await this.page.waitForTimeout(500 + Math.random() * 1000);

      this.logger.info("Login form ready");

      // Find and fill email field using multiple approaches
      let emailFilled = false;
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[id="email"]',
        '#loginForm input[type="email"]',
      ];

      for (const selector of emailSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          const field = await this.page.$(selector);
          if (field) {
            // Try direct approach first with human-like behavior
            try {
              await field.click();
              await this.page.waitForTimeout(200 + Math.random() * 300); // Human-like delay

              // Clear field first
              await field.selectText();
              await this.page.waitForTimeout(100);

              // Type with human-like speed
              await field.type(username, { delay: 50 + Math.random() * 100 });
              emailFilled = true;
              this.logger.info("Email field filled (direct with typing)");
              break;
            } catch (fillError) {
              // Try JavaScript approach as fallback
              await this.page.evaluate(
                (sel, email) => {
                  const input = document.querySelector(sel);
                  if (input) {
                    input.value = email;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                },
                selector,
                username
              );
              emailFilled = true;
              this.logger.info("Email field filled (JavaScript)");
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (!emailFilled) {
        throw new Error("Could not fill email field with any method");
      }

      // Find and fill password field
      let passwordFilled = false;
      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        '#loginForm input[type="password"]',
      ];

      for (const selector of passwordSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 2000 });
          const field = await this.page.$(selector);
          if (field) {
            try {
              await field.click();
              await this.page.waitForTimeout(200 + Math.random() * 300);

              // Clear field first
              await field.selectText();
              await this.page.waitForTimeout(100);

              // Type with human-like speed
              await field.type(password, { delay: 50 + Math.random() * 100 });
              passwordFilled = true;
              this.logger.info("Password field filled (direct with typing)");
              break;
            } catch (fillError) {
              await this.page.evaluate(
                (sel, pass) => {
                  const input = document.querySelector(sel);
                  if (input) {
                    input.value = pass;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                },
                selector,
                password
              );
              passwordFilled = true;
              this.logger.info("Password field filled (JavaScript)");
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }

      if (!passwordFilled) {
        throw new Error("Could not fill password field with any method");
      }

      // Submit the form with better error handling and captcha detection
      this.logger.info("Checking for captcha or additional verification...");

      // Check for reCAPTCHA or other bot protection
      const captchaCheck = await this.page.evaluate(() => {
        const recaptcha = document.querySelector(
          '[class*="recaptcha"], [id*="recaptcha"], iframe[src*="recaptcha"]'
        );
        const captcha = document.querySelector(
          '[class*="captcha"], [id*="captcha"]'
        );
        const botProtection = document.querySelector(
          '[class*="cloudflare"], [class*="bot"], [class*="protection"]'
        );

        return {
          hasRecaptcha: !!recaptcha,
          hasCaptcha: !!captcha,
          hasBotProtection: !!botProtection,
          recaptchaInfo: recaptcha
            ? {
                tag: recaptcha.tagName,
                class: recaptcha.className,
                id: recaptcha.id,
              }
            : null,
        };
      });

      this.logger.info(`Captcha check: ${JSON.stringify(captchaCheck)}`);

      if (captchaCheck.hasRecaptcha || captchaCheck.hasCaptcha) {
        this.logger.warning(
          "Captcha detected - this may prevent automated login"
        );
        // Wait a bit longer for potential manual intervention or captcha solving
        await this.page.waitForTimeout(5000);
      }

      // Human-like pause before submitting
      await this.page.waitForTimeout(1000 + Math.random() * 2000);
      this.logger.info("Simulating human pause before form submission...");

      const submitSelectors = [
        "#recaptcha-demo-submit",
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Log in")',
        'button:has-text("Sign in")',
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            // Check if button is visible and enabled
            const isVisible = await button.isVisible();
            const isEnabled = await button.isEnabled();

            this.logger.info(
              `Found submit button: ${selector}, visible: ${isVisible}, enabled: ${isEnabled}`
            );

            if (isVisible) {
              // Try to click even if not enabled - sometimes this works
              await button.click();
              submitted = true;
              this.logger.info("Login form submitted");
              break;
            }
          }
        } catch (e) {
          this.logger.debug(
            `Submit button ${selector} not available: ${e.message}`
          );
          continue;
        }
      }

      if (!submitted) {
        // Try pressing Enter on the password field as a fallback
        try {
          await this.page.keyboard.press("Enter");
          this.logger.info("Login form submitted via Enter key");
          submitted = true;
        } catch (enterError) {
          throw new Error("Could not find submit button or submit form");
        }
      }

      // Wait for successful login redirect with multiple strategies
      this.logger.info("Waiting for login to complete...");
      let loginSuccess = false;
      let currentUrl = "";

      try {
        // Strategy 1: Wait for URL change to account page
        await this.page.waitForURL("**/account/**", { timeout: 20000 });
        currentUrl = this.page.url();
        this.logger.info("Login successful - redirected to account page");
        loginSuccess = true;
      } catch (redirectError) {
        this.logger.warning(`URL redirect timeout: ${redirectError.message}`);

        // Strategy 2: Check current URL and page content after wait
        await this.page.waitForTimeout(5000);
        currentUrl = this.page.url();
        this.logger.info(`Current URL after wait: ${currentUrl}`);

        if (currentUrl.includes("account")) {
          this.logger.info("Login successful (URL check)");
          loginSuccess = true;
        } else {
          // Strategy 3: Check for login errors or success indicators on the page
          const pageContent = await this.page.evaluate(() => {
            // Check for error messages
            const errorSelectors = [
              ".error",
              ".alert-danger",
              '[class*="error"]',
              '[class*="invalid"]',
              ".validation-summary-errors",
              ".field-validation-error",
              '[class*="login-error"]',
              '[class*="auth-error"]',
              ".login-failed",
              '[role="alert"]',
              ".alert-error",
            ];

            const errors = [];
            errorSelectors.forEach((selector) => {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el) => {
                const text = el.textContent?.trim();
                if (text && text.length > 0) {
                  errors.push(text);
                }
              });
            });

            // Check for success indicators
            const successElements = document.querySelectorAll(
              '.success, .alert-success, [class*="success"]'
            );
            const successMessages = Array.from(successElements)
              .map((el) => el.textContent?.trim())
              .filter((text) => text && text.length > 0);

            // Check if we're still on login form
            const loginForm = document.querySelector("#loginForm");
            const stillOnLoginForm = !!loginForm;

            // Check for dashboard/account content
            const accountContent = document.querySelector(
              '[href*="account"], [class*="dashboard"], [class*="account"]'
            );
            const hasAccountContent = !!accountContent;

            // Get all visible text on page for analysis
            const visibleText =
              document.body.innerText?.substring(0, 500) || "";

            return {
              errors,
              successMessages,
              stillOnLoginForm,
              hasAccountContent,
              title: document.title,
              url: window.location.href,
              visibleText,
            };
          });

          this.logger.info(
            `Page analysis: ${JSON.stringify(pageContent, null, 2)}`
          );

          // Take a screenshot for debugging
          try {
            const screenshot = await this.page.screenshot({
              path: "/tmp/eswater-login-debug.png",
              fullPage: false,
            });
            this.logger.info("Screenshot saved for debugging");
          } catch (screenshotError) {
            this.logger.debug(`Screenshot failed: ${screenshotError.message}`);
          }

          if (pageContent.errors.length > 0) {
            throw new Error(
              `Login failed with errors: ${pageContent.errors.join(", ")}`
            );
          } else if (pageContent.hasAccountContent) {
            this.logger.info("Login successful (content check)");
            loginSuccess = true;
          } else if (
            pageContent.stillOnLoginForm &&
            currentUrl.includes("login")
          ) {
            throw new Error(
              `Login failed - still on login page. Page title: ${pageContent.title}`
            );
          } else {
            // Ambiguous case - try to proceed but warn
            this.logger.warning("Login status unclear - attempting to proceed");
            loginSuccess = true;
          }
        }
      }

      // Navigate to smart meter page to trigger API calls
      const meterUrl = `${this.baseUrl}/account/?account=home&step=myUsage&type=SmartMeter`;
      await this.page.goto(meterUrl, {
        waitUntil: "networkidle",
        timeout: 20000,
      });
      this.logger.info("Navigated to smart meter page");

      // Wait for API calls to complete
      await this.page.waitForTimeout(8000);

      // Store cookies for API requests
      this.cookies = await this.context.cookies();
      this.logger.info(`Captured ${this.cookies.length} cookies`);

      // Try to extract auth data from page if not captured via network
      if (!this.authToken || !this.accountId || !this.meterSerial) {
        this.logger.info("Attempting to extract auth data from page...");
        await this.extractAuthDataFromPage();
      }

      const hasAllData = this.authToken && this.accountId && this.meterSerial;
      if (hasAllData) {
        this.logger.info("All authentication data captured successfully!");
        return true;
      } else {
        this.logger.warning(
          `Missing some auth data: token=${!!this.authToken}, account=${!!this
            .accountId}, meter=${!!this.meterSerial}`
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Login and auth extraction failed: ${error.message}`);
      throw error;
    }
  }

  async extractAuthDataFromPage() {
    try {
      const authData = await this.page.evaluate(() => {
        const result = {};

        // Look in script tags for auth data
        const scripts = document.querySelectorAll("script");
        for (const script of scripts) {
          const content = script.textContent || script.innerText || "";

          // Look for JWT token
          const jwtMatch = content.match(
            /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/
          );
          if (jwtMatch && !result.authToken) {
            result.authToken = jwtMatch[0];
          }

          // Look for account ID patterns
          const accountMatch = content.match(
            /"?AccountId"?\s*[:=]\s*"?(\d+)"?/i
          );
          if (accountMatch && !result.accountId) {
            result.accountId = accountMatch[1];
          }

          // Look for meter serial patterns
          const meterMatch = content.match(
            /"?MeterSerial"?\s*[:=]\s*"?([A-Z0-9]+)"?/i
          );
          if (meterMatch && !result.meterSerial) {
            result.meterSerial = meterMatch[1];
          }
        }

        // Also check window variables
        if (window.accountId && !result.accountId) {
          result.accountId = window.accountId;
        }

        return result;
      });

      if (authData.authToken && !this.authToken) {
        this.authToken = authData.authToken;
        this.logger.info("Extracted auth token from page");
      }
      if (authData.accountId && !this.accountId) {
        this.accountId = authData.accountId;
        this.logger.info(
          `Extracted account ID from page: ${authData.accountId}`
        );
      }
      if (authData.meterSerial && !this.meterSerial) {
        this.meterSerial = authData.meterSerial;
        this.logger.info(
          `Extracted meter serial from page: ${authData.meterSerial}`
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to extract auth data from page: ${error.message}`
      );
    }
  }

  async fetchHourlyData(daysBack = 1) {
    try {
      if (!this.authToken || !this.accountId || !this.meterSerial) {
        throw new Error("Missing required authentication data");
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);
      const startDateString =
        startDate.toISOString().split("T")[0] + "T00:00:00";

      const requestBody = {
        AccountId: this.accountId,
        Authorization: this.authToken,
        MeterSerial: this.meterSerial,
        StartDate: startDateString,
      };

      this.logger.info(`Fetching hourly data for ${startDateString}`);

      const cookieHeader = this.cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join("; ");

      const response = await axios.post(this.apiUrl, requestBody, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "*/*",
          "Accept-Language": "en-GB,en;q=0.5",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          Cookie: cookieHeader,
          Referer: `${this.baseUrl}/account/?account=home&step=myUsage&type=SmartMeter`,
          Origin: this.baseUrl,
        },
        timeout: 30000,
        validateStatus: (status) => status < 500,
      });

      if (response.status !== 200) {
        throw new Error(
          `API request failed: ${response.status} ${response.statusText}`
        );
      }

      // Debug: Log the actual response structure (debug level, truncated)
      this.logger.debug(
        `API Response status: ${response.status}, size: ${
          JSON.stringify(response.data).length
        } chars, raw: ${JSON.stringify(response.data).slice(0, 1500)}`
      );
      if (Array.isArray(response.data) && response.data.length > 0) {
        this.logger.debug(
          `API Response first item: ${JSON.stringify(response.data[0]).slice(
            0,
            1500
          )}`
        );
      }

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch hourly data: ${error.message}`);
      throw error;
    }
  }

  async getUsageData() {
    try {
      // ESWater data is typically 48 hours behind, so start from 3 days back
      // and work backwards to find the most recent available data
      for (let daysBack = 3; daysBack <= 7; daysBack++) {
        try {
          const data = await this.fetchHourlyData(daysBack);

          if (Array.isArray(data) && data.length > 0) {
            // Debug: Log first reading structure and total API response
            this.logger.debug(
              `API returned ${data.length} items. First item: ${JSON.stringify(
                data[0]
              )}`
            );

            // Calculate daily usage and get latest reading
            let totalUsage = 0;
            let latestReading = 0;

            for (const reading of data) {
              // Debug: Log the actual reading object structure
              this.logger.debug(`Raw reading: ${JSON.stringify(reading)}`);

              const value = parseFloat(reading.LitreValue ?? 0);
              totalUsage += value;
              if (value > 0) latestReading = value;
            }

            const timestamp =
              data[data.length - 1]?.Date ||
              data[data.length - 1]?.DateTime ||
              data[data.length - 1]?.Timestamp ||
              new Date().toISOString();

            this.logger.info(
              `Found data: ${data.length} readings, ${totalUsage}L total (${daysBack} days back)`
            );

            return {
              dailyUsage: Math.round(totalUsage * 100) / 100, // Round to 2 decimal places
              latestReading: Math.round(latestReading * 100) / 100,
              readingCount: data.length,
              timestamp: timestamp,
              rawData: data,
              daysBack: daysBack,
            };
          }
        } catch (error) {
          this.logger.debug(
            `No data for ${daysBack} days back: ${error.message}`
          );
          continue;
        }
      }

      throw new Error("No water usage data found in the last 7 days");
    } catch (error) {
      this.logger.error(`Failed to get usage data: ${error.message}`);
      throw error;
    }
  }

  async cleanup() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.logger.info("Client cleaned up");
      }
    } catch (error) {
      this.logger.error(`Cleanup failed: ${error.message}`);
    }
  }
}

module.exports = ESWaterHybridClient;
