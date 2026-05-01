"use strict";
// CWY Payment Gateway Integration
// Supports: Stripe (primary), UTT (alternative), or manual verification
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPaymentConfig = loadPaymentConfig;
exports.savePaymentConfig = savePaymentConfig;
exports.createPaymentSession = createPaymentSession;
exports.verifyPayment = verifyPayment;
exports.getPaymentStats = getPaymentStats;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const license_1 = require("./license");
const db_1 = require("../../memory/db");
/**
 * Load payment configuration from .cwy/payment-config.json
 */
function loadPaymentConfig() {
    const configPath = path.join(process.cwd(), ".cwy", "payment-config.json");
    if (!fs.existsSync(configPath)) {
        return null;
    }
    try {
        const data = fs.readFileSync(configPath, "utf8");
        return JSON.parse(data);
    }
    catch (error) {
        console.error("Failed to load payment config:", error);
        return null;
    }
}
/**
 * Save payment configuration.
 */
function savePaymentConfig(config) {
    const configPath = path.join(process.cwd(), ".cwy", "payment-config.json");
    const cwDir = path.dirname(configPath);
    if (!fs.existsSync(cwDir)) {
        fs.mkdirSync(cwDir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
/**
 * Create a payment session (Stripe Checkout).
 */
async function createPaymentSession(tier, email) {
    const config = loadPaymentConfig();
    if (!config) {
        return {
            success: false,
            message: "Payment configuration not found. Run: cwy configure-payment"
        };
    }
    if (config.provider === "stripe") {
        return createStripeCheckout(tier, email, config.apiKey);
    }
    else if (config.provider === "utt") {
        return createUTTPayment(tier, email);
    }
    else {
        return {
            success: false,
            message: "Manual payment mode. Contact support for license key."
        };
    }
}
/**
 * Create Stripe Checkout session.
 */
async function createStripeCheckout(tier, email, apiKey) {
    // Use real Stripe integration
    const { createCheckoutSession } = await Promise.resolve().then(() => __importStar(require("./stripe")));
    return createCheckoutSession(tier, email);
}
/**
 * Create UTT payment.
 */
async function createUTTPayment(tier, email) {
    // UTT integration placeholder
    return {
        success: false,
        message: "UTT integration coming soon"
    };
}
/**
 * Verify payment and generate license key.
 */
function verifyPayment(sessionId) {
    const db = (0, db_1.getDB)();
    // Check if payment_sessions table exists
    const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='payment_sessions'
  `).get();
    if (!tableExists) {
        createPaymentTables();
    }
    const session = db.prepare(`
    SELECT * FROM payment_sessions WHERE sessionId = ?
  `).get(sessionId);
    if (!session) {
        return {
            success: false,
            message: "Payment session not found"
        };
    }
    if (session.status === "completed") {
        return {
            success: false,
            message: "Payment already verified"
        };
    }
    // Mark as completed
    db.prepare(`
    UPDATE payment_sessions SET status = 'completed' WHERE sessionId = ?
  `).run(sessionId);
    // Generate license key (lifetime for one-time payments)
    const licenseKey = (0, license_1.generateLicenseKey)(session.tier, null);
    // Save to licenses table
    const licenseId = `license_${Date.now()}`;
    db.prepare(`
    INSERT INTO licenses (id, tier, key, activatedAt, expiresAt, email, verified)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(licenseId, session.tier, licenseKey, new Date().toISOString(), null, // lifetime
    session.email, 1 // verified
    );
    return {
        success: true,
        licenseKey,
        message: `${session.tier} license activated successfully!`
    };
}
/**
 * Create payment-related tables.
 */
function createPaymentTables() {
    const db = (0, db_1.getDB)();
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
}
/**
 * Get payment statistics (for owner/admin).
 */
function getPaymentStats() {
    const db = (0, db_1.getDB)();
    const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='payment_sessions'
  `).get();
    if (!tableExists) {
        return {
            totalSessions: 0,
            completedPayments: 0,
            totalRevenue: 0,
            byTier: { FREE: 0, PRO: 0, ENTERPRISE: 0 }
        };
    }
    const stats = db.prepare(`
    SELECT 
      COUNT(*) as totalSessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedPayments,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as totalRevenue
    FROM payment_sessions
  `).get();
    const byTier = db.prepare(`
    SELECT tier, COUNT(*) as count
    FROM payment_sessions
    WHERE status = 'completed'
    GROUP BY tier
  `).all();
    const tierCounts = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    byTier.forEach(({ tier, count }) => {
        tierCounts[tier] = count;
    });
    return {
        ...stats,
        byTier: tierCounts
    };
}
//# sourceMappingURL=payment.js.map