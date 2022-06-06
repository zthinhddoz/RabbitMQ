import axios from 'axios';

export const getCodeFromClient = url => {
  return axios.create({
    baseURL: url,
    headers: {
      Accept: 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });
};

export const getCodeFromClientWithAuthen = (url, { usrNm, pwd, token }, authenType) => {
  const apiManageHandler = axios.create({
    baseURL: url,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  if (authenType === 'Bearer Token') {
    apiManageHandler.interceptors.request.use(config => {
      if (token != null) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  } else if (authenType === 'Basic Auth') {
    apiManageHandler.interceptors.request.use(config => {
      const originalStr = `${usrNm}:${pwd}`;
      const base64Str = Buffer.from(originalStr, 'utf8').toString('base64');
      config.headers.Authorization = `Basic ${base64Str}`;
      return config;
    });
  }

  return apiManageHandler;
};

// Get key and index for getting data from JSON
const getNextPart = part => {
  const idxPattern = new RegExp('\\[[0-9]+\\]', 'g');
  const idxValue = part.match(idxPattern);
  if (idxValue && idxValue.length) {
    const key = part.replace(idxValue[0], '');
    const idx = idxValue[0].replace(/[\[\]]/g, '');
    return { key, idx };
  }
  return { key: part };
};

// Get data from response data using res_key input from user
const createProcReturnCode = (data, parts) => {
  let result = { ...data };
  for (let partIdx = 0; partIdx < parts.length; partIdx++) {
    const nextPart = getNextPart(parts[partIdx]);
    const { key, idx } = nextPart;
    if (key && result && result.hasOwnProperty(key)) {
      if (idx) {
        result = result[key][idx];
      } else {
        result = result[key];
      }
    } else {
      return null;
    }
  }
  return result;
};

/**
  userFormat will be always a string
*/
export const callReturnCodeProc = (data, userFormat) => {
  const parts = userFormat ? userFormat.split('.') : [];
  if (parts.length) {
    const result = createProcReturnCode(data, parts);
    return result && typeof result !== 'object' ? result : null;
  }
  throw new Error('response key is empty');
};
