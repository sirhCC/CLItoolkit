/**
 * Phase 6: Advanced Rich Text Rendering Engine
 /**
 * Advanced markdown, syntax highlighting, and multi-format document rendering
 */
 */

import { EventEmitter } from 'events';
import { Transform } from 'stream';
import { performance } from 'perf_hooks';

/**
 * Advanced syntax highlighting theme with extended properties
 */
;
    };
    fonts?: {
        monospace: string;
        serif: string;
        sansSerif: string;
    };
    accessibility?: {
        highContrast: boolean;
        colorBlindFriendly: boolean;
        screenReaderOptimized: boolean;
    };
}

/**
 * Enhanced markdown rendering options
 */

/**
 * Accessibility options for rich text
 */

/**
 * Advanced language support with semantic analysis
 */
;
        offSide?: boolean;
    };
}

/**
 * Document structure for advanced parsing
 */
;
}

/**
 * Rendering context with performance tracking
 */
;
    performance: {
        startTime: number;
        parseTime?: number;
        renderTime?: number;
        cacheHits: number;
        cacheMisses: number;
    };
    cache: Map<string, any>;
    variables: Record<string, any>;
    includes: string[];
    macros: Record<string, (args: any[]) => string>;
}

/**
 * Built-in syntax themes with modern color palettes
 */

    dark: {
        keyword: '\x1b[34m',      // Blue
        string: '\x1b[32m',       // Green
        number: '\x1b[33m',       // Yellow
        comment: '\x1b[90m',      // Gray
        operator: '\x1b[37m',     // White
        function: '\x1b[36m',     // Cyan
        variable: '\x1b[35m',     // Magenta
        type: '\x1b[31m',         // Red
        background: '\x1b[40m',   // Black background
        foreground: '\x1b[97m'    // Bright white
    },
    light: {
        keyword: '\x1b[94m',      // Bright blue
        string: '\x1b[92m',       // Bright green
        number: '\x1b[93m',       // Bright yellow
        comment: '\x1b[90m',      // Gray
        operator: '\x1b[30m',     // Black
        function: '\x1b[96m',     // Bright cyan
        variable: '\x1b[95m',     // Bright magenta
        type: '\x1b[91m',         // Bright red
        background: '\x1b[47m',   // White background
        foreground: '\x1b[30m'    // Black
    },
    monokai: {
        keyword: '\x1b[38;2;249;38;114m',    // Pink
        string: '\x1b[38;2;230;219;116m',    // Yellow
        number: '\x1b[38;2;174;129;255m',    // Purple
        comment: '\x1b[38;2;117;113;94m',    // Brown
        operator: '\x1b[38;2;248;248;242m',  // White
        function: '\x1b[38;2;166;226;46m',   // Green
        variable: '\x1b[38;2;248;248;242m',  // White
        type: '\x1b[38;2;102;217;239m',      // Cyan
        background: '\x1b[48;2;39;40;34m',   // Dark gray
        foreground: '\x1b[38;2;248;248;242m' // White
    }
};

/**
 * Language definitions for syntax highlighting
 */

    javascript: {
        name: 'JavaScript',
        keywords: [
            'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
            'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends',
            'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof',
            'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try',
            'typeof', 'var', 'void', 'while', 'with', 'yield'
        ],
        operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '=>'],
        stringDelimiters: ['"', "'", '`'],
        commentPatterns: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        numberPattern: /\b\d+(\.\d+)?\b/g
    },
    typescript: {
        name: 'TypeScript',
        keywords: [
            'abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case',
            'catch', 'class', 'const', 'continue', 'debugger', 'declare', 'default',
            'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
            'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in',
            'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace',
            'never', 'new', 'null', 'number', 'object', 'of', 'package', 'private',
            'protected', 'public', 'readonly', 'require', 'return', 'set', 'static',
            'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try',
            'type', 'typeof', 'undefined', 'union', 'unique', 'unknown', 'var',
            'void', 'while', 'with', 'yield'
        ],
        operators: ['+', '-', '*', '/', '%', '=', '==', '===', '!=', '!==', '<', '>', '<=', '>=', '&&', '||', '!', '?', ':', '=>', '|', '&'],
        stringDelimiters: ['"', "'", '`'],
        commentPatterns: [/\/\/.*$/gm, /\/\*[\s\S]*?\*\//g],
        numberPattern: /\b\d+(\.\d+)?\b/g
    },
    python: {
        name: 'Python',
        keywords: [
            'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
            'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
            'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
            'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
            'while', 'with', 'yield'
        ],
        operators: ['+', '-', '*', '/', '//', '%', '**', '=', '==', '!=', '<', '>', '<=', '>=', 'and', 'or', 'not', 'in', 'is'],
        stringDelimiters: ['"', "'"],
        commentPatterns: [/#.*$/gm],
        numberPattern: /\b\d+(\.\d+)?\b/g
    },
    json: {
        name: 'JSON',
        keywords: ['true', 'false', 'null'],
        operators: [':', ','],
        stringDelimiters: ['"'],
        commentPatterns: [],
        numberPattern: /\b-?\d+(\.\d+)?([eE][+-]?\d+)?\b/g
    },
    bash: {
        name: 'Bash',
        keywords: [
            'if', 'then', 'else', 'elif', 'fi', 'case', 'esac', 'for', 'while',
            'until', 'do', 'done', 'function', 'select', 'time', 'coproc',
            'echo', 'cd', 'ls', 'cat', 'grep', 'awk', 'sed', 'sort', 'uniq',
            'head', 'tail', 'find', 'xargs', 'chmod', 'chown', 'mkdir', 'rmdir',
            'rm', 'cp', 'mv', 'ln', 'tar', 'gzip', 'gunzip'
        ],
        operators: ['|', '&', '&&', '||', '>', '>>', '<', '<<', '='],
        stringDelimiters: ['"', "'"],
        commentPatterns: [/#.*$/gm],
        numberPattern: /\b\d+\b/g
    }
};

/**
 * Advanced rich text renderer with markdown and syntax highlighting
 */
export class AdvancedRichTextRenderer extends EventEmitter {
    private theme: SyntaxTheme = SYNTAX_THEMES.dark!;
    private languages: Record<string, LanguageSupport> = { ...LANGUAGE_DEFINITIONS };
    private options: MarkdownOptions = {
        colorize: true,
        width: 80,
        preserveWhitespace: false,
        enableCodeBlocks: true,
        enableTables: true,
        enableLists: true
    };

    constructor(options?: MarkdownOptions) {
        super();
        if (options) {
            this.options = { ...this.options, ...options };
        }
        if (options?.theme) {
            this.theme = options.theme;
        }
    }

    /**
     * Render markdown to colorized CLI output
     */
    renderMarkdown(markdown: string, options?: MarkdownOptions): string {
        const opts = { ...this.options, ...options };

        try {
            let result = markdown;

            if (opts.enableCodeBlocks) {
                result = this.renderCodeBlocks(result, opts);
            }

            if (opts.enableTables) {
                result = this.renderTables(result, opts);
            }

            if (opts.enableLists) {
                result = this.renderLists(result, opts);
            }

            // Render inline formatting
            result = this.renderInlineFormatting(result, opts);

            // Render headers
            result = this.renderHeaders(result, opts);

            // Render horizontal rules
            result = this.renderHorizontalRules(result, opts);

            // Render links
            result = this.renderLinks(result, opts);

            // Wrap to width if specified
            if (opts.width && opts.width > 0) {
                result = this.wrapToWidth(result, opts.width);
            }

            this.emit('markdown-rendered', { source: markdown.substring(0, 100) + '...' });
            return result;
        } catch (error) {
            this.emit('render-error', { error, source: markdown });
            throw new Error(`Markdown rendering failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Render code with syntax highlighting
     */
    renderCode(code: string, language: string = 'text', options?: { theme?: SyntaxTheme }): string {
        const theme = options?.theme || this.theme;

        if (language === 'text' || !this.languages[language]) {
            return code;
        }

        const lang = this.languages[language];
        let result = code;

        try {
            // Highlight comments first (so they don't interfere with other patterns)
            for (const commentPattern of lang.commentPatterns) {
                result = result.replace(commentPattern, match =>
                    `${theme.comment}${match}\x1b[0m`
                );
            }

            // Highlight strings
            for (const delimiter of lang.stringDelimiters) {
                const stringPattern = new RegExp(`${this.escapeRegExp(delimiter)}([^${this.escapeRegExp(delimiter)}]*?)${this.escapeRegExp(delimiter)}`, 'g');
                result = result.replace(stringPattern, match =>
                    `${theme.string}${match}\x1b[0m`
                );
            }

            // Highlight numbers
            result = result.replace(lang.numberPattern, match =>
                `${theme.number}${match}\x1b[0m`
            );

            // Highlight keywords
            for (const keyword of lang.keywords) {
                const keywordPattern = new RegExp(`\\b${this.escapeRegExp(keyword)}\\b`, 'g');
                result = result.replace(keywordPattern, match =>
                    `${theme.keyword}${match}\x1b[0m`
                );
            }

            // Highlight operators
            for (const operator of lang.operators) {
                const operatorPattern = new RegExp(this.escapeRegExp(operator), 'g');
                result = result.replace(operatorPattern, match =>
                    `${theme.operator}${match}\x1b[0m`
                );
            }

            this.emit('code-highlighted', { language, lines: code.split('\n').length });
            return result;
        } catch (error) {
            this.emit('highlight-error', { error, language, code });
            return code; // Return original code on error
        }
    }

    /**
     * Render code blocks with syntax highlighting
     */
    private renderCodeBlocks(content: string, options: MarkdownOptions): string {
        // Fenced code blocks (```)
        const fencedPattern = /```(\w+)?\n([\s\S]*?)```/g;
        content = content.replace(fencedPattern, (match, language, code) => {
            const highlighted = this.renderCode(code, language || 'text');
            const border = '─'.repeat(Math.min(options.width || 80, 60));
            return `\n${this.theme.comment}┌${border}┐\x1b[0m\n` +
                highlighted.split('\n').map(line =>
                    `${this.theme.comment}│\x1b[0m ${line.padEnd((options.width || 80) - 3)} ${this.theme.comment}│\x1b[0m`
                ).join('\n') +
                `\n${this.theme.comment}└${border}┘\x1b[0m\n`;
        });

        // Indented code blocks (4 spaces)
        const indentedPattern = /^( {4}|\t)(.*)$/gm;
        content = content.replace(indentedPattern, (match, indent, code) => {
            return `${this.theme.background}${this.theme.foreground}    ${code}\x1b[0m`;
        });

        return content;
    }

    /**
     * Render tables
     */
    private renderTables(content: string, _options: MarkdownOptions): string {
        const tablePattern = /^\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)*)/gm;

        return content.replace(tablePattern, (match, header, rows) => {
            const headerCells = header.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
            const rowData = rows.trim().split('\n').map((row: string) =>
                row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
            );

            const maxWidths = headerCells.map((_: string, index: number) => {
                const columnCells = [headerCells[index], ...rowData.map((row: string[]) => row[index] || '')];
                return Math.max(...columnCells.map(cell => cell.length));
            });

            let table = '';

            // Header
            table += '┌' + maxWidths.map((width: number) => '─'.repeat(width + 2)).join('┬') + '┐\n';
            table += '│' + headerCells.map((cell: string, index: number) =>
                ` ${this.theme.keyword}${cell.padEnd(maxWidths[index])}\x1b[0m `
            ).join('│') + '│\n';
            table += '├' + maxWidths.map((width: number) => '─'.repeat(width + 2)).join('┼') + '┤\n';

            // Rows
            for (const row of rowData) {
                table += '│' + row.map((cell: string, index: number) =>
                    ` ${cell.padEnd(maxWidths[index])} `
                ).join('│') + '│\n';
            }

            table += '└' + maxWidths.map((width: number) => '─'.repeat(width + 2)).join('┴') + '┘\n';

            return table;
        });
    }

    /**
     * Render lists
     */
    private renderLists(content: string, _options: MarkdownOptions): string {
        // Unordered lists
        content = content.replace(/^(\s*)[-*+]\s+(.+)$/gm, (match, indent, text) => {
            const bullet = `${this.theme.operator}•\x1b[0m`;
            return `${indent}${bullet} ${text}`;
        });

        // Ordered lists
        content = content.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (match, indent, number, text) => {
            const numberedBullet = `${this.theme.number}${number}.\x1b[0m`;
            return `${indent}${numberedBullet} ${text}`;
        });

        return content;
    }

    /**
     * Render inline formatting
     */
    private renderInlineFormatting(content: string, _options: MarkdownOptions): string {
        // Bold
        content = content.replace(/\*\*(.*?)\*\*/g, `\x1b[1m$1\x1b[0m`);

        // Italic
        content = content.replace(/\*(.*?)\*/g, `\x1b[3m$1\x1b[0m`);

        // Inline code
        content = content.replace(/`([^`]+)`/g,
            `${this.theme.background}${this.theme.string}$1\x1b[0m`
        );

        // Strikethrough
        content = content.replace(/~~(.*?)~~/g, `\x1b[9m$1\x1b[0m`);

        return content;
    }

    /**
     * Render headers
     */
    private renderHeaders(content: string, options: MarkdownOptions): string {
        content = content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
            const level = hashes.length;
            const colors = [
                this.theme.keyword,   // H1
                this.theme.function,  // H2
                this.theme.type,      // H3
                this.theme.variable,  // H4
                this.theme.string,    // H5
                this.theme.number     // H6
            ];

            const color = colors[level - 1] || this.theme.foreground;
            const underline = level <= 2 ? '\n' + '─'.repeat(Math.min(text.length, options.width || 80)) : '';

            return `${color}\x1b[1m${text}\x1b[0m${underline}`;
        });

        return content;
    }

    /**
     * Render horizontal rules
     */
    private renderHorizontalRules(content: string, options: MarkdownOptions): string {
        return content.replace(/^[-*_]{3,}$/gm,
            `${this.theme.comment}${'─'.repeat(options.width || 80)}\x1b[0m`
        );
    }

    /**
     * Render links
     */
    private renderLinks(content: string, _options: MarkdownOptions): string {
        // Markdown links [text](url)
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
            `${this.theme.function}$1\x1b[0m ${this.theme.comment}($2)\x1b[0m`
        );

        // Auto-links
        content = content.replace(/(https?:\/\/[^\s]+)/g,
            `${this.theme.function}\x1b[4m$1\x1b[0m`
        );

        return content;
    }

    /**
     * Wrap text to specified width
     */
    private wrapToWidth(text: string, width: number): string {
        return text.split('\n').map(line => {
            if (line.length <= width) return line;

            const words = line.split(' ');
            let result = '';
            let currentLine = '';

            for (const word of words) {
                if ((currentLine + word).length <= width) {
                    currentLine += (currentLine ? ' ' : '') + word;
                } else {
                    result += currentLine + '\n';
                    currentLine = word;
                }
            }

            if (currentLine) {
                result += currentLine;
            }

            return result;
        }).join('\n');
    }

    /**
     * Escape regular expression special characters
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Set theme
     */
    setTheme(theme: SyntaxTheme): void {
        this.theme = theme;
        this.emit('theme-changed', { theme });
    }

    /**
     * Register custom language
     */
    registerLanguage(name: string, definition: LanguageSupport): void {
        this.languages[name] = definition;
        this.emit('language-registered', { name });
    }

    /**
     * Get available themes
     */
    getAvailableThemes(): string[] {
        return Object.keys(SYNTAX_THEMES);
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages(): string[] {
        return Object.keys(this.languages);
    }

    /**
     * Create a custom theme
     */
    createTheme(name: string, theme: SyntaxTheme): void {
        SYNTAX_THEMES[name] = theme;
        this.emit('theme-created', { name });
    }
}

/**
 * Global rich text renderer instance
 */

/**
 * Convenience functions for quick rendering
 */

    markdown: (content: string, options?: MarkdownOptions) =>
        globalRichTextRenderer.renderMarkdown(content, options),

    code: (content: string, language?: string, options?: { theme?: SyntaxTheme }) =>
        globalRichTextRenderer.renderCode(content, language, options),

    setTheme: (theme: SyntaxTheme) =>
        globalRichTextRenderer.setTheme(theme),

    registerLanguage: (name: string, definition: LanguageSupport) =>
        globalRichTextRenderer.registerLanguage(name, definition)
};
