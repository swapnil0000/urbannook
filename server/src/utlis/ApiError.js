class ApiError {
  constructor(
    statusCode,
    message = "Something went wrong",
    data = null,
    success = false
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = success;
  }
}
export default ApiError;
