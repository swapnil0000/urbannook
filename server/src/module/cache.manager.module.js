import env from "../config/envConfigSetup.js";

class CacheManager {
  constructor(ttl = 600, maxMemoryMB = 4) {
    this.cache = new Map();
    this.ttl = ttl * 1000;
    this.maxMemoryBytes = maxMemoryMB * 1024 * 1024;
    this.currentMemoryUsage = 0;
    this.isDev = env.NODE_ENV !== "production";
  }

  estimateSize(obj) {
    return JSON.stringify(obj).length * 2;
  }

  generateKey(key) {
    return JSON.stringify(key);
  }

  async handle(key, fetcher) {
    const cacheKey = this.generateKey(key);
    const label = `🚀 Cache [${cacheKey.substring(0, 20)}]`;

    if (this.isDev) console.time(label);

    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      if (this.isDev) console.log("--- ✅ HIT: Serving from Memory ---");

      const { data, expiresAt, size } = cachedEntry;
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, { data, expiresAt, size });

      if (this.isDev) console.timeEnd(label);
      return data;
    }

    if (this.isDev) console.log("--- 🐢 MISS: Fetching from DB ---");
    const freshData = await fetcher();
    this.set(key, freshData);

    if (this.isDev) console.timeEnd(label);
    return freshData;
  }

  set(key, data) {
    const cacheKey = this.generateKey(key);
    const itemSize = this.estimateSize(data);

    if (this.cache.has(cacheKey)) {
      this.currentMemoryUsage -= this.cache.get(cacheKey).size;
      this.cache.delete(cacheKey);
    }

    // LRU: Delete oldest until enough space for new item
    while (
      this.currentMemoryUsage + itemSize > this.maxMemoryBytes &&
      this.cache.size > 0
    ) {
      const oldestKey = this.cache.keys().next().value;
      const oldestItem = this.cache.get(oldestKey);

      this.currentMemoryUsage -= oldestItem.size;
      this.cache.delete(oldestKey);

      if (this.isDev) console.log(`--- 🧹 Memory Full: Evicting LRU item ---`);
    }

    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.ttl,
      size: itemSize,
    });
    this.currentMemoryUsage += itemSize;

    if (this.isDev) {
      const usageKB = (this.currentMemoryUsage / 1024).toFixed(2);
      console.log(
        `--- 📦 Cache: ${usageKB}KB / ${this.maxMemoryBytes / 1024}KB ---`,
      );
    }
  }

  clear() {
    if (this.isDev) console.log("--- 🔥 Manual Cache Flush ---");
    this.cache.clear();
    this.currentMemoryUsage = 0;
  }
}

export const apiCache = new CacheManager(600, 4);
