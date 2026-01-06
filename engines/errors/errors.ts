export class CWYError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = "CWYError";
  }
}

export class ValidationError extends CWYError {
  constructor(message: string, details?: any) {
    super(message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends CWYError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, "NOT_FOUND", { resource, identifier });
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends CWYError {
  constructor(message: string, details?: any) {
    super(message, "DATABASE_ERROR", details);
    this.name = "DatabaseError";
  }
}

export class ScanError extends CWYError {
  constructor(message: string, details?: any) {
    super(message, "SCAN_ERROR", details);
    this.name = "ScanError";
  }
}

// Validation helpers
export function validatePath(filePath: string): void {
  if (!filePath || filePath.trim().length === 0) {
    throw new ValidationError("File path cannot be empty");
  }
  
  if (filePath.includes("..")) {
    throw new ValidationError("File path cannot contain '..' (path traversal)");
  }
}

export function validateQuery(query: string): void {
  if (!query || query.trim().length === 0) {
    throw new ValidationError("Search query cannot be empty");
  }
  
  if (query.length > 100) {
    throw new ValidationError("Search query too long (max 100 characters)");
  }
}

export function handleError(error: unknown): string {
  if (error instanceof CWYError) {
    return `Error: ${error.message}`;
  }
  
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  
  return `Unknown error: ${String(error)}`;
}
