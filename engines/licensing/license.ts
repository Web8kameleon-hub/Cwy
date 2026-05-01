// CWY License Management - Offline-first, ethical monetization
// Supports: free tier, license keys, and optional payment verification

import * as crypto from "crypto";
import { getDB } from "../../memory/db";

export type LicenseTier = "FREE" | "PRO" | "ENTERPRISE";

export interface License {
  id: string;
  tier: LicenseTier;
  key: string;
  activatedAt: string;
  expiresAt: string | null; // null = lifetime
  email?: string;
  verified: boolean; // verified with payment gateway
}

export interface LicenseValidation {
  valid: boolean;
  tier: LicenseTier;
  reason?: string;
  daysRemaining?: number;
}

/**
 * Check if a feature is available for the current license tier.
 */
export function isFeatureAllowed(
  feature: "scan" | "route" | "integrity" | "signals" | "icon" | "status" | "diff" | "export"
): boolean {
  const license = getActiveLicense();
  
  // Free tier features
  const freeTierFeatures: string[] = ["scan", "icon", "status"];
  
  // Pro tier features (includes all free tier)
  const proTierFeatures: string[] = [...freeTierFeatures, "route", "integrity", "signals", "diff"];
  
  // Enterprise tier features (includes all)
  const enterpriseTierFeatures: string[] = [...proTierFeatures, "export"];
  
  switch (license.tier) {
    case "FREE":
      return freeTierFeatures.includes(feature);
    case "PRO":
      return proTierFeatures.includes(feature);
    case "ENTERPRISE":
      return enterpriseTierFeatures.includes(feature);
    default:
      return freeTierFeatures.includes(feature);
  }
}

/**
 * Get the currently active license (defaults to FREE if none).
 */
export function getActiveLicense(): License {
  const db = getDB();
  
  // Check if license table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master WHERE type='table' AND name='licenses'
  `).get();
  
  if (!tableExists) {
    createLicenseTable();
  }
  
  const row = db.prepare(`
    SELECT * FROM licenses 
    WHERE (expiresAt IS NULL OR datetime(expiresAt) > datetime('now'))
    ORDER BY activatedAt DESC
    LIMIT 1
  `).get() as License | undefined;
  
  if (!row) {
    // Return default FREE tier
    return {
      id: "free_default",
      tier: "FREE",
      key: "",
      activatedAt: new Date().toISOString(),
      expiresAt: null,
      verified: true
    };
  }
  
  return row;
}

/**
 * Validate a license and return details.
 */
export function validateLicense(): LicenseValidation {
  const license = getActiveLicense();
  
  // If FREE tier, always valid
  if (license.tier === "FREE") {
    return {
      valid: true,
      tier: "FREE"
    };
  }
  
  // Check if expired
  if (license.expiresAt) {
    const expiresAt = new Date(license.expiresAt);
    const now = new Date();
    
    if (expiresAt < now) {
      return {
        valid: false,
        tier: license.tier,
        reason: "License expired"
      };
    }
    
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      valid: true,
      tier: license.tier,
      daysRemaining
    };
  }
  
  // Lifetime license
  return {
    valid: true,
    tier: license.tier
  };
}

/**
 * Activate a license key.
 */
export function activateLicense(licenseKey: string, email?: string): { success: boolean; message: string } {
  try {
    // Validate license key format
    const decoded = decodeLicenseKey(licenseKey);
    
    if (!decoded) {
      return {
        success: false,
        message: "Invalid license key format"
      };
    }
    
    const { tier, expiresAt, signature } = decoded;
    
    // Verify signature (simple check - in production, use proper crypto verification)
    const expectedSignature = generateSignature(tier, expiresAt);
    if (signature !== expectedSignature.substring(0, 8)) {
      return {
        success: false,
        message: "Invalid license key signature"
      };
    }
    
    // Save to database
    const db = getDB();
    const id = `license_${Date.now()}`;
    
    db.prepare(`
      INSERT INTO licenses (id, tier, key, activatedAt, expiresAt, email, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tier,
      licenseKey,
      new Date().toISOString(),
      expiresAt,
      email || null,
      false // Will be verified via payment gateway callback
    );
    
    return {
      success: true,
      message: `${tier} license activated successfully`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to activate license: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Generate a license key.
 * Format: CWY-{TIER}-{EXPIRY_TIMESTAMP}-{SIGNATURE}
 */
export function generateLicenseKey(tier: LicenseTier, expiresAt: string | null): string {
  const expiryPart = expiresAt ? new Date(expiresAt).getTime().toString(36) : "LIFETIME";
  const signature = generateSignature(tier, expiresAt);
  
  return `CWY-${tier}-${expiryPart}-${signature.substring(0, 8)}`.toUpperCase();
}

/**
 * Decode a license key.
 */
function decodeLicenseKey(key: string): { tier: LicenseTier; expiresAt: string | null; signature: string } | null {
  const parts = key.split("-");
  
  if (parts.length !== 4 || parts[0] !== "CWY") {
    return null;
  }
  
  const tier = parts[1] as LicenseTier;
  const expiryPart = parts[2];
  const signature = parts[3];
  
  const expiresAt = expiryPart === "LIFETIME" ? null : new Date(parseInt(expiryPart, 36)).toISOString();
  
  return { tier, expiresAt, signature };
}

/**
 * Generate signature for license key.
 */
function generateSignature(tier: LicenseTier, expiresAt: string | null): string {
  const secret = "CWY_SECRET_2024"; // In production, use env variable
  const data = `${tier}:${expiresAt || "LIFETIME"}:${secret}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Create license table if it doesn't exist.
 */
function createLicenseTable() {
  const db = getDB();
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
 * Get pricing info for each tier.
 */
export function getPricingInfo(): { tier: LicenseTier; price: number; duration: string; features: string[] }[] {
  return [
    {
      tier: "FREE",
      price: 0,
      duration: "Forever",
      features: [
        "Basic scan (up to 100 files)",
        "System icon",
        "Status check"
      ]
    },
    {
      tier: "PRO",
      price: 29,
      duration: "One-time payment",
      features: [
        "All FREE features",
        "Unlimited scan",
        "Route pathfinding",
        "Integrity reports",
        "Signals detection",
        "Diff comparison"
      ]
    },
    {
      tier: "ENTERPRISE",
      price: 99,
      duration: "One-time payment",
      features: [
        "All PRO features",
        "Export to JSON/GraphML",
        "Priority support",
        "Custom integrations"
      ]
    }
  ];
}

/**
 * Verify license key with backend API (online validation).
 * Falls back to offline validation if backend is unreachable.
 */
export async function verifyLicenseOnline(licenseKey: string): Promise<{ success: boolean; message: string; tier?: LicenseTier }> {
  const backendUrl = process.env.CWY_LICENSE_API || "https://kameleon.life/api/validate-license";

  try {
    const https = require("https");
    const http = require("http");
    const url = new URL(backendUrl);
    const client = url.protocol === "https:" ? https : http;

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        license_key: licenseKey,
        machine_id: process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown"
      });

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        },
        timeout: 5000 // 5 second timeout
      };

      const req = client.request(options, (res: any) => {
        let data = "";

        res.on("data", (chunk: any) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);

            if (response.valid) {
              resolve({
                success: true,
                message: `License verified: ${response.tier}`,
                tier: response.tier
              });
            } else {
              resolve({
                success: false,
                message: response.reason || "License validation failed"
              });
            }
          } catch (error) {
            resolve({
              success: false,
              message: "Invalid response from license server"
            });
          }
        });
      });

      req.on("error", () => {
        // Fallback to offline validation
        const decoded = decodeLicenseKey(licenseKey);
        if (!decoded) {
          resolve({
            success: false,
            message: "Invalid license key format"
          });
          return;
        }

        const { tier, signature } = decoded;
        const expectedSignature = generateSignature(tier, decoded.expiresAt);

        if (signature === expectedSignature.substring(0, 8)) {
          resolve({
            success: true,
            message: `License verified offline: ${tier}`,
            tier
          });
        } else {
          resolve({
            success: false,
            message: "Invalid license signature"
          });
        }
      });

      req.on("timeout", () => {
        req.destroy();
      });

      req.write(postData);
      req.end();
    });
  } catch (error) {
    return {
      success: false,
      message: `Verification failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
