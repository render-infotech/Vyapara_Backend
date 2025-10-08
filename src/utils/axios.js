import axios from 'axios';
import logger from './logger';

const requestHeaders = (key = null) => {
  const req = global.requestStore.currentRequest;
  const headers = req.headers ?? {};
  if (key && key in headers) {
    return { [key]: headers[key] };
  }
  return headers;
};

const getInternalAuthorisationHeaders = () => ({
  // eslint-disable-next-line no-constant-binary-expression
  Authorization: `Bearer ${process.env.INTERNAL_KEY}` || '',
});

const getRequest = async (url, params = {}, headers = {}) => {
  const requestHeader = getInternalAuthorisationHeaders();
  try {
    const response = await axios.get(url, {
      params,
      headers: {
        ...headers,
        ...requestHeader,
      },
    });

    logger.info(`getRequest Response Data: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error(
      `getRequest Error: ${
        error.response ? error.response.data : error.message
      }`
    );
    logger.error(
      `getRequest Error: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`
    );
  }
  return null;
};

const postRequest = async (
  url,
  data = {},
  headers = {},
  req = {},
  useReqAuth = false
) => {
  const requestHeader = useReqAuth
    ? requestHeaders(req, 'Authorization')
    : getInternalAuthorisationHeaders();
  // const requestHeader = useReqAuth ? requestHeaders(req, 'Authorization') : {};

  try {
    const response = await axios.post(url, data, {
      headers: {
        ...headers,
        ...requestHeader,
      },
    });

    logger.info(`postRequest Response Data: ${JSON.stringify(response.data)}`);
    return response.data;
  } catch (error) {
    logger.error(
      `postRequest Error: ${
        error.response ? JSON.stringify(error.response.data) : error.message
      }`
    );
  }
  return null;
};

export { getRequest, postRequest };
