class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    data = null,
    success = false
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.success = success;
    this.name = this.constructor.name;
    // Make message enumerable so it appears in JSON.stringify / res.json()
    Object.defineProperty(this, "message", {
      value: message,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    Error.captureStackTrace(this, this.constructor);
  }
}
export default ApiError;
