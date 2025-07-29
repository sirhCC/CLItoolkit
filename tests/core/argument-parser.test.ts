import { ArgumentParser, ArgumentTokenizer, TokenType, IParsedArgs } from '@/core/argument-parser';

describe('ArgumentTokenizer', () => {
  describe('tokenize', () => {
    it('should tokenize basic command arguments', () => {
      const args = ['command', '--verbose', '-f', 'file.txt'];
      const tokens = ArgumentTokenizer.tokenize(args);

      expect(tokens).toHaveLength(4);
      expect(tokens[0]).toEqual({ type: TokenType.VALUE, value: 'command', position: 0 });
      expect(tokens[1]).toEqual({ type: TokenType.OPTION_LONG, value: '--verbose', position: 1 });
      expect(tokens[2]).toEqual({ type: TokenType.OPTION_SHORT, value: '-f', position: 2 });
      expect(tokens[3]).toEqual({ type: TokenType.VALUE, value: 'file.txt', position: 3 });
    });

    it('should identify separator tokens', () => {
      const args = ['command', '--', 'file.txt'];
      const tokens = ArgumentTokenizer.tokenize(args);

      expect(tokens[1]).toEqual({ type: TokenType.SEPARATOR, value: '--', position: 1 });
    });

    it('should handle empty input', () => {
      const tokens = ArgumentTokenizer.tokenize([]);
      expect(tokens).toHaveLength(0);
    });
  });
});

describe('ArgumentParser', () => {
  describe('parse', () => {
    it('should parse basic command with options', () => {
      const args = ['build', '--output', 'dist', '--verbose'];
      const result = ArgumentParser.parse(args);

      expect(result.command).toBe('build');
      expect(result.options.output).toBe('dist');
      expect(result.options.verbose).toBe(true);
      expect(result.flags).toContain('verbose');
    });

    it('should parse command with subcommands', () => {
      const args = ['git', 'commit', '-m', 'Initial commit'];
      const result = ArgumentParser.parse(args);

      expect(result.command).toBe('git');
      expect(result.subcommands).toEqual(['commit']);
      expect(result.options.m).toBe('Initial commit');
    });

    it('should handle long options with equals syntax', () => {
      const args = ['command', '--output=dist/build', '--debug'];
      const result = ArgumentParser.parse(args);

      expect(result.options.output).toBe('dist/build');
      expect(result.options.debug).toBe(true);
    });

    it('should handle multiple short options', () => {
      const args = ['command', '-abc', 'file.txt'];
      const result = ArgumentParser.parse(args);

      expect(result.options.a).toBe(true);
      expect(result.options.b).toBe(true);
      expect(result.options.c).toBe(true);
      expect(result.flags).toEqual(['a', 'b', 'c']);
      expect(result.positionalArgs).toEqual(['file.txt']);
    });

    it('should handle positional arguments', () => {
      const args = ['copy', 'source.txt', 'dest.txt', '--force'];
      const result = ArgumentParser.parse(args);

      expect(result.command).toBe('copy');
      expect(result.positionalArgs).toEqual(['source.txt', 'dest.txt']);
      expect(result.options.force).toBe(true);
    });

    it('should handle separator (--) correctly', () => {
      const args = ['command', '--verbose', '--', '--not-an-option'];
      const result = ArgumentParser.parse(args);

      expect(result.options.verbose).toBe(true);
      expect(result.positionalArgs).toEqual(['--not-an-option']);
    });

    it('should handle complex real-world example', () => {
      const args = [
        'docker', 'run',
        '--rm',
        '--name=my-container',
        '-p', '8080:80',
        '-e', 'NODE_ENV=production',
        'nginx:latest',
        'nginx', '-g', 'daemon off;'
      ];
      const result = ArgumentParser.parse(args);

      expect(result.command).toBe('docker');
      expect(result.subcommands).toEqual(['run']);
      expect(result.options.rm).toBe(true);
      expect(result.options.name).toBe('my-container');
      expect(result.options.p).toBe('8080:80');
      expect(result.options.e).toBe('NODE_ENV=production');
      expect(result.positionalArgs).toEqual(['nginx:latest', 'nginx', '-g', 'daemon off;']);
    });

    it('should handle empty input gracefully', () => {
      const result = ArgumentParser.parse([]);

      expect(result.command).toBe('');
      expect(result.subcommands).toEqual([]);
      expect(result.positionalArgs).toEqual([]);
      expect(result.options).toEqual({});
      expect(result.flags).toEqual([]);
      expect(result.rawArgs).toEqual([]);
    });

    it('should preserve raw arguments', () => {
      const args = ['test', '--flag', 'value'];
      const result = ArgumentParser.parse(args);

      expect(result.rawArgs).toEqual(args);
    });
  });

  describe('edge cases', () => {
    it('should handle single dash as value', () => {
      const args = ['command', '-'];
      const result = ArgumentParser.parse(args);

      expect(result.positionalArgs).toEqual(['-']);
    });

    it('should handle option with empty value', () => {
      const args = ['command', '--empty='];
      const result = ArgumentParser.parse(args);

      expect(result.options.empty).toBe('');
    });

    it('should handle options with special characters', () => {
      const args = ['command', '--path=/home/user/file with spaces.txt'];
      const result = ArgumentParser.parse(args);

      expect(result.options.path).toBe('/home/user/file with spaces.txt');
    });
  });
});
