import env from "../config/envConfigSetup.js";

class CacheManager {
  constructor(ttl = 300, maxSize = 5) {
    this.cache = new Map();
    this.ttl = ttl * 1000;
    this.maxSize = maxSize;
    this.isDev = env.NODE_ENV !== "production";
  }

  generateKey(key) {
    return JSON.stringify(key);
  }

  async handle(key, fetcher) {
    const cacheKey = this.generateKey(key);
    const label = `🚀 LRU Cache [${cacheKey.substring(0, 20)}]`;

    // Only start the timer in development
    if (this.isDev) console.time(label);

    const cachedEntry = this.cache.get(cacheKey);

    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      if (this.isDev) console.log("--- ✅ HIT: Data found in memory ---");

      const data = cachedEntry.data;
      const expiresAt = cachedEntry.expiresAt;

      // Refresh position to make it 'Most Recently Used'
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, { data, expiresAt });

      if (this.isDev) console.timeEnd(label);
      return data;
    }

    if (this.isDev) console.log("--- 🐢 MISS: Fetching from Database ---");
    const freshData = await fetcher();
    this.set(key, freshData);

    if (this.isDev) console.timeEnd(label);
    return freshData;
  }

  set(key, data) {
    const cacheKey = this.generateKey(key);

    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
    } else if (this.cache.size >= this.maxSize) {
      // LRU Logic: Remove the oldest item (Index 0)
      const oldestKey = this.cache.keys().next().value;
      if (this.isDev)
        console.log(`--- 🧹 LRU PURGE: Deleting oldest item: ${oldestKey} ---`);
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      data,
      expiresAt: Date.now() + this.ttl,
    });

    if (this.isDev) {
      console.log(
        `--- 📦 Current Cache Size: ${this.cache.size}/${this.maxSize} ---`,
      );
    }
  }

  clear() {
    if (this.isDev) console.log("--- 🔥 Cache Cleared Successfully ---");
    this.cache.clear();
  }
}

export const apiCache = new CacheManager(600, 5);
