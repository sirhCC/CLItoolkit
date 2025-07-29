/**
 * Command line argument parsing utilities
 */

/**
 * Parsed command line arguments
 */
export interface IParsedArgs {
  command: string;
  subcommands: string[];
  positionalArgs: string[];
  options: Record<string, any>;
  flags: string[];
  rawArgs: string[];
}

/**
 * Argument token types
 */
export enum TokenType {
  COMMAND = 'command',
  OPTION_LONG = 'option-long',     // --option
  OPTION_SHORT = 'option-short',   // -o
  VALUE = 'value',
  FLAG = 'flag',
  SEPARATOR = 'separator'          // --
}

/**
 * Argument token
 */
export interface IToken {
  type: TokenType;
  value: string;
  position: number;
}

/**
 * Command line tokenizer
 * Converts raw arguments into structured tokens
 */
export class ArgumentTokenizer {
  /**
   * Tokenize command line arguments
   */
  static tokenize(args: string[]): IToken[] {
    const tokens: IToken[] = [];
    let position = 0;

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const token = this.parseToken(arg, position);
      tokens.push(token);
      position++;
    }

    return tokens;
  }

  /**
   * Parse a single argument into a token
   */
  private static parseToken(arg: string, position: number): IToken {
    // Separator (end of options)
    if (arg === '--') {
      return { type: TokenType.SEPARATOR, value: arg, position };
    }

    // Long option (--option or --option=value)
    if (arg.startsWith('--')) {
      return { type: TokenType.OPTION_LONG, value: arg, position };
    }

    // Short option(s) (-o or -abc)
    if (arg.startsWith('-') && arg.length > 1) {
      return { type: TokenType.OPTION_SHORT, value: arg, position };
    }

    // Regular value/command
    return { type: TokenType.VALUE, value: arg, position };
  }
}

/**
 * Command line argument parser
 * Converts tokenized arguments into structured data
 */
export class ArgumentParser {
  /**
   * Parse command line arguments
   */
  static parse(args: string[]): IParsedArgs {
    if (!args || args.length === 0) {
      return this.createEmptyResult();
    }

    const tokens = ArgumentTokenizer.tokenize(args);
    return this.parseTokens(tokens, args);
  }

  /**
   * Parse tokens into structured arguments
   */
  private static parseTokens(tokens: IToken[], rawArgs: string[]): IParsedArgs {
    const result: IParsedArgs = {
      command: '',
      subcommands: [],
      positionalArgs: [],
      options: {},
      flags: [],
      rawArgs
    };

    let i = 0;
    let foundSeparator = false;

    // Find command and subcommands first
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === TokenType.VALUE && !result.command) {
        result.command = token.value;
        i++;
        continue;
      }

      if (token.type === TokenType.VALUE && result.command && !this.isOption(token.value)) {
        result.subcommands.push(token.value);
        i++;
        continue;
      }

      break;
    }

    // Parse options and remaining arguments
    while (i < tokens.length) {
      const token = tokens[i];

      if (token.type === TokenType.SEPARATOR) {
        foundSeparator = true;
        i++;
        break;
      }

      if (token.type === TokenType.OPTION_LONG) {
        i = this.parseLongOption(tokens, i, result);
        continue;
      }

      if (token.type === TokenType.OPTION_SHORT) {
        i = this.parseShortOption(tokens, i, result);
        continue;
      }

      if (token.type === TokenType.VALUE) {
        result.positionalArgs.push(token.value);
      }

      i++;
    }

    // Everything after -- is positional
    while (i < tokens.length) {
      result.positionalArgs.push(tokens[i].value);
      i++;
    }

    return result;
  }

  /**
   * Parse long option (--option or --option=value)
   */
  private static parseLongOption(tokens: IToken[], index: number, result: IParsedArgs): number {
    const token = tokens[index];
    const optionText = token.value.slice(2); // Remove --

    // Handle --option=value format
    if (optionText.includes('=')) {
      const [key, ...valueParts] = optionText.split('=');
      const value = valueParts.join('=');
      result.options[key] = value;
      return index + 1;
    }

    // Handle --option value format
    const nextToken = tokens[index + 1];
    if (nextToken && nextToken.type === TokenType.VALUE) {
      result.options[optionText] = nextToken.value;
      return index + 2;
    }

    // Boolean flag
    result.options[optionText] = true;
    result.flags.push(optionText);
    return index + 1;
  }

  /**
   * Parse short option(s) (-o or -abc)
   */
  private static parseShortOption(tokens: IToken[], index: number, result: IParsedArgs): number {
    const token = tokens[index];
    const optionText = token.value.slice(1); // Remove -

    // Single short option with potential value
    if (optionText.length === 1) {
      const nextToken = tokens[index + 1];
      if (nextToken && nextToken.type === TokenType.VALUE) {
        result.options[optionText] = nextToken.value;
        return index + 2;
      }

      // Boolean flag
      result.options[optionText] = true;
      result.flags.push(optionText);
      return index + 1;
    }

    // Multiple short options (-abc = -a -b -c)
    for (const char of optionText) {
      result.options[char] = true;
      result.flags.push(char);
    }

    return index + 1;
  }

  /**
   * Check if a value looks like an option
   */
  private static isOption(value: string): boolean {
    return value.startsWith('-');
  }

  /**
   * Create empty parsing result
   */
  private static createEmptyResult(): IParsedArgs {
    return {
      command: '',
      subcommands: [],
      positionalArgs: [],
      options: {},
      flags: [],
      rawArgs: []
    };
  }
}
