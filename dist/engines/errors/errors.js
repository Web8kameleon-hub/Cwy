"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanError = exports.DatabaseError = exports.NotFoundError = exports.ValidationError = exports.CWYError = void 0;
exports.validatePath = validatePath;
exports.validateQuery = validateQuery;
exports.handleError = handleError;
class CWYError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = "CWYError";
    }
}
exports.CWYError = CWYError;
class ValidationError extends CWYError {
    constructor(message, details) {
        super(message, "VALIDATION_ERROR", details);
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends CWYError {
    constructor(resource, identifier) {
        super(`${resource} not found: ${identifier}`, "NOT_FOUND", { resource, identifier });
        this.name = "NotFoundError";
    }
}
exports.NotFoundError = NotFoundError;
class DatabaseError extends CWYError {
    constructor(message, details) {
        super(message, "DATABASE_ERROR", details);
        this.name = "DatabaseError";
    }
}
exports.DatabaseError = DatabaseError;
class ScanError extends CWYError {
    constructor(message, details) {
        super(message, "SCAN_ERROR", details);
        this.name = "ScanError";
    }
}
exports.ScanError = ScanError;
// Validation helpers
function validatePath(filePath) {
    if (!filePath || filePath.trim().length === 0) {
        throw new ValidationError("File path cannot be empty");
    }
    if (filePath.includes("..")) {
        throw new ValidationError("File path cannot contain '..' (path traversal)");
    }
}
function validateQuery(query) {
    if (!query || query.trim().length === 0) {
        throw new ValidationError("Search query cannot be empty");
    }
    if (query.length > 100) {
        throw new ValidationError("Search query too long (max 100 characters)");
    }
}
function handleError(error) {
    if (error instanceof CWYError) {
        return `Error: ${error.message}`;
    }
    if (error instanceof Error) {
        return `Error: ${error.message}`;
    }
    return `Unknown error: ${String(error)}`;
}
//# sourceMappingURL=errors.js.map