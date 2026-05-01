"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLinewave = registerLinewave;
const linewave_1 = require("../engines/signals/linewave");
function registerLinewave() {
    return {
        healthy: true,
        compute: (signals) => (0, linewave_1.computeWaveParams)(signals),
        profile: (load, errorRate) => (0, linewave_1.computeWaveParams)({ load, error_rate: errorRate }),
    };
}
//# sourceMappingURL=linewave.js.map