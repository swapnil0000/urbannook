import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { webcrypto } from 'node:crypto';

// Fix crypto.getRandomValues issue in Node.js environment
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Cleanup after each test
afterEach(() => {
  cleanup();
});
