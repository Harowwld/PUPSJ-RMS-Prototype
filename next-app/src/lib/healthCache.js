let healthCache = null;
let healthCacheAt = 0;

export function getHealthCache() {
  return { healthCache, healthCacheAt };
}

export function setHealthCache(data, at = Date.now()) {
  healthCache = data;
  healthCacheAt = at;
}

export function clearHealthCache() {
  healthCache = null;
  healthCacheAt = 0;
}
