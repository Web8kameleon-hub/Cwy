"use strict";
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
exports.verifyBinarySignature = verifyBinarySignature;
exports.signBinary = signBinary;
exports.isTamperSafe = isTamperSafe;
// Binary signing & verification for CWY distribution
// Uses Ed25519 for fast, secure signature verification
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
// Public key (hardcoded in binary) - this would be the real public key in production
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA...
-----END PUBLIC KEY-----`;
/**
 * Verify binary signature on startup.
 * This protects against:
 * - Tampering
 * - Unauthorized redistribution
 * - Corrupted binaries
 */
function verifyBinarySignature() {
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
    }
    catch (err) {
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
function signBinary(binaryPath, privateKeyPath, version) {
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
function isTamperSafe() {
    const result = verifyBinarySignature();
    return result.valid;
}
//# sourceMappingURL=signing.js.map