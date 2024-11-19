//send success response
export const success = async (res, message, statusCode = 200, data = null, extras = null) => {
  let response = {
    status: true,
    code: statusCode,
    message: message,
  };
  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// send error response
export const error = async (res, message, statusCode = 500) => {
  return res.status(statusCode).json({
    status: false,
    code: statusCode,
    message: message || "Internal server error",
  });
};
