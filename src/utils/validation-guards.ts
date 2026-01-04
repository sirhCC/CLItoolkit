/**
 * Runtime validation guards for parameter checking
 * Provides reusable validation functions with descriptive error messages
 */

import { InvalidArgumentError, ConfigurationError } from '../types/enhanced-errors';

/**
 * Assert that a value is not null or undefined
 */
export function assertDefined<T>(value: T | null | undefined, paramName: string, context?: string): asserts value is T {
  if (value === null || value === undefined) {
    const message = context
      ? `${paramName} cannot be null or undefined in ${context}`
      : `${paramName} cannot be null or undefined`;
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert that a value is a non-empty string
 */
export function assertNonEmptyString(value: unknown, paramName: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new InvalidArgumentError(paramName, value, 'must be a string', undefined);
  }
  if (value.trim().length === 0) {
    throw new InvalidArgumentError(paramName, value, 'cannot be empty', undefined);
  }
}

/**
 * Assert that a value is a function
 */
export function assertFunction(value: unknown, paramName: string, context?: string): asserts value is Function {
  if (typeof value !== 'function') {
    const message = context
      ? `${paramName} must be a function in ${context}`
      : `${paramName} must be a function`;
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert that a value is an array
 */
export function assertArray<T = any>(value: unknown, paramName: string, context?: string): asserts value is T[] {
  if (!Array.isArray(value)) {
    const message = context
      ? `${paramName} must be an array in ${context}`
      : `${paramName} must be an array`;
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert that a value is an object (not null, not array)
 */
export function assertObject(value: unknown, paramName: string, context?: string): asserts value is Record<string, any> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    const message = context
      ? `${paramName} must be an object in ${context}`
      : `${paramName} must be an object`;
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert that a number is within a range
 */
export function assertInRange(value: number, paramName: string, min: number, max: number): void {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new InvalidArgumentError(paramName, value, 'must be a finite number');
  }
  if (value < min || value > max) {
    const message = `must be between ${min} and ${max}`;
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert that a number is a positive integer
 */
export function assertPositiveInteger(value: number, paramName: string, allowZero: boolean = false): void {
  if (typeof value !== 'number' || !isFinite(value)) {
    throw new InvalidArgumentError(paramName, value, 'must be a finite number');
  }
  if (Math.floor(value) !== value) {
    throw new InvalidArgumentError(paramName, value, 'must be an integer');
  }
  const minValue = allowZero ? 0 : 1;
  if (value < minValue) {
    const message = allowZero ? 'must be non-negative' : 'must be positive';
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert that a string matches a pattern
 */
export function assertPattern(value: string, paramName: string, pattern: RegExp, description: string): void {
  assertNonEmptyString(value, paramName);
  if (!pattern.test(value)) {
    throw new InvalidArgumentError(paramName, value, description);
  }
}

/**
 * Assert that a value is one of the allowed values
 */
export function assertEnum<T>(value: T, paramName: string, allowedValues: readonly T[], context?: string): void {
  if (!allowedValues.includes(value)) {
    const message = context
      ? `must be one of: ${allowedValues.join(', ')} in ${context}`
      : `must be one of: ${allowedValues.join(', ')}`;
    throw new InvalidArgumentError(paramName, value, message);
  }
}

/**
 * Assert valid command name (alphanumeric, hyphens, underscores)
 */
export function assertValidCommandName(value: string, context?: string): void {
  assertNonEmptyString(value, 'command name');
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new InvalidArgumentError(
      'command name',
      value,
      'must contain only alphanumeric characters, hyphens, and underscores'
    );
  }
}

/**
 * Assert that configuration is valid
 */
export function assertValidConfiguration<T extends Record<string, any>>(
  config: T,
  requiredKeys: (keyof T)[],
  context?: string
): void {
  assertObject(config, 'configuration', context);

  for (const key of requiredKeys) {
    if (!(key in config)) {
      const message = context
        ? `Missing required configuration key: ${String(key)} in ${context}`
        : `Missing required configuration key: ${String(key)}`;
      throw new ConfigurationError(message);
    }
  }
}

/**
 * Validate and coerce a value to a specific type
 */
export function coerceToType(value: unknown, type: 'string' | 'number' | 'boolean', paramName: string): string | number | boolean {
  switch (type) {
    case 'string':
      return String(value);
    case 'number': {
      const num = Number(value);
      if (isNaN(num) || !isFinite(num)) {
        throw new InvalidArgumentError(paramName, value, 'cannot be converted to a valid number');
      }
      return num;
    }
    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }
      throw new InvalidArgumentError(paramName, value, 'cannot be converted to a boolean');
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}
