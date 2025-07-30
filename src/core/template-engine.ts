/**
 * Phase 6: Template System
 * Dynamic content generation with Handlebars-style templates
 */

import { EventEmitter } from 'events';

/**
 * Template compilation options
 */
export interface TemplateOptions {
    strict?: boolean;
    noEscape?: boolean;
    knownHelpers?: Record<string, boolean>;
    allowProtoProperties?: boolean;
    allowProtoMethods?: boolean;
    cache?: boolean;
}

/**
 * Template helper function
 */
export type TemplateHelper = (...args: any[]) => any;

/**
 * Template context data
 */
export interface TemplateContext {
    [key: string]: any;
}

/**
 * Compiled template function
 */
export type CompiledTemplate = (context: TemplateContext) => string;

/**
 * Template cache entry
 */
interface TemplateCacheEntry {
    template: CompiledTemplate;
    source: string;
    compiled: number;
    used: number;
    lastUsed: number;
}

/**
 * Built-in template helpers
 */
const BUILT_IN_HELPERS: Record<string, TemplateHelper> = {
    // Conditionals
    if: (condition: any, options: any) => {
        if (condition) {
            return options.fn ? options.fn() : '';
        }
        return options.inverse ? options.inverse() : '';
    },
    
    unless: (condition: any, options: any) => {
        if (!condition) {
            return options.fn ? options.fn() : '';
        }
        return options.inverse ? options.inverse() : '';
    },
    
    // Loops
    each: (context: any[], options: any) => {
        if (!Array.isArray(context)) return '';
        
        return context.map((item, index) => {
            const blockParams = {
                ...item,
                '@index': index,
                '@first': index === 0,
                '@last': index === context.length - 1
            };
            return options.fn ? options.fn(blockParams) : '';
        }).join('');
    },
    
    // Comparisons
    eq: (a: any, b: any) => a === b,
    ne: (a: any, b: any) => a !== b,
    lt: (a: any, b: any) => a < b,
    le: (a: any, b: any) => a <= b,
    gt: (a: any, b: any) => a > b,
    ge: (a: any, b: any) => a >= b,
    
    // String helpers
    capitalize: (str: string) => {
        if (typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },
    
    uppercase: (str: string) => {
        if (typeof str !== 'string') return '';
        return str.toUpperCase();
    },
    
    lowercase: (str: string) => {
        if (typeof str !== 'string') return '';
        return str.toLowerCase();
    },
    
    truncate: (str: string, length: number = 50) => {
        if (typeof str !== 'string') return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
    },
    
    // Formatting helpers
    json: (obj: any, indent: number = 2) => {
        try {
            return JSON.stringify(obj, null, indent);
        } catch {
            return '';
        }
    },
    
    formatNumber: (num: number, decimals: number = 2) => {
        if (typeof num !== 'number') return '';
        return num.toFixed(decimals);
    },
    
    formatDate: (date: Date | string | number, format: string = 'YYYY-MM-DD') => {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const replacements: Record<string, string> = {
            'YYYY': d.getFullYear().toString(),
            'YY': d.getFullYear().toString().slice(-2),
            'MM': (d.getMonth() + 1).toString().padStart(2, '0'),
            'M': (d.getMonth() + 1).toString(),
            'DD': d.getDate().toString().padStart(2, '0'),
            'D': d.getDate().toString(),
            'HH': d.getHours().toString().padStart(2, '0'),
            'H': d.getHours().toString(),
            'mm': d.getMinutes().toString().padStart(2, '0'),
            'm': d.getMinutes().toString(),
            'ss': d.getSeconds().toString().padStart(2, '0'),
            's': d.getSeconds().toString()
        };
        
        let result = format;
        for (const [pattern, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(pattern, 'g'), value);
        }
        
        return result;
    },
    
    // Array helpers
    length: (arr: any[]) => Array.isArray(arr) ? arr.length : 0,
    first: (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[0] : null,
    last: (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null,
    join: (arr: any[], separator: string = ', ') => Array.isArray(arr) ? arr.join(separator) : '',
    
    // Math helpers
    add: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number') ? a + b : 0,
    subtract: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number') ? a - b : 0,
    multiply: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number') ? a * b : 0,
    divide: (a: number, b: number) => (typeof a === 'number' && typeof b === 'number' && b !== 0) ? a / b : 0,
    
    // Utility helpers
    default: (value: any, defaultValue: any) => value != null ? value : defaultValue,
    
    // CLI-specific helpers
    colorize: (text: string, color: string) => {
        const colors: Record<string, string> = {
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m',
            gray: '\x1b[90m',
            reset: '\x1b[0m'
        };
        const colorCode = colors[color] || '';
        const resetCode = colors.reset;
        return `${colorCode}${text}${resetCode}`;
    },
    
    progress: (current: number, total: number, width: number = 20) => {
        if (typeof current !== 'number' || typeof total !== 'number' || total === 0) return '';
        
        const percentage = Math.min(100, Math.max(0, (current / total) * 100));
        const completed = Math.floor((percentage / 100) * width);
        const remaining = width - completed;
        
        return '[' + '█'.repeat(completed) + '░'.repeat(remaining) + '] ' + percentage.toFixed(1) + '%';
    }
};

/**
 * Advanced template engine with Handlebars-style syntax
 */
export class AdvancedTemplateEngine extends EventEmitter {
    private helpers: Record<string, TemplateHelper> = { ...BUILT_IN_HELPERS };
    private partials: Record<string, string> = {};
    private cache: Map<string, TemplateCacheEntry> = new Map();
    private options: TemplateOptions = {
        strict: false,
        noEscape: false,
        cache: true
    };

    constructor(options?: TemplateOptions) {
        super();
        if (options) {
            this.options = { ...this.options, ...options };
        }
    }

    /**
     * Compile a template from source
     */
    compile(source: string, options?: TemplateOptions): CompiledTemplate {
        const opts = { ...this.options, ...options };
        
        // Check cache first
        if (opts.cache) {
            const cached = this.cache.get(source);
            if (cached) {
                cached.used++;
                cached.lastUsed = Date.now();
                this.emit('cache-hit', { source: source.substring(0, 50) + '...' });
                return cached.template;
            }
        }

        try {
            const compiled = this.compileTemplate(source, opts);
            
            // Cache the compiled template
            if (opts.cache) {
                this.cache.set(source, {
                    template: compiled,
                    source,
                    compiled: Date.now(),
                    used: 1,
                    lastUsed: Date.now()
                });
            }
            
            this.emit('template-compiled', { source: source.substring(0, 50) + '...' });
            return compiled;
        } catch (error) {
            this.emit('compilation-error', { error, source });
            throw new Error(`Template compilation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Render a template with context
     */
    render(source: string, context: TemplateContext = {}, options?: TemplateOptions): string {
        const template = this.compile(source, options);
        
        try {
            const result = template(context);
            this.emit('template-rendered', { context, result: result.substring(0, 100) + '...' });
            return result;
        } catch (error) {
            this.emit('render-error', { error, context, source });
            throw new Error(`Template rendering failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Register a helper function
     */
    registerHelper(name: string, helper: TemplateHelper): void {
        this.helpers[name] = helper;
        this.emit('helper-registered', { name });
    }

    /**
     * Register multiple helpers
     */
    registerHelpers(helpers: Record<string, TemplateHelper>): void {
        Object.assign(this.helpers, helpers);
        this.emit('helpers-registered', { count: Object.keys(helpers).length });
    }

    /**
     * Register a partial template
     */
    registerPartial(name: string, source: string): void {
        this.partials[name] = source;
        this.emit('partial-registered', { name });
    }

    /**
     * Register multiple partials
     */
    registerPartials(partials: Record<string, string>): void {
        Object.assign(this.partials, partials);
        this.emit('partials-registered', { count: Object.keys(partials).length });
    }

    /**
     * Core template compilation logic
     */
    private compileTemplate(source: string, options: TemplateOptions): CompiledTemplate {
        // Tokenize the template
        const tokens = this.tokenize(source);
        
        // Parse tokens into an AST
        const ast = this.parse(tokens);
        
        // Generate the template function
        return this.generateFunction(ast, options);
    }

    /**
     * Tokenize template source
     */
    private tokenize(source: string): Token[] {
        const tokens: Token[] = [];
        let position = 0;
        
        const patterns = [
            { type: 'BLOCK_START', pattern: /\{\{\s*#(\w+)(?:\s+(.+?))?\s*\}\}/g },
            { type: 'BLOCK_END', pattern: /\{\{\s*\/(\w+)\s*\}\}/g },
            { type: 'VARIABLE', pattern: /\{\{\s*([^#\/\s][^}]*?)\s*\}\}/g },
            { type: 'PARTIAL', pattern: /\{\{\s*>\s*(\w+)(?:\s+(.+?))?\s*\}\}/g },
            { type: 'COMMENT', pattern: /\{\{\!--.*?--\}\}/g },
            { type: 'TEXT', pattern: /[^{]+/g }
        ];
        
        while (position < source.length) {
            let matched = false;
            
            for (const { type, pattern } of patterns) {
                pattern.lastIndex = position;
                const match = pattern.exec(source);
                
                if (match && match.index === position) {
                    if (type !== 'COMMENT') { // Skip comments
                        tokens.push({
                            type: type as TokenType,
                            value: match[0],
                            params: match.slice(1),
                            position
                        });
                    }
                    position = pattern.lastIndex;
                    matched = true;
                    break;
                }
            }
            
            if (!matched) {
                // Single character as text
                if (position < source.length) {
                    tokens.push({
                        type: 'TEXT',
                        value: source.charAt(position),
                        params: [],
                        position
                    });
                }
                position++;
            }
        }
        
        return tokens;
    }

    /**
     * Parse tokens into AST
     */
    private parse(tokens: Token[]): ASTNode[] {
        const ast: ASTNode[] = [];
        let position = 0;
        
        while (position < tokens.length) {
            const token = tokens[position];
            
            if (!token) {
                position++;
                continue;
            }
            
            switch (token.type) {
                case 'TEXT':
                    ast.push({
                        type: 'text',
                        content: token.value
                    });
                    break;
                    
                case 'VARIABLE':
                    ast.push({
                        type: 'variable',
                        name: token.params[0] || '',
                        filters: this.parseFilters(token.params[0] || '')
                    });
                    break;
                    
                case 'BLOCK_START':
                    const blockName = token.params[0];
                    if (!blockName) break;
                    
                    const blockParams = token.params[1] || '';
                    const blockEnd = this.findBlockEnd(tokens, position, blockName);
                    
                    if (blockEnd === -1) {
                        throw new Error(`Unclosed block: ${blockName}`);
                    }
                    
                    const blockContent = tokens.slice(position + 1, blockEnd);
                    ast.push({
                        type: 'block',
                        name: blockName,
                        params: this.parseParams(blockParams),
                        children: this.parse(blockContent)
                    });
                    
                    position = blockEnd;
                    break;
                    
                case 'PARTIAL':
                    ast.push({
                        type: 'partial',
                        name: token.params[0] || '',
                        context: token.params[1] || ''
                    });
                    break;
            }
            
            position++;
        }
        
        return ast;
    }

    /**
     * Generate template function from AST
     */
    private generateFunction(ast: ASTNode[], options: TemplateOptions): CompiledTemplate {
        return (context: TemplateContext) => {
            return this.renderNodes(ast, context, options);
        };
    }

    /**
     * Render AST nodes
     */
    private renderNodes(nodes: ASTNode[], context: TemplateContext, options: TemplateOptions): string {
        return nodes.map(node => this.renderNode(node, context, options)).join('');
    }

    /**
     * Render single AST node
     */
    private renderNode(node: ASTNode, context: TemplateContext, options: TemplateOptions): string {
        switch (node.type) {
            case 'text':
                return node.content || '';
                
            case 'variable':
                const value = this.resolveVariable(node.name || '', context);
                const filtered = this.applyFilters(value, node.filters || []);
                return options.noEscape ? String(filtered) : this.escapeHtml(String(filtered));
                
            case 'block':
                return this.renderBlock(node, context, options);
                
            case 'partial':
                return this.renderPartial(node, context, options);
                
            default:
                return '';
        }
    }

    /**
     * Render block helper
     */
    private renderBlock(node: ASTNode, context: TemplateContext, options: TemplateOptions): string {
        const helperName = node.name || '';
        const helper = this.helpers[helperName];
        
        if (!helper) {
            if (options.strict) {
                throw new Error(`Unknown helper: ${helperName}`);
            }
            return '';
        }
        
        const helperOptions = {
            fn: () => this.renderNodes(node.children || [], context, options),
            inverse: () => '', // TODO: Implement else blocks
            data: context
        };
        
        const params = (node.params || []).map(param => this.resolveVariable(param, context));
        return String(helper(...params, helperOptions));
    }

    /**
     * Render partial template
     */
    private renderPartial(node: ASTNode, context: TemplateContext, options: TemplateOptions): string {
        const partialName = node.name || '';
        const partialSource = this.partials[partialName];
        
        if (!partialSource) {
            if (options.strict) {
                throw new Error(`Unknown partial: ${partialName}`);
            }
            return '';
        }
        
        // Parse partial context if provided
        let partialContext = context;
        if (node.context) {
            const contextValue = this.resolveVariable(node.context, context);
            if (typeof contextValue === 'object' && contextValue !== null) {
                partialContext = { ...context, ...contextValue };
            }
        }
        
        return this.render(partialSource, partialContext, options);
    }

    /**
     * Resolve variable from context
     */
    private resolveVariable(path: string, context: TemplateContext): any {
        if (!path) return undefined;
        
        // Handle special variables
        if (path === 'this' || path === '.') {
            return context;
        }
        
        const parts = path.split('.');
        let current = context;
        
        for (const part of parts) {
            if (current == null) return undefined;
            current = current[part];
        }
        
        return current;
    }

    /**
     * Parse filters from variable expression
     */
    private parseFilters(expression: string): Filter[] {
        const filters: Filter[] = [];
        const parts = expression.split('|');
        
        if (parts.length > 1) {
            for (let i = 1; i < parts.length; i++) {
                const filterPart = parts[i];
                if (filterPart) {
                    const trimmed = filterPart.trim();
                    const [name, ...args] = trimmed.split(/\s+/);
                    if (name) {
                        filters.push({ name, args });
                    }
                }
            }
        }
        
        return filters;
    }

    /**
     * Apply filters to value
     */
    private applyFilters(value: any, filters: Filter[]): any {
        let result = value;
        
        for (const filter of filters) {
            const helper = this.helpers[filter.name];
            if (helper) {
                result = helper(result, ...filter.args);
            }
        }
        
        return result;
    }

    /**
     * Parse helper parameters
     */
    private parseParams(paramString: string): string[] {
        if (!paramString.trim()) return [];
        
        // Simple parameter parsing - can be enhanced for complex expressions
        return paramString.split(/\s+/).filter(param => param.length > 0);
    }

    /**
     * Find matching block end
     */
    private findBlockEnd(tokens: Token[], startPosition: number, blockName: string): number {
        let depth = 1;
        
        for (let i = startPosition + 1; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (!token) continue;
            
            if (token.type === 'BLOCK_START' && token.params[0] === blockName) {
                depth++;
            } else if (token.type === 'BLOCK_END' && token.params[0] === blockName) {
                depth--;
                if (depth === 0) {
                    return i;
                }
            }
        }
        
        return -1;
    }

    /**
     * Escape HTML characters
     */
    private escapeHtml(text: string): string {
        const map: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        
        return text.replace(/[&<>"']/g, match => map[match] || match);
    }

    /**
     * Clear template cache
     */
    clearCache(): void {
        this.cache.clear();
        this.emit('cache-cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; totalUsage: number; averageUsage: number } {
        const entries = Array.from(this.cache.values());
        const totalUsage = entries.reduce((sum, entry) => sum + entry.used, 0);
        
        return {
            size: this.cache.size,
            totalUsage,
            averageUsage: entries.length > 0 ? totalUsage / entries.length : 0
        };
    }

    /**
     * Get registered helpers
     */
    getHelpers(): string[] {
        return Object.keys(this.helpers);
    }

    /**
     * Get registered partials
     */
    getPartials(): string[] {
        return Object.keys(this.partials);
    }
}

/**
 * Token types for template parsing
 */
type TokenType = 'TEXT' | 'VARIABLE' | 'BLOCK_START' | 'BLOCK_END' | 'PARTIAL' | 'COMMENT';

/**
 * Token structure
 */
interface Token {
    type: TokenType;
    value: string;
    params: string[];
    position: number;
}

/**
 * AST node types
 */
interface ASTNode {
    type: 'text' | 'variable' | 'block' | 'partial';
    content?: string;
    name?: string;
    params?: string[];
    filters?: Filter[];
    context?: string;
    children?: ASTNode[];
}

/**
 * Filter structure
 */
interface Filter {
    name: string;
    args: string[];
}

/**
 * Global template engine instance
 */
export const globalTemplateEngine = new AdvancedTemplateEngine();

/**
 * Convenience functions for quick templating
 */
export const templates = {
    render: (source: string, context?: TemplateContext) => 
        globalTemplateEngine.render(source, context),
    
    compile: (source: string) => 
        globalTemplateEngine.compile(source),
    
    registerHelper: (name: string, helper: TemplateHelper) => 
        globalTemplateEngine.registerHelper(name, helper),
    
    registerPartial: (name: string, source: string) => 
        globalTemplateEngine.registerPartial(name, source)
};
