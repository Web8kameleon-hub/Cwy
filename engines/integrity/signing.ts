// Binary signing & verification for CWY distribution
// Uses Ed25519 for fast, secure signature verification
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

// Public key (hardcoded in binary) - this would be the real public key in production
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA...
-----END PUBLIC KEY-----`;

export interface SignatureInfo {
  valid: boolean;
  reason?: string;
  signedAt?: string;
  version?: string;
}

/**
 * Verify binary signature on startup.
 * This protects against:
 * - Tampering
 * - Unauthorized redistribution
 * - Corrupted binaries
 */
export function verifyBinarySignature(): SignatureInfo {
  try {
    // Skip in development mode
    if (process.env.CWY_DEV_MODE === "1") {
      return { valid: true, reason: "Development mode - signature check skipped" };
    }

    // Detect if running from source (ts-node) vs compiled binary
    const isSourceMode = process.argv[1]?.endsWith(".ts") || process.argv[0]?.includes("ts-node");
    if (isSourceMode) {
      return {
        valid: false,
        reason: "Running from source without CWY_DEV_MODE=1. Set CWY_DEV_MODE=1 for development.",
      };
    }

    const binaryPath = process.execPath; // Path to node/cwy binary
    const signaturePath = `${binaryPath}.sig`;

    if (!fs.existsSync(signaturePath)) {
      return {
        valid: false,
        reason: "Signature file missing. Binary may be corrupted or unauthorized.",
      };
    }

    const binaryData = fs.readFileSync(binaryPath);
    const signatureData = fs.readFileSync(signaturePath, "utf8");
    const { signature, version, signedAt } = JSON.parse(signatureData);

    // Verify Ed25519 signature
    const verify = crypto.createVerify("SHA256");
    verify.update(binaryData);
    verify.end();

    const isValid = verify.verify(PUBLIC_KEY, signature, "base64");

    if (!isValid) {
      return {
        valid: false,
        reason: "Signature verification failed. Binary may have been modified.",
      };
    }

    return { valid: true, version, signedAt };
  } catch (err: any) {
    return {
      valid: false,
      reason: `Verification error: ${err.message}`,
    };
  }
}

/**
 * Sign a binary (used during build/release process)
 * This is NOT included in distributed binaries, only in build tools
 */
export function signBinary(
  binaryPath: string,
  privateKeyPath: string,
  version: string
): void {
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");
  const binaryData = fs.readFileSync(binaryPath);

  const sign = crypto.createSign("SHA256");
  sign.update(binaryData);
  sign.end();

  const signature = sign.sign(privateKey, "base64");

  const signatureData = {
    signature,
    version,
    signedAt: new Date().toISOString(),
    algorithm: "Ed25519",
  };

  fs.writeFileSync(`${binaryPath}.sig`, JSON.stringify(signatureData, null, 2));
  console.log(`Binary signed: ${binaryPath}.sig`);
}

/**
 * Check if running in tamper-safe mode
 */
export function isTamperSafe(): boolean {
  const result = verifyBinarySignature();
  return result.valid;
}
