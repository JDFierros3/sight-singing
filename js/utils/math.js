/**
 * General math utilities
 */

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function randomInRange(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function normalizeModulo(value, mod) {
  return ((value % mod) + mod) % mod;
}

