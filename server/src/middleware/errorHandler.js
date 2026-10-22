export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: { code: 'ROUTE_NOT_FOUND', message: 'The requested endpoint was not found.' } });
}

export function errorHandler(err, req, res, next) {
  if (err?.code === 'LIMIT_FILE_SIZE') { err.statusCode = 413; err.code = 'ATTACHMENT_TOO_LARGE'; err.message = 'Attachments must be 5 MB or smaller.'; }
  if (err?.code === 'LIMIT_FILE_COUNT' || err?.code === 'LIMIT_UNEXPECTED_FILE') { err.statusCode = 400; err.code = 'INVALID_ATTACHMENT_COUNT'; err.message = 'Upload one attachment at a time.'; }
  const status = Number(err.statusCode) || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'An unexpected server error occurred.' : err.message,
    },
  });
}
