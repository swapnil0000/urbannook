class ApiRes {
  constructor(
    statusCode,
    message = "User Response",
    data = null,
    success = true
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = success;
  }
}
export default ApiRes;
