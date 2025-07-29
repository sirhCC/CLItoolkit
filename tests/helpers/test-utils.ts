/**
 * Test utilities and helpers for CLI Toolkit Framework
 */

export class TestHelpers {
  /**
   * Mock process.argv for testing CLI argument parsing
   */
  static mockProcessArgv(args: string[]): () => void {
    const originalArgv = process.argv;
    process.argv = ['node', 'cli', ...args];
    
    return () => {
      process.argv = originalArgv;
    };
  }

  /**
   * Mock console methods for testing output
   */
  static mockConsole(): {
    log: jest.SpyInstance;
    error: jest.SpyInstance;
    warn: jest.SpyInstance;
    restore: () => void;
  } {
    const log = jest.spyOn(console, 'log').mockImplementation();
    const error = jest.spyOn(console, 'error').mockImplementation();
    const warn = jest.spyOn(console, 'warn').mockImplementation();

    return {
      log,
      error,
      warn,
      restore: () => {
        log.mockRestore();
        error.mockRestore();
        warn.mockRestore();
      }
    };
  }

  /**
   * Create a mock command for testing
   */
  static createMockCommand(name: string, options: any = {}): any {
    return {
      name,
      description: `Mock command: ${name}`,
      execute: jest.fn(),
      ...options
    };
  }
}
