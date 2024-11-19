import NodeCache from "node-cache";
const cache = new NodeCache({ stdTTL: 60 });

// Check cache exist
export const hasCache = (key) => {
  return cache.has(key);
};

// fetch cache data
export const getCache = (key) => {
  return cache.get(key);
};

// set cache data
export const setCache = (key, payload) => {
  cache.set(key, payload);
};

// det cache data
export const deleteCache = (key) => {
  cache.del(key);
};
