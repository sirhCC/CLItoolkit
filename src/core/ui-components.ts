/**
 * Phase 6: UI Components System
 * Box drawing, responsive layouts, and advanced CLI components
 */

import { EventEmitter } from 'events';

/**
 * Box drawing characters
 */
export const BOX_CHARS = {
    // Single line
    single: {
        horizontal: '─',
        vertical: '│',
        topLeft: '┌',
        topRight: '┐',
        bottomLeft: '└',
        bottomRight: '┘',
        cross: '┼',
        teeUp: '┴',
        teeDown: '┬',
        teeLeft: '┤',
        teeRight: '├'
    },
    // Double line
    double: {
        horizontal: '═',
        vertical: '║',
        topLeft: '╔',
        topRight: '╗',
        bottomLeft: '╚',
        bottomRight: '╝',
        cross: '╬',
        teeUp: '╩',
        teeDown: '╦',
        teeLeft: '╣',
        teeRight: '╠'
    },
    // Rounded
    rounded: {
        horizontal: '─',
        vertical: '│',
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        cross: '┼',
        teeUp: '┴',
        teeDown: '┬',
        teeLeft: '┤',
        teeRight: '├'
    },
    // Thick
    thick: {
        horizontal: '━',
        vertical: '┃',
        topLeft: '┏',
        topRight: '┓',
        bottomLeft: '┗',
        bottomRight: '┛',
        cross: '╋',
        teeUp: '┻',
        teeDown: '┳',
        teeLeft: '┫',
        teeRight: '┣'
    }
};

/**
 * Box style configuration
 */
export interface BoxStyle {
    borderStyle: keyof typeof BOX_CHARS;
    padding?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    margin?: {
        top?: number;
        right?: number;
        bottom?: number;
        left?: number;
    };
    background?: string;
    foreground?: string;
    borderColor?: string;
    width?: number | 'auto' | 'fill';
    height?: number | 'auto' | 'fill';
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
    direction?: 'horizontal' | 'vertical';
    wrap?: boolean;
    gap?: number;
    justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
    align?: 'start' | 'center' | 'end' | 'stretch';
    width?: number;
    height?: number;
}

/**
 * Component interface
 */
export interface UIComponent {
    type: string;
    render(width?: number, height?: number): string;
    getMinWidth(): number;
    getMinHeight(): number;
}

/**
 * Text component
 */
export class TextComponent implements UIComponent {
    type = 'text';
    
    constructor(
        private content: string,
        private style: Partial<BoxStyle> = {}
    ) {}

    render(width?: number, height?: number): string {
        let text = this.content;
        
        if (width && this.style.textAlign) {
            const lines = text.split('\n');
            text = lines.map(line => this.alignText(line, width, this.style.textAlign!)).join('\n');
        }
        
        if (height && this.style.verticalAlign) {
            text = this.alignVertically(text, height, this.style.verticalAlign);
        }
        
        if (this.style.foreground) {
            text = `${this.style.foreground}${text}\x1b[0m`;
        }
        
        return text;
    }

    private alignText(text: string, width: number, align: 'left' | 'center' | 'right'): string {
        const textLength = this.getDisplayLength(text);
        if (textLength >= width) return text;
        
        const padding = width - textLength;
        
        switch (align) {
            case 'center':
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
            case 'right':
                return ' '.repeat(padding) + text;
            default:
                return text + ' '.repeat(padding);
        }
    }

    private alignVertically(text: string, height: number, align: 'top' | 'middle' | 'bottom'): string {
        const lines = text.split('\n');
        if (lines.length >= height) return text;
        
        const padding = height - lines.length;
        
        switch (align) {
            case 'middle':
                const topPad = Math.floor(padding / 2);
                const bottomPad = padding - topPad;
                return '\n'.repeat(topPad) + text + '\n'.repeat(bottomPad);
            case 'bottom':
                return '\n'.repeat(padding) + text;
            default:
                return text + '\n'.repeat(padding);
        }
    }

    private getDisplayLength(text: string): number {
        // Remove ANSI escape sequences for length calculation
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    getMinWidth(): number {
        return Math.max(...this.content.split('\n').map(line => this.getDisplayLength(line)));
    }

    getMinHeight(): number {
        return this.content.split('\n').length;
    }
}

/**
 * Box component
 */
export class BoxComponent implements UIComponent {
    type = 'box';
    
    constructor(
        private child: UIComponent,
        private style: BoxStyle = { borderStyle: 'single' }
    ) {}

    render(width?: number, height?: number): string {
        const chars = BOX_CHARS[this.style.borderStyle];
        const padding = this.style.padding || {};
        const padTop = padding.top || 0;
        const padRight = padding.right || 0;
        const padBottom = padding.bottom || 0;
        const padLeft = padding.left || 0;
        
        // Calculate inner dimensions
        const innerWidth = width ? width - 2 - padLeft - padRight : undefined;
        const innerHeight = height ? height - 2 - padTop - padBottom : undefined;
        
        // Render child content
        const childContent = this.child.render(innerWidth, innerHeight);
        const childLines = childContent.split('\n');
        
        // Determine actual box dimensions
        const actualWidth = width || Math.max(...childLines.map(line => this.getDisplayLength(line))) + 2 + padLeft + padRight;
        
        const contentWidth = actualWidth - 2;
        let result = '';
        
        // Apply colors
        const borderColor = this.style.borderColor || '';
        const bgColor = this.style.background || '';
        const reset = '\x1b[0m';
        
        // Top border
        result += borderColor + chars.topLeft + chars.horizontal.repeat(contentWidth) + chars.topRight + reset + '\n';
        
        // Top padding
        for (let i = 0; i < padTop; i++) {
            result += borderColor + chars.vertical + reset + bgColor + ' '.repeat(contentWidth) + reset + borderColor + chars.vertical + reset + '\n';
        }
        
        // Content lines
        for (let i = 0; i < Math.max(childLines.length, innerHeight || 0); i++) {
            const line = childLines[i] || '';
            const paddedLine = ' '.repeat(padLeft) + this.padLine(line, contentWidth - padLeft - padRight) + ' '.repeat(padRight);
            result += borderColor + chars.vertical + reset + bgColor + paddedLine + reset + borderColor + chars.vertical + reset + '\n';
        }
        
        // Bottom padding
        for (let i = 0; i < padBottom; i++) {
            result += borderColor + chars.vertical + reset + bgColor + ' '.repeat(contentWidth) + reset + borderColor + chars.vertical + reset + '\n';
        }
        
        // Bottom border
        result += borderColor + chars.bottomLeft + chars.horizontal.repeat(contentWidth) + chars.bottomRight + reset;
        
        return result;
    }

    private padLine(line: string, width: number): string {
        const displayLength = this.getDisplayLength(line);
        if (displayLength >= width) return line;
        return line + ' '.repeat(width - displayLength);
    }

    private getDisplayLength(text: string): number {
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    getMinWidth(): number {
        const padding = this.style.padding || {};
        return this.child.getMinWidth() + 2 + (padding.left || 0) + (padding.right || 0);
    }

    getMinHeight(): number {
        const padding = this.style.padding || {};
        return this.child.getMinHeight() + 2 + (padding.top || 0) + (padding.bottom || 0);
    }
}

/**
 * Layout container component
 */
export class LayoutComponent implements UIComponent {
    type = 'layout';
    
    constructor(
        private children: UIComponent[],
        private config: LayoutConfig = {}
    ) {}

    render(width?: number, height?: number): string {
        if (this.children.length === 0) return '';
        
        const direction = this.config.direction || 'vertical';
        const gap = this.config.gap || 0;
        
        if (direction === 'horizontal') {
            return this.renderHorizontalLayout(width, height);
        } else {
            return this.renderVerticalLayout(width, height);
        }
    }

    private renderHorizontalLayout(width?: number, height?: number): string {
        const gap = this.config.gap || 0;
        const totalGaps = (this.children.length - 1) * gap;
        const availableWidth = width ? width - totalGaps : undefined;
        
        // Calculate child widths
        const childWidths = this.calculateChildWidths(availableWidth);
        
        // Render each child
        const renderedChildren = this.children.map((child, index) => 
            child.render(childWidths[index], height)
        );
        
        // Combine horizontally
        const maxHeight = Math.max(...renderedChildren.map(content => content.split('\n').length));
        const result: string[] = [];
        
        for (let row = 0; row < maxHeight; row++) {
            const rowParts: string[] = [];
            
            for (let col = 0; col < renderedChildren.length; col++) {
                const childLines = renderedChildren[col].split('\n');
                const line = childLines[row] || '';
                const paddedLine = this.padLine(line, childWidths[col]);
                rowParts.push(paddedLine);
            }
            
            result.push(rowParts.join(' '.repeat(gap)));
        }
        
        return result.join('\n');
    }

    private renderVerticalLayout(width?: number, _height?: number): string {
        const gap = this.config.gap || 0;
        const renderedChildren = this.children.map(child => child.render(width, undefined));
        
        return renderedChildren.join('\n'.repeat(gap + 1));
    }

    private calculateChildWidths(availableWidth?: number): number[] {
        if (!availableWidth) {
            return this.children.map(child => child.getMinWidth());
        }
        
        const minWidths = this.children.map(child => child.getMinWidth());
        const totalMinWidth = minWidths.reduce((sum, width) => sum + width, 0);
        
        if (totalMinWidth >= availableWidth) {
            return minWidths;
        }
        
        // Distribute extra space equally
        const extraSpace = availableWidth - totalMinWidth;
        const extraPerChild = Math.floor(extraSpace / this.children.length);
        
        return minWidths.map(width => width + extraPerChild);
    }

    private padLine(line: string, width: number): string {
        const displayLength = this.getDisplayLength(line);
        if (displayLength >= width) return line;
        return line + ' '.repeat(width - displayLength);
    }

    private getDisplayLength(text: string): number {
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    getMinWidth(): number {
        if (this.config.direction === 'horizontal') {
            const gap = this.config.gap || 0;
            const totalGaps = (this.children.length - 1) * gap;
            return this.children.reduce((sum, child) => sum + child.getMinWidth(), 0) + totalGaps;
        } else {
            return Math.max(...this.children.map(child => child.getMinWidth()));
        }
    }

    getMinHeight(): number {
        if (this.config.direction === 'horizontal') {
            return Math.max(...this.children.map(child => child.getMinHeight()));
        } else {
            const gap = this.config.gap || 0;
            const totalGaps = (this.children.length - 1) * gap;
            return this.children.reduce((sum, child) => sum + child.getMinHeight(), 0) + totalGaps;
        }
    }
}

/**
 * Table component
 */
export class TableComponent implements UIComponent {
    type = 'table';
    
    constructor(
        private headers: string[],
        private rows: string[][],
        private style: Partial<BoxStyle> = { borderStyle: 'single' }
    ) {}

    render(_width?: number, _height?: number): string {
        const chars = BOX_CHARS[this.style.borderStyle || 'single'];
        
        // Calculate column widths
        const columnWidths = this.calculateColumnWidths(_width);
        
        let result = '';
        
        // Top border
        result += chars.topLeft;
        result += columnWidths.map(width => chars.horizontal.repeat(width)).join(chars.teeDown);
        result += chars.topRight + '\n';
        
        // Header row
        result += chars.vertical;
        result += this.headers.map((header, index) => 
            this.padCell(header, columnWidths[index] || 0)
        ).join(chars.vertical);
        result += chars.vertical + '\n';
        
        // Header separator
        result += chars.teeRight;
        result += columnWidths.map(width => chars.horizontal.repeat(width)).join(chars.cross);
        result += chars.teeLeft + '\n';
        
        // Data rows
        for (const row of this.rows) {
            result += chars.vertical;
            result += row.map((cell, index) => 
                this.padCell(cell || '', columnWidths[index] || 0)
            ).join(chars.vertical);
            result += chars.vertical + '\n';
        }
        
        // Bottom border
        result += chars.bottomLeft;
        result += columnWidths.map(width => chars.horizontal.repeat(width)).join(chars.teeUp);
        result += chars.bottomRight;
        
        return result;
    }

    private calculateColumnWidths(totalWidth?: number): number[] {
        const allCells = [this.headers, ...this.rows];
        const columnCount = this.headers.length;
        
        // Calculate minimum width for each column
        const minWidths = [];
        for (let col = 0; col < columnCount; col++) {
            const columnCells = allCells.map(row => row[col] || '');
            minWidths.push(Math.max(...columnCells.map(cell => this.getDisplayLength(cell))));
        }
        
        if (!totalWidth) {
            return minWidths;
        }
        
        // Account for borders and separators
        const borderWidth = columnCount + 1;
        const availableWidth = totalWidth - borderWidth;
        const totalMinWidth = minWidths.reduce((sum, w) => sum + w, 0);
        
        if (totalMinWidth >= availableWidth) {
            return minWidths;
        }
        
        // Distribute extra space proportionally
        const extraSpace = availableWidth - totalMinWidth;
        return minWidths.map(width => {
            const proportion = width / totalMinWidth;
            return width + Math.floor(extraSpace * proportion);
        });
    }

    private padCell(content: string, width: number): string {
        const displayLength = this.getDisplayLength(content);
        if (displayLength >= width) {
            return content.substring(0, width);
        }
        return ` ${content}${' '.repeat(width - displayLength - 1)}`;
    }

    private getDisplayLength(text: string): number {
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    getMinWidth(): number {
        const allCells = [this.headers, ...this.rows];
        const columnCount = this.headers.length;
        let totalWidth = 0;
        
        for (let col = 0; col < columnCount; col++) {
            const columnCells = allCells.map(row => row[col] || '');
            totalWidth += Math.max(...columnCells.map(cell => this.getDisplayLength(cell)));
        }
        
        return totalWidth + columnCount + 1; // Add border width
    }

    getMinHeight(): number {
        return this.rows.length + 3; // Headers + separators + border
    }
}

/**
 * Advanced UI builder for complex layouts
 */
export class AdvancedUIBuilder extends EventEmitter {
    private components: Map<string, UIComponent> = new Map();
    private defaultStyle: BoxStyle = {
        borderStyle: 'single',
        padding: { top: 0, right: 1, bottom: 0, left: 1 }
    };

    constructor() {
        super();
    }

    /**
     * Create a text component
     */
    text(content: string, style?: Partial<BoxStyle>): TextComponent {
        const component = new TextComponent(content, style);
        this.emit('component-created', { type: 'text', content: content.substring(0, 50) + '...' });
        return component;
    }

    /**
     * Create a box component
     */
    box(child: UIComponent, style?: BoxStyle): BoxComponent {
        const boxStyle = { ...this.defaultStyle, ...style };
        const component = new BoxComponent(child, boxStyle);
        this.emit('component-created', { type: 'box', style: boxStyle.borderStyle });
        return component;
    }

    /**
     * Create a layout component
     */
    layout(children: UIComponent[], config?: LayoutConfig): LayoutComponent {
        const component = new LayoutComponent(children, config);
        this.emit('component-created', { type: 'layout', direction: config?.direction || 'vertical' });
        return component;
    }

    /**
     * Create a table component
     */
    table(headers: string[], rows: string[][], style?: Partial<BoxStyle>): TableComponent {
        const component = new TableComponent(headers, rows, style);
        this.emit('component-created', { type: 'table', rows: rows.length, columns: headers.length });
        return component;
    }

    /**
     * Create a horizontal layout
     */
    hstack(children: UIComponent[], gap: number = 0): LayoutComponent {
        return this.layout(children, { direction: 'horizontal', gap });
    }

    /**
     * Create a vertical layout
     */
    vstack(children: UIComponent[], gap: number = 0): LayoutComponent {
        return this.layout(children, { direction: 'vertical', gap });
    }

    /**
     * Create a panel with title
     */
    panel(title: string, content: UIComponent, style?: BoxStyle): BoxComponent {
        const titleComponent = this.text(title, { 
            textAlign: 'center',
            foreground: '\x1b[1m' // Bold
        });
        
        const panelContent = this.vstack([titleComponent, content], 1);
        
        return this.box(panelContent, {
            ...style,
            borderStyle: style?.borderStyle || 'double'
        });
    }

    /**
     * Create a card component
     */
    card(title: string, content: string, actions?: string[]): BoxComponent {
        const components: UIComponent[] = [];
        
        // Title
        components.push(this.text(title, { 
            textAlign: 'left',
            foreground: '\x1b[1;34m' // Bold blue
        }));
        
        // Content
        components.push(this.text(content));
        
        // Actions
        if (actions && actions.length > 0) {
            const actionComponents = actions.map(action => 
                this.text(`[${action}]`, { foreground: '\x1b[36m' })
            );
            components.push(this.hstack(actionComponents, 2));
        }
        
        const cardContent = this.vstack(components, 1);
        
        return this.box(cardContent, {
            borderStyle: 'rounded',
            padding: { top: 1, right: 2, bottom: 1, left: 2 }
        });
    }

    /**
     * Create a sidebar layout
     */
    sidebar(sidebar: UIComponent, main: UIComponent, _sidebarWidth?: number): LayoutComponent {
        return this.hstack([sidebar, main], 1);
    }

    /**
     * Create a header/footer layout
     */
    headerFooter(header: UIComponent, content: UIComponent, footer: UIComponent): LayoutComponent {
        return this.vstack([header, content, footer], 1);
    }

    /**
     * Register a component with an ID
     */
    register(id: string, component: UIComponent): void {
        this.components.set(id, component);
        this.emit('component-registered', { id, type: component.type });
    }

    /**
     * Get a registered component
     */
    get(id: string): UIComponent | undefined {
        return this.components.get(id);
    }

    /**
     * Set default style
     */
    setDefaultStyle(style: BoxStyle): void {
        this.defaultStyle = style;
        this.emit('default-style-changed', style);
    }

    /**
     * Render component to string
     */
    render(component: UIComponent, width?: number, height?: number): string {
        try {
            const result = component.render(width, height);
            this.emit('component-rendered', { 
                type: component.type, 
                width: width || component.getMinWidth(),
                height: height || component.getMinHeight()
            });
            return result;
        } catch (error) {
            this.emit('render-error', { error, component: component.type });
            throw new Error(`Component rendering failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get terminal size
     */
    getTerminalSize(): { width: number; height: number } {
        if (process.stdout.isTTY) {
            return {
                width: process.stdout.columns || 80,
                height: process.stdout.rows || 24
            };
        }
        return { width: 80, height: 24 };
    }

    /**
     * Create responsive component that adapts to terminal size
     */
    responsive(component: UIComponent): UIComponent {
        return {
            type: 'responsive',
            render: (width?: number, height?: number) => {
                const terminalSize = this.getTerminalSize();
                const actualWidth = width || terminalSize.width;
                const actualHeight = height || terminalSize.height;
                return component.render(actualWidth, actualHeight);
            },
            getMinWidth: () => component.getMinWidth(),
            getMinHeight: () => component.getMinHeight()
        };
    }
}

/**
 * Global UI builder instance
 */
export const globalUIBuilder = new AdvancedUIBuilder();

/**
 * Convenience functions for quick UI creation
 */
export const ui = {
    text: (content: string, style?: Partial<BoxStyle>) => 
        globalUIBuilder.text(content, style),
    
    box: (child: UIComponent, style?: BoxStyle) => 
        globalUIBuilder.box(child, style),
    
    layout: (children: UIComponent[], config?: LayoutConfig) => 
        globalUIBuilder.layout(children, config),
    
    table: (headers: string[], rows: string[][], style?: Partial<BoxStyle>) => 
        globalUIBuilder.table(headers, rows, style),
    
    hstack: (children: UIComponent[], gap?: number) => 
        globalUIBuilder.hstack(children, gap),
    
    vstack: (children: UIComponent[], gap?: number) => 
        globalUIBuilder.vstack(children, gap),
    
    panel: (title: string, content: UIComponent, style?: BoxStyle) => 
        globalUIBuilder.panel(title, content, style),
    
    card: (title: string, content: string, actions?: string[]) => 
        globalUIBuilder.card(title, content, actions),
    
    render: (component: UIComponent, width?: number, height?: number) => 
        globalUIBuilder.render(component, width, height),
    
    responsive: (component: UIComponent) => 
        globalUIBuilder.responsive(component)
};
