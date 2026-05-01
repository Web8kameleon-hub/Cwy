"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSearch = registerSearch;
const db_1 = require("../memory/db");
const search_1 = require("../engines/search/search");
function registerSearch() {
    const snapshot = (0, db_1.getLastSnapshot)();
    if (!snapshot) {
        throw new Error("No snapshot available. Run `cwy scan` before search registration.");
    }
    return {
        healthy: true,
        run: (query, limit = 20) => {
            const files = snapshot.modules.map((m) => ({
                path: m.path,
                language: m.metadata?.language || "Unknown",
                loc: m.metadata?.loc || 0,
            }));
            const nodes = snapshot.modules.map((m) => ({
                id: m.id,
                label: m.name,
            }));
            return (0, search_1.search)(query, files, nodes, { limit });
        },
    };
}
//# sourceMappingURL=search.js.map