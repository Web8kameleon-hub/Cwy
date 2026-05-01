"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerOverview = registerOverview;
const db_1 = require("../memory/db");
const overview_1 = require("../engines/overview/overview");
function registerOverview() {
    const snapshot = (0, db_1.getLastSnapshot)();
    if (!snapshot) {
        throw new Error("No snapshot available. Run `cwy scan` before overview registration.");
    }
    const getOverview = () => (0, overview_1.generateOverview)(snapshot);
    return {
        healthy: true,
        getOverview,
        format: () => (0, overview_1.formatOverview)(getOverview()),
    };
}
//# sourceMappingURL=overview.js.map