class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    data = null,
    success = false
  ) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = success;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
export default ApiError;
