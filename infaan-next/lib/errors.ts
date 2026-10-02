// API error helpers: status codes and message bodies follow the shared
// response contract (docs/ENDPOINTS.md).

export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.detail === "string" ? body.detail : JSON.stringify(body));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function unauthorized() {
  return new ApiError(401, { detail: "Authentication credentials were not provided." });
}

export function userInactive() {
  return new ApiError(401, { detail: "User is inactive" });
}

export function invalidToken(message = "Token is invalid or expired") {
  return new ApiError(401, { detail: message });
}

export function permissionDenied() {
  return new ApiError(403, { detail: "You do not have permission to perform this action." });
}

export function notFound(detail = "Not found.") {
  return new ApiError(404, { detail });
}

/** Detail for a missing valid-pk object: "No <Model> matches the given query." */
export function modelNotFound(model: string) {
  return new ApiError(404, { detail: `No ${model} matches the given query.` });
}

export function invalidPage() {
  return new ApiError(404, { detail: "Invalid page." });
}

export function methodNotAllowed(method: string) {
  return new ApiError(405, { detail: `Method "${method}" not allowed.` });
}

export function badRequest(body: Record<string, unknown>) {
  return new ApiError(400, body);
}

export function fieldError(field: string, message: string) {
  return new ApiError(400, { [field]: [message] });
}

export function nonFieldErrors(message: string) {
  return new ApiError(400, { non_field_errors: [message] });
}

export function conflict(field: string, message: string) {
  return new ApiError(400, { [field]: [message] });
}
