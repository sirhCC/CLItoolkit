import { TestHelpers } from '../helpers/test-utils';

describe('TestHelpers', () => {
  describe('mockProcessArgv', () => {
    it('should mock process.argv correctly', () => {
      const restore = TestHelpers.mockProcessArgv(['--help', '--version']);
      
      expect(process.argv).toEqual(['node', 'cli', '--help', '--version']);
      
      restore();
      expect(process.argv).not.toContain('--help');
    });
  });

  describe('mockConsole', () => {
    it('should mock console methods', () => {
      const consoleMock = TestHelpers.mockConsole();
      
      console.log('test message');
      console.error('error message');
      
      expect(consoleMock.log).toHaveBeenCalledWith('test message');
      expect(consoleMock.error).toHaveBeenCalledWith('error message');
      
      consoleMock.restore();
    });
  });

  describe('createMockCommand', () => {
    it('should create a mock command with default properties', () => {
      const mockCommand = TestHelpers.createMockCommand('test');
      
      expect(mockCommand.name).toBe('test');
      expect(mockCommand.description).toBe('Mock command: test');
      expect(mockCommand.execute).toBeDefined();
    });
  });
});
