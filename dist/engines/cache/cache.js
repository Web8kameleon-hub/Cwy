"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
exports.getCachedSnapshot = getCachedSnapshot;
exports.setCachedSnapshot = setCachedSnapshot;
exports.getCachedOverview = getCachedOverview;
exports.setCachedOverview = setCachedOverview;
exports.invalidateCache = invalidateCache;
class CWYCache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 5000; // 5 seconds default
    }
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl,
        });
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    invalidate(key) {
        this.cache.delete(key);
    }
    invalidateAll() {
        this.cache.clear();
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        const age = Date.now() - entry.timestamp;
        return age <= entry.ttl;
    }
}
exports.cache = new CWYCache();
// Helper functions for common cache operations
function getCachedSnapshot() {
    return exports.cache.get("last_snapshot");
}
function setCachedSnapshot(snapshot, ttl = 10000) {
    exports.cache.set("last_snapshot", snapshot, ttl);
}
function getCachedOverview() {
    return exports.cache.get("overview");
}
function setCachedOverview(overview, ttl = 5000) {
    exports.cache.set("overview", overview, ttl);
}
function invalidateCache() {
    exports.cache.invalidateAll();
}
//# sourceMappingURL=cache.js.map