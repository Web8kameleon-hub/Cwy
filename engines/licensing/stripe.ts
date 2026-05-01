// Real Stripe Integration for CWY
// Uses your existing Stripe product: CWY (€29.00 EUR)

import * as https from "https";
import { generateLicenseKey, LicenseTier } from "./license";
import { getDB } from "../../memory/db";

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string;
  priceIds: {
    PRO: string;
    ENTERPRISE: string;
  };
}

/**
 * Load Stripe configuration from environment or config file.
 */
export function getStripeConfig(): StripeConfig | null {
  // Try environment variables first
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const proPriceId = process.env.STRIPE_PRICE_ID_PRO;
  const enterprisePriceId = process.env.STRIPE_PRICE_ID_ENTERPRISE;

  if (!secretKey || !proPriceId) {
    return null;
  }

  return {
    secretKey,
    webhookSecret: webhookSecret || "",
    priceIds: {
      PRO: proPriceId,
      ENTERPRISE: enterprisePriceId || proPriceId,
    },
  };
}

/**
 * Create a Stripe Checkout session using the REST API (no SDK required).
 */
export async function createCheckoutSession(
  tier: LicenseTier,
  email: string
): Promise<{ success: boolean; checkoutUrl?: string; sessionId?: string; message?: string }> {
  const config = getStripeConfig();

  if (!config) {
    return {
      success: false,
      message: "Stripe not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO environment variables.",
    };
  }

  if (tier === "FREE") {
    return {
      success: false,
      message: "FREE tier does not require payment",
    };
  }

  const priceId = config.priceIds[tier];

  try {
    const response = await stripeRequest(config.secretKey, "POST", "/v1/checkout/sessions", {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `https://cwy.app/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://cwy.app/cancel`,
      customer_email: email,
      metadata: {
        tier,
        email,
        product: "cwy-license",
      },
    });

    if (!response.success) {
      return {
        success: false,
        message: response.error || "Failed to create checkout session",
      };
    }

    const session = response.data;

    // Save session to database
    const db = getDB();
    
    // Ensure payment_sessions table exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_sessions (
        sessionId TEXT PRIMARY KEY,
        tier TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    db.prepare(`
      INSERT INTO payment_sessions (sessionId, tier, amount, currency, email, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      tier,
      session.amount_total || 0,
      "EUR",
      email,
      "pending",
      new Date().toISOString()
    );

    return {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  } catch (error) {
    return {
      success: false,
      message: `Stripe API error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Verify Stripe webhook signature and process event.
 */
export async function verifyWebhook(
  payload: string,
  signature: string
): Promise<{ success: boolean; event?: any; message?: string }> {
  const config = getStripeConfig();

  if (!config || !config.webhookSecret) {
    return {
      success: false,
      message: "Webhook secret not configured",
    };
  }

  // Verify webhook signature
  const isValid = verifyWebhookSignature(payload, signature, config.webhookSecret);

  if (!isValid) {
    return {
      success: false,
      message: "Invalid webhook signature",
    };
  }

  try {
    const event = JSON.parse(payload);
    return {
      success: true,
      event,
    };
  } catch (error) {
    return {
      success: false,
      message: "Invalid webhook payload",
    };
  }
}

/**
 * Process a successful checkout.
 */
export function processSuccessfulCheckout(sessionId: string): {
  success: boolean;
  licenseKey?: string;
  message?: string;
} {
  const db = getDB();

  // Get payment session
  const session = db
    .prepare(`SELECT * FROM payment_sessions WHERE sessionId = ?`)
    .get(sessionId) as { tier: LicenseTier; email: string } | undefined;

  if (!session) {
    return {
      success: false,
      message: "Payment session not found",
    };
  }

  // Generate license key
  const licenseKey = generateLicenseKey(session.tier, null); // lifetime

  // Ensure licenses table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS licenses (
      id TEXT PRIMARY KEY,
      tier TEXT NOT NULL,
      key TEXT NOT NULL,
      activatedAt TEXT NOT NULL,
      expiresAt TEXT,
      email TEXT,
      verified INTEGER DEFAULT 0
    );
  `);

  // Save license
  const licenseId = `license_${Date.now()}`;
  db.prepare(`
    INSERT INTO licenses (id, tier, key, activatedAt, expiresAt, email, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(licenseId, session.tier, licenseKey, new Date().toISOString(), null, session.email, 1);

  // Mark session as completed
  db.prepare(`UPDATE payment_sessions SET status = 'completed' WHERE sessionId = ?`).run(sessionId);

  return {
    success: true,
    licenseKey,
    message: `${session.tier} license activated successfully!`,
  };
}

/**
 * Make a Stripe API request using native https module (no SDK required).
 */
function stripeRequest(
  secretKey: string,
  method: string,
  path: string,
  data?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const body = data
      ? Object.entries(data)
          .map(([key, value]) => {
            if (typeof value === "object" && value !== null && !Array.isArray(value)) {
              return Object.entries(value)
                .map(([k, v]) => `${key}[${k}]=${encodeURIComponent(String(v))}`)
                .join("&");
            }
            if (Array.isArray(value)) {
              return value
                .map((item, index) => {
                  if (typeof item === "object" && item !== null) {
                    return Object.entries(item)
                      .map(([k, v]) => `${key}[${index}][${k}]=${encodeURIComponent(String(v))}`)
                      .join("&");
                  }
                  return `${key}[]=${encodeURIComponent(String(item))}`;
                })
                .join("&");
            }
            return `${key}=${encodeURIComponent(String(value))}`;
          })
          .join("&")
      : "";

    const options = {
      hostname: "api.stripe.com",
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(responseBody);
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data: parsed });
          } else {
            resolve({ success: false, error: parsed.error?.message || "Unknown error" });
          }
        } catch (error) {
          resolve({ success: false, error: "Failed to parse response" });
        }
      });
    });

    req.on("error", (error) => {
      resolve({ success: false, error: error.message });
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

/**
 * Verify Stripe webhook signature.
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require("crypto");

  // Extract timestamp and signatures from header
  const elements = signature.split(",");
  const timestamp = elements.find((e) => e.startsWith("t="))?.substring(2);
  const signatures = elements.filter((e) => e.startsWith("v1=")).map((e) => e.substring(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Compare signatures
  return signatures.some((sig) => crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSignature)));
}
