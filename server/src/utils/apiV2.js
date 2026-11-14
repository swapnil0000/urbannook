// API v2 response envelope - one shape for every v2 endpoint:
//   success: { success: true,  data, meta? }
//   error:   { success: false, data: null, error: { code, message } }
// Lists are always arrays (never null when empty); pagination goes in meta.
export const sendV2 = (res, data, { status = 200, meta } = {}) =>
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data });

const CODE_BY_STATUS = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
};

// Error handler for the /api/v2 router only. 5xx are passed on to the global
// errorHandler (it sends the alert); its body is then the v1 shape, which is
// acceptable for unexpected failures until the global handler is versioned.
export const v2ErrorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status >= 500) return next(err);
  return res.status(status).json({
    success: false,
    data: null,
    error: { code: CODE_BY_STATUS[status] || "ERROR", message: err.message || "Request failed" },
  });
};
