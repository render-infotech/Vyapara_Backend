export const response = (code, body) => {
  const httpResponse = {
    statusCode: code,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
  return httpResponse;
};

export default { response };
