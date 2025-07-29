import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  StructuredLogger,
  LogLevel,
  LogFormat,
  LogEntry,
  LogTransport,
  ConsoleTransport,
  FileTransport,
  createLogger
} from '../src/core/structured-logger';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    // Reset singleton instance for each test
    (StructuredLogger as any).instance = undefined;
    
    // Create logger with minimal configuration for testing
    logger = StructuredLogger.getInstance({
      level: LogLevel.Debug,
      transports: [],
      enablePerformanceLogging: true,
      enableCorrelationIds: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Warn,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message');

      // Only warn and error should be logged
      expect(logFn).toHaveBeenCalledTimes(2);
    });

    it('should support all log levels', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Debug,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warn message');
      logger.error('Error message', new Error('Test error'));

      expect(logFn).toHaveBeenCalledTimes(4);
      
      const calls = logFn.mock.calls;
      expect((calls[0][0] as LogEntry).level).toBe(LogLevel.Debug);
      expect((calls[1][0] as LogEntry).level).toBe(LogLevel.Info);
      expect((calls[2][0] as LogEntry).level).toBe(LogLevel.Warn);
      expect((calls[3][0] as LogEntry).level).toBe(LogLevel.Error);
    });
  });

  describe('Log Entry Structure', () => {
    it('should create properly structured log entries', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Debug,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      const context = { userId: '123', action: 'test' };
      logger.info('Test message', context, 'test-source');

      const logEntry: LogEntry = logFn.mock.calls[0][0] as LogEntry;

      expect(logEntry).toMatchObject({
        level: LogLevel.Info,
        message: 'Test message',
        context: expect.objectContaining(context),
        source: 'test-source',
        timestamp: expect.any(String),
        correlationId: expect.any(String)
      });
    });

    it('should include error information when logging errors', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Error,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';

      logger.error('Error occurred', testError, { context: 'test' });

      const logEntry: LogEntry = logFn.mock.calls[0][0] as LogEntry;

      expect(logEntry.error).toMatchObject({
        name: 'Error',
        message: 'Test error',
        stack: 'Test stack trace'
      });
    });
  });

  describe('Performance Logging', () => {
    it('should track performance when enabled', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Info,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      const timerId = logger.startTimer('test-operation', { operation: 'test' });
      expect(timerId).toBeTruthy();

      // Simulate some work
      const duration = logger.endTimer(timerId, 'Operation completed');
      expect(duration).toBeGreaterThanOrEqual(0);

      expect(logFn).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Operation completed',
          context: expect.objectContaining({
            operation: 'test',
            performance: expect.objectContaining({
              duration: expect.any(Number)
            })
          })
        })
      );
    });

    it('should handle missing timers gracefully', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Warn,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      const duration = logger.endTimer('non-existent-timer');
      expect(duration).toBe(0);

      expect(logFn).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.Warn,
          message: expect.stringContaining('Timer non-existent-timer not found')
        })
      );
    });
  });

  describe('Child Loggers', () => {
    it('should create child loggers with inherited context', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Info,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      const childLogger = logger.child({ module: 'test-module' }, 'child-source');
      childLogger.info('Child message', { additional: 'context' });

      const logEntry: LogEntry = logFn.mock.calls[0][0] as LogEntry;

      expect(logEntry).toMatchObject({
        message: 'Child message',
        context: expect.objectContaining({
          module: 'test-module',
          additional: 'context'
        }),
        source: 'child-source'
      });
    });
  });

  describe('Correlation IDs', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = logger.generateCorrelationId();
      const id2 = logger.generateCorrelationId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^cli-\d+-\d+$/);
    });

    it('should not generate correlation IDs when disabled', () => {
      logger.configure({ enableCorrelationIds: false });

      const id = logger.generateCorrelationId();
      expect(id).toBe('');
    });
  });

  describe('Configuration', () => {
    it('should support configuration updates', () => {
      logger.configure({
        level: LogLevel.Error,
        enablePerformanceLogging: false
      });

      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const mockTransport: LogTransport = {
        name: 'test',
        level: LogLevel.Debug,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(mockTransport);

      logger.info('Should not log');
      logger.error('Should log');

      expect(logFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Transport Management', () => {
    it('should support multiple transports', () => {
      const logFn1 = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const logFn2 = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;

      const transport1: LogTransport = {
        name: 'transport1',
        level: LogLevel.Info,
        format: LogFormat.JSON,
        log: logFn1
      };

      const transport2: LogTransport = {
        name: 'transport2',
        level: LogLevel.Error,
        format: LogFormat.Text,
        log: logFn2
      };

      logger.addTransport(transport1);
      logger.addTransport(transport2);

      logger.info('Info message');
      logger.error('Error message');

      expect(logFn1).toHaveBeenCalledTimes(2);
      expect(logFn2).toHaveBeenCalledTimes(1); // Only error level
    });

    it('should allow removing transports', () => {
      const logFn = jest.fn() as jest.MockedFunction<(entry: LogEntry) => void>;
      const transport: LogTransport = {
        name: 'removable',
        level: LogLevel.Info,
        format: LogFormat.JSON,
        log: logFn
      };

      logger.addTransport(transport);
      logger.info('Before removal');

      logger.removeTransport('removable');
      logger.info('After removal');

      expect(logFn).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ConsoleTransport', () => {
  let transport: ConsoleTransport;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    transport = new ConsoleTransport(LogLevel.Debug, LogFormat.Pretty);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should format entries according to specified format', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.Info,
      message: 'Test message',
      context: { key: 'value' }
    };

    transport.log(entry);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test message'));
  });

  it('should use stderr for error level logs', () => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.Error,
      message: 'Error message'
    };

    transport.log(entry);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('should format JSON output correctly', () => {
    const transport = new ConsoleTransport(LogLevel.Debug, LogFormat.JSON);
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.Info,
      message: 'Test message'
    };

    transport.log(entry);

    expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(entry));
  });
});

describe('FileTransport', () => {
  let transport: FileTransport;

  beforeEach(() => {
    transport = new FileTransport('/tmp/test.log', LogLevel.Info, LogFormat.JSON);
  });

  it('should create file transport with correct configuration', () => {
    expect(transport.name).toBe('file');
    expect(transport.level).toBe(LogLevel.Info);
    expect(transport.format).toBe(LogFormat.JSON);
  });

  it('should handle log entries', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.Info,
      message: 'File log test'
    };

    await transport.log(entry);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[FILE LOG to /tmp/test.log]')
    );

    consoleSpy.mockRestore();
  });
});

describe('Utility Functions', () => {
  it('should create logger with custom configuration', () => {
    const customLogger = createLogger({
      level: LogLevel.Warn,
      transports: [new ConsoleTransport(LogLevel.Warn)],
      enablePerformanceLogging: false,
      enableCorrelationIds: false
    });

    expect(customLogger).toBeInstanceOf(StructuredLogger);
  });
});
