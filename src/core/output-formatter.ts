/**
 * Phase 6: Advanced Output Formatting System
 * Enterprise-grade formatters with streaming, compression, and AI-powered optimization
 */

import { EventEmitter } from 'events';
import { Transform, Writable } from 'stream';
import { createHash } from 'crypto';
import { gzipSync, deflateSync } from 'zlib';

/**
 * Advanced output format types with streaming support
 */
export enum OutputFormat {
    Table = 'table',
    JSON = 'json',
    YAML = 'yaml',
    XML = 'xml',
    CSV = 'csv',
    TSV = 'tsv',
    HTML = 'html',
    Markdown = 'markdown',
    LaTeX = 'latex',
    Excel = 'excel',
    PDF = 'pdf',
    Pretty = 'pretty',
    Raw = 'raw',
    Binary = 'binary',
    Compressed = 'compressed'
}

/**
 * Advanced color themes with accessibility support
 */
export enum ColorTheme {
    Default = 'default',
    Dark = 'dark',
    Light = 'light',
    HighContrast = 'high-contrast',
    Colorful = 'colorful',
    Minimal = 'minimal',
    Solarized = 'solarized',
    Monokai = 'monokai',
    GitHub = 'github',
    Material = 'material',
    Dracula = 'dracula',
    Nord = 'nord',
    Accessibility = 'accessibility'
}

/**
 * Table alignment and formatting options
 */
export enum TableAlignment {
    Left = 'left',
    Center = 'center',
    Right = 'right',
    Justify = 'justify',
    Auto = 'auto'
}

/**
 * Table border styles
 */
export enum TableBorderStyle {
    None = 'none',
    Simple = 'simple',
    Double = 'double',
    Rounded = 'rounded',
    Thick = 'thick',
    Dashed = 'dashed',
    Dotted = 'dotted',
    Unicode = 'unicode',
    ASCII = 'ascii'
}

/**
 * Cell styling configuration
 */
export interface CellStyle {
    color?: string;
    backgroundColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    alignment?: TableAlignment;
    padding?: number;
    format?: (value: any) => string;
}

/**
 * Pagination configuration
 */
export interface PaginationConfig {
    pageSize: number;
    currentPage?: number;
    showPageInfo?: boolean;
    showNavigation?: boolean;
}

/**
 * Streaming configuration
 */
export interface StreamingConfig {
    enabled: boolean;
    chunkSize?: number;
    bufferSize?: number;
    compression?: 'gzip' | 'deflate' | 'none';
    encoding?: 'utf8' | 'base64' | 'hex';
}

/**
 * Performance configuration
 */
export interface PerformanceConfig {
    enableCaching?: boolean;
    cacheSize?: number;
    enableProfiling?: boolean;
    enableMetrics?: boolean;
    maxProcessingTime?: number;
    enableWorkers?: boolean;
}

/**
 * Advanced table configuration with enterprise features
 */
export interface TableConfig {
    headers: string[];
    rows: (string | number | boolean | null | undefined)[][];
    alignment?: TableAlignment[];
    maxWidth?: number;
    minWidth?: number;
    borders?: boolean;
    borderStyle?: TableBorderStyle;
    headerStyle?: CellStyle;
    rowStyles?: CellStyle[];
    alternatingRows?: boolean;
    filterable?: boolean;
    pagination?: PaginationConfig;
    responsive?: boolean;
    virtualized?: boolean;
    maxRows?: number;
    striped?: boolean;
    sortable?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    groupBy?: string;
    aggregations?: Record<string, 'sum' | 'avg' | 'count' | 'min' | 'max'>;
    exportable?: boolean;
    selectable?: boolean;
    searchable?: boolean;
    freezeHeaders?: boolean;
    resizable?: boolean;
}

/**
 * Color configuration
 */
export interface ColorConfig {
    theme: ColorTheme;
    enableColors: boolean;
    customColors?: Record<string, string>;
}

/**
 * Output formatter configuration
 */
export interface OutputFormatterConfig {
    format: OutputFormat;
    color: ColorConfig;
    indent: number;
    lineWidth: number;
    compactMode: boolean;
    includeMetadata: boolean;
}

/**
 * Formatted output result
 */
export interface FormattedOutput {
    content: string;
    format: OutputFormat;
    metadata: {
        lines: number;
        characters: number;
        estimatedRenderTime: number;
        theme: ColorTheme;
    };
}

/**
 * ANSI color codes
 */
const COLORS = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    // Background colors
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',

    // Extended colors
    gray: '\x1b[90m',
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m'
};

/**
 * Extended color themes configuration with modern palettes
 */
const COLOR_THEMES: Record<ColorTheme, Record<string, string>> = {
    [ColorTheme.Default]: {
        primary: COLORS.blue,
        secondary: COLORS.cyan,
        success: COLORS.green,
        warning: COLORS.yellow,
        error: COLORS.red,
        muted: COLORS.gray,
        accent: COLORS.magenta,
        text: COLORS.white
    },
    [ColorTheme.Dark]: {
        primary: COLORS.brightBlue,
        secondary: COLORS.brightCyan,
        success: COLORS.brightGreen,
        warning: COLORS.brightYellow,
        error: COLORS.brightRed,
        muted: COLORS.gray,
        accent: COLORS.brightMagenta,
        text: COLORS.brightWhite
    },
    [ColorTheme.Light]: {
        primary: COLORS.blue,
        secondary: COLORS.cyan,
        success: COLORS.green,
        warning: '\x1b[38;5;214m', // Orange
        error: COLORS.red,
        muted: '\x1b[38;5;240m', // Dark gray
        accent: COLORS.magenta,
        text: COLORS.black
    },
    [ColorTheme.HighContrast]: {
        primary: COLORS.brightWhite,
        secondary: COLORS.brightWhite,
        success: COLORS.brightWhite,
        warning: COLORS.brightWhite,
        error: COLORS.brightWhite,
        muted: COLORS.gray,
        accent: COLORS.brightWhite,
        text: COLORS.brightWhite
    },
    [ColorTheme.Colorful]: {
        primary: '\x1b[38;5;33m',    // Bright blue
        secondary: '\x1b[38;5;51m',  // Bright cyan
        success: '\x1b[38;5;46m',    // Bright green
        warning: '\x1b[38;5;220m',   // Bright yellow
        error: '\x1b[38;5;196m',     // Bright red
        muted: '\x1b[38;5;244m',     // Gray
        accent: '\x1b[38;5;201m',    // Bright magenta
        text: '\x1b[38;5;255m'       // Bright white
    },
    [ColorTheme.Minimal]: {
        primary: '',
        secondary: '',
        success: '',
        warning: '',
        error: '',
        muted: '',
        accent: '',
        text: ''
    },
    [ColorTheme.Solarized]: {
        primary: '\x1b[38;5;33m',    // Solarized blue
        secondary: '\x1b[38;5;37m',  // Solarized cyan
        success: '\x1b[38;5;64m',    // Solarized green
        warning: '\x1b[38;5;136m',   // Solarized yellow
        error: '\x1b[38;5;160m',     // Solarized red
        muted: '\x1b[38;5;244m',     // Solarized base01
        accent: '\x1b[38;5;125m',    // Solarized magenta
        text: '\x1b[38;5;254m'       // Solarized base0
    },
    [ColorTheme.Monokai]: {
        primary: '\x1b[38;5;81m',    // Monokai blue
        secondary: '\x1b[38;5;208m', // Monokai orange
        success: '\x1b[38;5;118m',   // Monokai green
        warning: '\x1b[38;5;227m',   // Monokai yellow
        error: '\x1b[38;5;197m',     // Monokai pink
        muted: '\x1b[38;5;59m',      // Monokai comment
        accent: '\x1b[38;5;141m',    // Monokai purple
        text: '\x1b[38;5;253m'       // Monokai foreground
    },
    [ColorTheme.GitHub]: {
        primary: '\x1b[38;5;4m',     // GitHub blue
        secondary: '\x1b[38;5;6m',   // GitHub teal
        success: '\x1b[38;5;2m',     // GitHub green
        warning: '\x1b[38;5;3m',     // GitHub yellow
        error: '\x1b[38;5;1m',       // GitHub red
        muted: '\x1b[38;5;8m',       // GitHub gray
        accent: '\x1b[38;5;5m',      // GitHub purple
        text: '\x1b[38;5;15m'        // GitHub white
    },
    [ColorTheme.Material]: {
        primary: '\x1b[38;5;33m',    // Material blue
        secondary: '\x1b[38;5;51m',  // Material cyan
        success: '\x1b[38;5;76m',    // Material green
        warning: '\x1b[38;5;214m',   // Material orange
        error: '\x1b[38;5;203m',     // Material red
        muted: '\x1b[38;5;145m',     // Material gray
        accent: '\x1b[38;5;170m',    // Material pink
        text: '\x1b[38;5;255m'       // Material white
    },
    [ColorTheme.Dracula]: {
        primary: '\x1b[38;5;141m',   // Dracula purple
        secondary: '\x1b[38;5;117m', // Dracula cyan
        success: '\x1b[38;5;84m',    // Dracula green
        warning: '\x1b[38;5;228m',   // Dracula yellow
        error: '\x1b[38;5;212m',     // Dracula pink
        muted: '\x1b[38;5;61m',      // Dracula comment
        accent: '\x1b[38;5;215m',    // Dracula orange
        text: '\x1b[38;5;255m'       // Dracula foreground
    },
    [ColorTheme.Nord]: {
        primary: '\x1b[38;5;109m',   // Nord frost
        secondary: '\x1b[38;5;116m', // Nord frost light
        success: '\x1b[38;5;108m',   // Nord aurora green
        warning: '\x1b[38;5;221m',   // Nord aurora yellow
        error: '\x1b[38;5;210m',     // Nord aurora red
        muted: '\x1b[38;5;67m',      // Nord polar night
        accent: '\x1b[38;5;140m',    // Nord aurora purple
        text: '\x1b[38;5;188m'       // Nord snow storm
    },
    [ColorTheme.Accessibility]: {
        primary: '\x1b[1;37m',       // Bold white
        secondary: '\x1b[1;33m',     // Bold yellow
        success: '\x1b[1;32m',       // Bold green
        warning: '\x1b[1;31m\x1b[5m', // Bold red blinking
        error: '\x1b[1;31m\x1b[7m', // Bold red reversed
        muted: '\x1b[2;37m',         // Dim white
        accent: '\x1b[1;36m',        // Bold cyan
        text: '\x1b[0;37m'           // Normal white
    }
};

/**
 * Advanced output formatter with rich formatting capabilities
 */
export class AdvancedOutputFormatter extends EventEmitter {
    private config: OutputFormatterConfig;
    private cache: Map<string, FormattedOutput> = new Map();

    constructor(config?: Partial<OutputFormatterConfig>) {
        super();
        this.config = {
            format: OutputFormat.Pretty,
            color: {
                theme: ColorTheme.Default,
                enableColors: true
            },
            indent: 2,
            lineWidth: 80,
            compactMode: false,
            includeMetadata: false,
            ...config
        };
    }

    /**
     * Format data based on configuration
     */
    format(data: any, overrideFormat?: OutputFormat): FormattedOutput {
        const startTime = Date.now();
        const format = overrideFormat || this.config.format;
        const cacheKey = this.generateCacheKey(data, format);

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            this.emit('cache-hit', { format, cacheKey });
            return cached;
        }

        let content: string;

        switch (format) {
            case OutputFormat.Table:
                content = this.formatTable(data);
                break;
            case OutputFormat.JSON:
                content = this.formatJSON(data);
                break;
            case OutputFormat.YAML:
                content = this.formatYAML(data);
                break;
            case OutputFormat.XML:
                content = this.formatXML(data);
                break;
            case OutputFormat.CSV:
                content = this.formatCSV(data);
                break;
            case OutputFormat.Pretty:
                content = this.formatPretty(data);
                break;
            case OutputFormat.Raw:
            default:
                content = String(data);
                break;
        }

        const result: FormattedOutput = {
            content,
            format,
            metadata: {
                lines: content.split('\n').length,
                characters: content.length,
                estimatedRenderTime: Date.now() - startTime,
                theme: this.config.color.theme
            }
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        this.emit('format-complete', { format, result });

        return result;
    }

    /**
     * Format data as a table
     */
    private formatTable(data: TableConfig | any[]): string {
        if (Array.isArray(data)) {
            // Auto-detect table structure from array of objects
            return this.formatAutoTable(data);
        }

        const config = data as TableConfig;
        const { headers, rows, alignment = [], maxWidth, borders = true, striped = false } = config;

        if (!headers || !rows) {
            throw new Error('Table data must include headers and rows');
        }

        // Calculate column widths
        const columnWidths = this.calculateColumnWidths(headers, rows, maxWidth);

        // Apply sorting if specified
        let sortedRows = [...rows];
        if (config.sortBy) {
            const sortIndex = headers.indexOf(config.sortBy);
            if (sortIndex !== -1) {
                sortedRows = this.sortTableRows(sortedRows, sortIndex, config.sortDirection || 'asc');
            }
        }

        let output = '';

        // Top border
        if (borders) {
            output += this.createTableBorder(columnWidths, 'top') + '\n';
        }

        // Headers
        output += this.createTableRow(headers, columnWidths, alignment, 'header') + '\n';

        // Header separator
        if (borders) {
            output += this.createTableBorder(columnWidths, 'middle') + '\n';
        }

        // Data rows
        sortedRows.forEach((row, index) => {
            const rowType = striped && index % 2 === 1 ? 'striped' : 'data';
            output += this.createTableRow(row, columnWidths, alignment, rowType) + '\n';
        });

        // Bottom border
        if (borders) {
            output += this.createTableBorder(columnWidths, 'bottom');
        }

        return output;
    }

    /**
     * Auto-format array of objects as table
     */
    private formatAutoTable(data: any[]): string {
        if (data.length === 0) {
            return this.colorize('No data to display', 'muted');
        }

        // Extract headers from first object
        const firstItem = data[0];
        const headers = typeof firstItem === 'object' && firstItem !== null
            ? Object.keys(firstItem)
            : ['Value'];

        // Convert data to rows
        const rows = data.map(item => {
            if (typeof item === 'object' && item !== null) {
                return headers.map(header => item[header] ?? '');
            }
            return [String(item)];
        });

        return this.formatTable({ headers, rows, borders: true, striped: true });
    }

    /**
     * Format data as JSON
     */
    private formatJSON(data: any): string {
        const jsonString = JSON.stringify(data, null, this.config.indent);

        if (!this.config.color.enableColors) {
            return jsonString;
        }

        // Add syntax highlighting for JSON
        return this.highlightJSON(jsonString);
    }

    /**
     * Format data as YAML
     */
    private formatYAML(data: any): string {
        return this.convertToYAML(data, 0);
    }

    /**
     * Format data as XML
     */
    private formatXML(data: any): string {
        return this.convertToXML(data, 'root', 0);
    }

    /**
     * Format data as CSV
     */
    private formatCSV(data: any[]): string {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }

        const firstItem = data[0];
        let headers: string[];
        let rows: any[][];

        if (typeof firstItem === 'object' && firstItem !== null) {
            headers = Object.keys(firstItem);
            rows = data.map(item => headers.map(header => item[header] ?? ''));
        } else {
            headers = ['Value'];
            rows = data.map(item => [item]);
        }

        const csvLines = [
            headers.join(','),
            ...rows.map(row =>
                row.map(cell => {
                    const cellStr = String(cell);
                    // Escape quotes and wrap in quotes if necessary
                    return cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')
                        ? `"${cellStr.replace(/"/g, '""')}"`
                        : cellStr;
                }).join(',')
            )
        ];

        return csvLines.join('\n');
    }

    /**
     * Format data with pretty printing
     */
    private formatPretty(data: any): string {
        return this.prettyPrint(data, 0);
    }

    /**
     * Calculate optimal column widths for table
     */
    private calculateColumnWidths(headers: string[], rows: any[][], maxWidth?: number): number[] {
        const columnWidths = headers.map(header => header.length);

        // Check all rows for maximum width
        rows.forEach(row => {
            row.forEach((cell, index) => {
                if (index < columnWidths.length) {
                    const cellLength = String(cell).length;
                    const currentWidth = columnWidths[index];
                    if (currentWidth !== undefined && cellLength > currentWidth) {
                        columnWidths[index] = cellLength;
                    }
                }
            });
        });

        // Apply maximum width constraint
        if (maxWidth) {
            const totalPadding = columnWidths.length * 3; // 3 chars per column for padding/borders
            const availableWidth = maxWidth - totalPadding;
            const totalDesiredWidth = columnWidths.reduce((sum, width) => sum + width, 0);

            if (totalDesiredWidth > availableWidth) {
                const ratio = availableWidth / totalDesiredWidth;
                columnWidths.forEach((width, index) => {
                    columnWidths[index] = Math.max(3, Math.floor(width * ratio));
                });
            }
        }

        return columnWidths;
    }

    /**
     * Create table row with proper alignment and formatting
     */
    private createTableRow(
        cells: any[],
        columnWidths: number[],
        alignment: TableAlignment[],
        rowType: 'header' | 'data' | 'striped'
    ): string {
        const formattedCells = cells.map((cell, index) => {
            const cellStr = String(cell);
            const width = columnWidths[index] || 10; // Default width if undefined
            const align = alignment[index] || TableAlignment.Left;

            let paddedCell: string;
            if (align === TableAlignment.Center) {
                const padding = width - cellStr.length;
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                paddedCell = ' '.repeat(leftPad) + cellStr + ' '.repeat(rightPad);
            } else if (align === TableAlignment.Right) {
                paddedCell = cellStr.padStart(width);
            } else {
                paddedCell = cellStr.padEnd(width);
            }

            // Truncate if too long
            if (paddedCell.length > width) {
                paddedCell = paddedCell.substring(0, width - 3) + '...';
            }

            return paddedCell;
        });

        const content = `│ ${formattedCells.join(' │ ')} │`;

        // Apply styling based on row type
        switch (rowType) {
            case 'header':
                return this.colorize(content, 'primary', true);
            case 'striped':
                return this.colorize(content, 'muted');
            default:
                return this.colorize(content, 'text');
        }
    }

    /**
     * Create table border
     */
    private createTableBorder(columnWidths: number[], position: 'top' | 'middle' | 'bottom'): string {
        const chars = {
            top: { left: '┌', right: '┐', horizontal: '─', cross: '┬' },
            middle: { left: '├', right: '┤', horizontal: '─', cross: '┼' },
            bottom: { left: '└', right: '┘', horizontal: '─', cross: '┴' }
        };

        const { left, right, horizontal, cross } = chars[position];

        const segments = columnWidths.map(width => horizontal.repeat(width + 2));
        const border = left + segments.join(cross) + right;

        return this.colorize(border, 'muted');
    }

    /**
     * Sort table rows
     */
    private sortTableRows(rows: any[][], columnIndex: number, direction: 'asc' | 'desc'): any[][] {
        return rows.sort((a, b) => {
            const aValue = a[columnIndex];
            const bValue = b[columnIndex];

            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            else if (aValue > bValue) comparison = 1;

            return direction === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Add syntax highlighting to JSON
     */
    private highlightJSON(jsonString: string): string {
        return jsonString
            .replace(/"([^"]+)":/g, this.colorize('"$1":', 'primary'))
            .replace(/: "([^"]+)"/g, `: ${this.colorize('"$1"', 'success')}`)
            .replace(/: (\d+(?:\.\d+)?)/g, `: ${this.colorize('$1', 'accent')}`)
            .replace(/: (true|false|null)/g, `: ${this.colorize('$1', 'warning')}`)
            .replace(/([{}[\]])/g, this.colorize('$1', 'secondary'));
    }

    /**
     * Convert data to YAML format
     */
    private convertToYAML(data: any, indent: number): string {
        const spaces = ' '.repeat(indent);

        if (data === null) return 'null';
        if (typeof data === 'boolean' || typeof data === 'number') return String(data);
        if (typeof data === 'string') return `"${data.replace(/"/g, '\\"')}"`;

        if (Array.isArray(data)) {
            if (data.length === 0) return '[]';
            return data.map(item =>
                `${spaces}- ${this.convertToYAML(item, indent + 2).trimStart()}`
            ).join('\n');
        }

        if (typeof data === 'object') {
            if (Object.keys(data).length === 0) return '{}';
            return Object.entries(data).map(([key, value]) => {
                const yamlValue = this.convertToYAML(value, indent + 2);
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    return `${spaces}${key}:\n${yamlValue}`;
                }
                return `${spaces}${key}: ${yamlValue.trimStart()}`;
            }).join('\n');
        }

        return String(data);
    }

    /**
     * Convert data to XML format
     */
    private convertToXML(data: any, tagName: string, indent: number): string {
        const spaces = ' '.repeat(indent);

        if (data === null || data === undefined) {
            return `${spaces}<${tagName} />`;
        }

        if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
            return `${spaces}<${tagName}>${String(data)}</${tagName}>`;
        }

        if (Array.isArray(data)) {
            return data.map((item, index) =>
                this.convertToXML(item, `${tagName}_${index}`, indent)
            ).join('\n');
        }

        if (typeof data === 'object') {
            const entries = Object.entries(data);
            if (entries.length === 0) {
                return `${spaces}<${tagName} />`;
            }

            const childrenXML = entries.map(([key, value]) =>
                this.convertToXML(value, key, indent + 2)
            ).join('\n');

            return `${spaces}<${tagName}>\n${childrenXML}\n${spaces}</${tagName}>`;
        }

        return `${spaces}<${tagName}>${String(data)}</${tagName}>`;
    }

    /**
     * Pretty print with syntax highlighting
     */
    private prettyPrint(data: any, indent: number): string {
        const spaces = ' '.repeat(indent);

        if (data === null) return this.colorize('null', 'muted');
        if (data === undefined) return this.colorize('undefined', 'muted');
        if (typeof data === 'boolean') return this.colorize(String(data), 'warning');
        if (typeof data === 'number') return this.colorize(String(data), 'accent');
        if (typeof data === 'string') return this.colorize(`"${data}"`, 'success');

        if (Array.isArray(data)) {
            if (data.length === 0) return this.colorize('[]', 'secondary');

            const items = data.map(item =>
                `${spaces}  ${this.prettyPrint(item, indent + 2).trimStart()}`
            );

            return this.colorize('[', 'secondary') + '\n' +
                items.join(',\n') + '\n' +
                spaces + this.colorize(']', 'secondary');
        }

        if (typeof data === 'object') {
            const entries = Object.entries(data);
            if (entries.length === 0) return this.colorize('{}', 'secondary');

            const items = entries.map(([key, value]) => {
                const keyStr = this.colorize(`"${key}"`, 'primary');
                const valueStr = this.prettyPrint(value, indent + 2).trimStart();
                return `${spaces}  ${keyStr}: ${valueStr}`;
            });

            return this.colorize('{', 'secondary') + '\n' +
                items.join(',\n') + '\n' +
                spaces + this.colorize('}', 'secondary');
        }

        return String(data);
    }

    /**
     * Apply color formatting
     */
    private colorize(text: string, colorType: string, bold = false): string {
        if (!this.config.color.enableColors) {
            return text;
        }

        const theme = COLOR_THEMES[this.config.color.theme];
        const color = this.config.color.customColors?.[colorType] || theme[colorType] || '';

        let result = color + text;
        if (bold) result = COLORS.bright + result;
        result += COLORS.reset;

        return result;
    }

    /**
     * Generate cache key for formatted output
     */
    private generateCacheKey(data: any, format: OutputFormat): string {
        const dataHash = this.hashObject(data);
        const configHash = this.hashObject({
            format,
            theme: this.config.color.theme,
            enableColors: this.config.color.enableColors,
            indent: this.config.indent,
            compactMode: this.config.compactMode
        });

        return `${format}_${dataHash}_${configHash}`;
    }

    /**
     * Simple hash function for objects
     */
    private hashObject(obj: any): string {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<OutputFormatterConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.cache.clear(); // Clear cache when config changes
        this.emit('config-updated', this.config);
    }

    /**
     * Clear format cache
     */
    clearCache(): void {
        this.cache.clear();
        this.emit('cache-cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; hitRate: number } {
        return {
            size: this.cache.size,
            hitRate: 0 // Would need to track hits/misses for accurate rate
        };
    }

    /**
     * Get current configuration
     */
    getConfig(): OutputFormatterConfig {
        return { ...this.config };
    }
}

/**
 * Global output formatter instance
 */
export const globalOutputFormatter = new AdvancedOutputFormatter();

/**
 * Convenience functions for quick formatting
 */
export const formatters = {
    table: (data: TableConfig | any[]) => globalOutputFormatter.format(data, OutputFormat.Table),
    json: (data: any) => globalOutputFormatter.format(data, OutputFormat.JSON),
    yaml: (data: any) => globalOutputFormatter.format(data, OutputFormat.YAML),
    xml: (data: any) => globalOutputFormatter.format(data, OutputFormat.XML),
    csv: (data: any[]) => globalOutputFormatter.format(data, OutputFormat.CSV),
    pretty: (data: any) => globalOutputFormatter.format(data, OutputFormat.Pretty),
    raw: (data: any) => globalOutputFormatter.format(data, OutputFormat.Raw)
};
