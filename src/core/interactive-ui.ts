/**
 * Phase 6: Interactive UI Components
 * Prompts, menus, progress indicators, and input validation
 */

import { EventEmitter } from 'events';
import * as readline from 'readline';

/**
 * Prompt types
 */
export enum PromptType {
    Input = 'input',
    Password = 'password',
    Confirm = 'confirm',
    Select = 'select',
    MultiSelect = 'multiselect',
    Autocomplete = 'autocomplete'
}

/**
 * Input validation function
 */
export type ValidationFunction = (input: string) => boolean | string;

/**
 * Choice for select prompts
 */
export interface Choice {
    name: string;
    value: any;
    description?: string;
    disabled?: boolean;
}

/**
 * Prompt configuration
 */
export interface PromptConfig {
    type: PromptType;
    message: string;
    default?: any;
    choices?: Choice[];
    validate?: ValidationFunction;
    mask?: string;
    maxAttempts?: number;
    pageSize?: number;
    suggestOnly?: boolean;
    caseSensitive?: boolean;
}

/**
 * Progress indicator types
 */
export enum ProgressType {
    Bar = 'bar',
    Spinner = 'spinner',
    Dots = 'dots',
    Pulse = 'pulse'
}

/**
 * Progress configuration
 */
export interface ProgressConfig {
    type: ProgressType;
    total?: number;
    current?: number;
    message?: string;
    showPercentage?: boolean;
    showETA?: boolean;
    width?: number;
    format?: string;
}

/**
 * Spinner frames
 */
const SPINNER_FRAMES = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    pipe: ['|', '/', '-', '\\'],
    bounce: ['⠁', '⠂', '⠄', '⠂'],
    clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
    moon: ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'],
    arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙']
};

/**
 * Color utilities for interactive components
 */
const UI_COLORS = {
    primary: '\x1b[36m',      // Cyan
    success: '\x1b[32m',      // Green
    warning: '\x1b[33m',      // Yellow
    error: '\x1b[31m',        // Red
    muted: '\x1b[90m',        // Gray
    highlight: '\x1b[44m',    // Blue background
    reset: '\x1b[0m'
};

/**
 * Interactive prompt system
 */
export class InteractivePrompts extends EventEmitter {
    private rl: readline.Interface | null = null;
    private currentPrompt: Promise<any> | null = null;

    constructor() {
        super();
    }

    /**
     * Create a prompt based on configuration
     */
    async prompt(config: PromptConfig): Promise<any> {
        if (this.currentPrompt) {
            throw new Error('Another prompt is currently active');
        }

        this.currentPrompt = this.executePrompt(config);
        
        try {
            const result = await this.currentPrompt;
            this.emit('prompt-completed', { config, result });
            return result;
        } finally {
            this.currentPrompt = null;
        }
    }

    /**
     * Execute specific prompt type
     */
    private async executePrompt(config: PromptConfig): Promise<any> {
        switch (config.type) {
            case PromptType.Input:
                return this.inputPrompt(config);
            case PromptType.Password:
                return this.passwordPrompt(config);
            case PromptType.Confirm:
                return this.confirmPrompt(config);
            case PromptType.Select:
                return this.selectPrompt(config);
            case PromptType.MultiSelect:
                return this.multiSelectPrompt(config);
            case PromptType.Autocomplete:
                return this.autocompletePrompt(config);
            default:
                throw new Error(`Unsupported prompt type: ${config.type}`);
        }
    }

    /**
     * Text input prompt
     */
    private async inputPrompt(config: PromptConfig): Promise<string> {
        return new Promise((resolve, reject) => {
            this.createReadlineInterface();
            
            const promptMessage = this.formatPromptMessage(config.message, config.default);
            
            this.rl!.question(promptMessage, async (input) => {
                const value = input.trim() || config.default || '';
                
                if (config.validate) {
                    const validation = config.validate(value);
                    if (validation !== true) {
                        console.log(UI_COLORS.error + (typeof validation === 'string' ? validation : 'Invalid input') + UI_COLORS.reset);
                        this.rl!.close();
                        try {
                            const result = await this.inputPrompt(config);
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                        return;
                    }
                }
                
                this.rl!.close();
                resolve(value);
            });
        });
    }

    /**
     * Password input prompt
     */
    private async passwordPrompt(config: PromptConfig): Promise<string> {
        return new Promise((resolve, reject) => {
            this.createReadlineInterface();
            
            // Set up stdin to not echo characters
            const stdin = process.stdin;
            stdin.setRawMode(true);
            
            let password = '';
            const promptMessage = this.formatPromptMessage(config.message);
            process.stdout.write(promptMessage);
            
            const onData = (buffer: Buffer) => {
                const char = buffer.toString();
                
                if (char === '\n' || char === '\r' || char === '\u0004') {
                    // Enter or Ctrl+D
                    stdin.setRawMode(false);
                    stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    
                    if (config.validate) {
                        const validation = config.validate(password);
                        if (validation !== true) {
                            console.log(UI_COLORS.error + (typeof validation === 'string' ? validation : 'Invalid password') + UI_COLORS.reset);
                            this.passwordPrompt(config).then(resolve).catch(reject);
                            return;
                        }
                    }
                    
                    this.rl!.close();
                    resolve(password);
                } else if (char === '\u0003') {
                    // Ctrl+C
                    stdin.setRawMode(false);
                    process.stdout.write('\n');
                    this.rl!.close();
                    reject(new Error('User cancelled'));
                } else if (char === '\u007f' || char === '\b') {
                    // Backspace
                    if (password.length > 0) {
                        password = password.slice(0, -1);
                        process.stdout.write('\b \b');
                    }
                } else if (char.charCodeAt(0) >= 32) {
                    // Printable character
                    password += char;
                    process.stdout.write(config.mask || '*');
                }
            };
            
            stdin.on('data', onData);
        });
    }

    /**
     * Confirmation prompt
     */
    private async confirmPrompt(config: PromptConfig): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.createReadlineInterface();
            
            const defaultValue = config.default !== undefined ? config.default : null;
            const promptMessage = this.formatPromptMessage(
                config.message, 
                defaultValue !== null ? (defaultValue ? 'Y/n' : 'y/N') : 'y/n'
            );
            
            this.rl!.question(promptMessage, (input) => {
                const value = input.trim().toLowerCase();
                
                let result: boolean;
                if (value === '') {
                    result = defaultValue !== null ? defaultValue : false;
                } else if (value === 'y' || value === 'yes') {
                    result = true;
                } else if (value === 'n' || value === 'no') {
                    result = false;
                } else {
                    console.log(UI_COLORS.error + 'Please answer yes or no (y/n)' + UI_COLORS.reset);
                    this.rl!.close();
                    this.confirmPrompt(config).then(resolve).catch(reject);
                    return;
                }
                
                this.rl!.close();
                resolve(result);
            });
        });
    }

    /**
     * Selection prompt
     */
    private async selectPrompt(config: PromptConfig): Promise<any> {
        if (!config.choices || config.choices.length === 0) {
            throw new Error('Select prompt requires choices');
        }

        return new Promise((resolve, reject) => {
            let selectedIndex = 0;
            const choices = config.choices!.filter(choice => !choice.disabled);
            
            const render = () => {
                console.clear();
                console.log(UI_COLORS.primary + config.message + UI_COLORS.reset);
                console.log();
                
                choices.forEach((choice, index) => {
                    const prefix = index === selectedIndex ? 
                        UI_COLORS.highlight + '❯ ' : '  ';
                    const suffix = index === selectedIndex ? UI_COLORS.reset : '';
                    
                    let line = `${prefix}${choice.name}${suffix}`;
                    if (choice.description) {
                        line += UI_COLORS.muted + ` - ${choice.description}` + UI_COLORS.reset;
                    }
                    
                    console.log(line);
                });
                
                console.log();
                console.log(UI_COLORS.muted + 'Use ↑↓ arrows to navigate, Enter to select, Ctrl+C to cancel' + UI_COLORS.reset);
            };
            
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            
            render();
            
            const onKeypress = (buffer: Buffer) => {
                const key = buffer.toString();
                
                switch (key) {
                    case '\u001b[A': // Up arrow
                        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : choices.length - 1;
                        render();
                        break;
                        
                    case '\u001b[B': // Down arrow
                        selectedIndex = selectedIndex < choices.length - 1 ? selectedIndex + 1 : 0;
                        render();
                        break;
                        
                    case '\n':
                    case '\r':
                        stdin.setRawMode(false);
                        stdin.removeListener('data', onKeypress);
                        console.clear();
                        const selectedChoice = choices[selectedIndex];
                        if (selectedChoice) {
                            resolve(selectedChoice.value);
                        } else {
                            reject(new Error('No valid selection'));
                        }
                        break;
                        
                    case '\u0003': // Ctrl+C
                        stdin.setRawMode(false);
                        stdin.removeListener('data', onKeypress);
                        console.clear();
                        reject(new Error('User cancelled'));
                        break;
                }
            };
            
            stdin.on('data', onKeypress);
        });
    }

    /**
     * Multi-selection prompt
     */
    private async multiSelectPrompt(config: PromptConfig): Promise<any[]> {
        if (!config.choices || config.choices.length === 0) {
            throw new Error('Multi-select prompt requires choices');
        }

        return new Promise((resolve, reject) => {
            let selectedIndex = 0;
            const choices = config.choices!.filter(choice => !choice.disabled);
            const selected = new Set<number>();
            
            const render = () => {
                console.clear();
                console.log(UI_COLORS.primary + config.message + UI_COLORS.reset);
                console.log();
                
                choices.forEach((choice, index) => {
                    const cursor = index === selectedIndex ? '❯ ' : '  ';
                    const checkbox = selected.has(index) ? 
                        UI_COLORS.success + '◉' + UI_COLORS.reset : '◯';
                    const highlight = index === selectedIndex ? UI_COLORS.highlight : '';
                    const reset = index === selectedIndex ? UI_COLORS.reset : '';
                    
                    let line = `${cursor}${checkbox} ${highlight}${choice.name}${reset}`;
                    if (choice.description) {
                        line += UI_COLORS.muted + ` - ${choice.description}` + UI_COLORS.reset;
                    }
                    
                    console.log(line);
                });
                
                console.log();
                console.log(UI_COLORS.muted + 'Use ↑↓ to navigate, Space to select, Enter to confirm, Ctrl+C to cancel' + UI_COLORS.reset);
                console.log(UI_COLORS.muted + `Selected: ${selected.size} items` + UI_COLORS.reset);
            };
            
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            
            render();
            
            const onKeypress = (buffer: Buffer) => {
                const key = buffer.toString();
                
                switch (key) {
                    case '\u001b[A': // Up arrow
                        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : choices.length - 1;
                        render();
                        break;
                        
                    case '\u001b[B': // Down arrow
                        selectedIndex = selectedIndex < choices.length - 1 ? selectedIndex + 1 : 0;
                        render();
                        break;
                        
                    case ' ': // Space
                        if (selected.has(selectedIndex)) {
                            selected.delete(selectedIndex);
                        } else {
                            selected.add(selectedIndex);
                        }
                        render();
                        break;
                        
                    case '\n':
                    case '\r':
                        stdin.setRawMode(false);
                        stdin.removeListener('data', onKeypress);
                        console.clear();
                        const selectedValues = Array.from(selected)
                            .map(index => choices[index])
                            .filter(choice => choice !== undefined)
                            .map(choice => choice.value);
                        resolve(selectedValues);
                        break;
                        
                    case '\u0003': // Ctrl+C
                        stdin.setRawMode(false);
                        stdin.removeListener('data', onKeypress);
                        console.clear();
                        reject(new Error('User cancelled'));
                        break;
                }
            };
            
            stdin.on('data', onKeypress);
        });
    }

    /**
     * Autocomplete prompt
     */
    private async autocompletePrompt(config: PromptConfig): Promise<string> {
        if (!config.choices || config.choices.length === 0) {
            throw new Error('Autocomplete prompt requires choices');
        }

        return new Promise((resolve, reject) => {
            this.createReadlineInterface();
            
            let input = '';
            let selectedIndex = 0;
            let suggestions: Choice[] = [];
            
            const updateSuggestions = () => {
                if (input.length === 0) {
                    suggestions = config.choices!.slice(0, config.pageSize || 10);
                } else {
                    const searchTerm = config.caseSensitive ? input : input.toLowerCase();
                    suggestions = config.choices!
                        .filter(choice => {
                            const choiceName = config.caseSensitive ? choice.name : choice.name.toLowerCase();
                            return choiceName.includes(searchTerm);
                        })
                        .slice(0, config.pageSize || 10);
                }
                selectedIndex = 0;
            };
            
            const render = () => {
                console.clear();
                console.log(UI_COLORS.primary + config.message + UI_COLORS.reset);
                console.log();
                console.log(`Input: ${input}${input.length === 0 ? UI_COLORS.muted + ' (type to search)' + UI_COLORS.reset : ''}`);
                console.log();
                
                if (suggestions.length > 0) {
                    console.log(UI_COLORS.muted + 'Suggestions:' + UI_COLORS.reset);
                    suggestions.forEach((choice, index) => {
                        const prefix = index === selectedIndex ? 
                            UI_COLORS.highlight + '❯ ' + UI_COLORS.reset : '  ';
                        console.log(`${prefix}${choice.name}`);
                    });
                } else if (input.length > 0) {
                    console.log(UI_COLORS.muted + 'No matching suggestions' + UI_COLORS.reset);
                }
                
                console.log();
                console.log(UI_COLORS.muted + 'Type to search, ↑↓ to navigate, Enter to select, Tab to complete, Ctrl+C to cancel' + UI_COLORS.reset);
            };
            
            updateSuggestions();
            render();
            
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            
            const onKeypress = (buffer: Buffer) => {
                const key = buffer.toString();
                
                if (key === '\u0003') { // Ctrl+C
                    stdin.setRawMode(false);
                    stdin.removeListener('data', onKeypress);
                    console.clear();
                    reject(new Error('User cancelled'));
                    return;
                }
                
                if (key === '\n' || key === '\r') { // Enter
                    stdin.setRawMode(false);
                    stdin.removeListener('data', onKeypress);
                    console.clear();
                    
                    if (suggestions.length > 0 && suggestions[selectedIndex]) {
                        resolve(suggestions[selectedIndex].value);
                    } else if (config.suggestOnly) {
                        console.log(UI_COLORS.error + 'Please select from the suggestions' + UI_COLORS.reset);
                        this.autocompletePrompt(config).then(resolve).catch(reject);
                    } else {
                        resolve(input);
                    }
                    return;
                }
                
                if (key === '\t') { // Tab - autocomplete
                    if (suggestions.length > 0 && suggestions[selectedIndex]) {
                        input = suggestions[selectedIndex].name;
                        updateSuggestions();
                        render();
                    }
                    return;
                }
                
                if (key === '\u001b[A') { // Up arrow
                    if (suggestions.length > 0) {
                        selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : suggestions.length - 1;
                        render();
                    }
                    return;
                }
                
                if (key === '\u001b[B') { // Down arrow
                    if (suggestions.length > 0) {
                        selectedIndex = selectedIndex < suggestions.length - 1 ? selectedIndex + 1 : 0;
                        render();
                    }
                    return;
                }
                
                if (key === '\u007f' || key === '\b') { // Backspace
                    if (input.length > 0) {
                        input = input.slice(0, -1);
                        updateSuggestions();
                        render();
                    }
                    return;
                }
                
                if (key.charCodeAt(0) >= 32) { // Printable character
                    input += key;
                    updateSuggestions();
                    render();
                }
            };
            
            stdin.on('data', onKeypress);
        });
    }

    /**
     * Format prompt message
     */
    private formatPromptMessage(message: string, defaultValue?: any): string {
        let formatted = UI_COLORS.primary + '? ' + UI_COLORS.reset + message;
        
        if (defaultValue !== undefined) {
            formatted += UI_COLORS.muted + ` (${defaultValue})` + UI_COLORS.reset;
        }
        
        formatted += UI_COLORS.primary + ' › ' + UI_COLORS.reset;
        return formatted;
    }

    /**
     * Create readline interface
     */
    private createReadlineInterface(): void {
        if (this.rl) {
            this.rl.close();
        }
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    /**
     * Cancel current prompt
     */
    cancel(): void {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
        this.emit('prompt-cancelled');
    }
}

/**
 * Progress indicator system
 */
export class ProgressIndicator extends EventEmitter {
    private config: ProgressConfig;
    private intervalId: NodeJS.Timeout | null = null;
    private frameIndex = 0;
    private startTime = 0;
    private isActive = false;

    constructor(config: ProgressConfig) {
        super();
        this.config = { 
            width: 40,
            showPercentage: true,
            showETA: true,
            ...config 
        };
    }

    /**
     * Start the progress indicator
     */
    start(): void {
        if (this.isActive) return;
        
        this.isActive = true;
        this.startTime = Date.now();
        this.frameIndex = 0;
        
        if (this.config.type === ProgressType.Spinner || 
            this.config.type === ProgressType.Dots || 
            this.config.type === ProgressType.Pulse) {
            this.intervalId = setInterval(() => {
                this.render();
                this.frameIndex++;
            }, 100);
        }
        
        this.render();
        this.emit('started');
    }

    /**
     * Update progress
     */
    update(current: number, message?: string): void {
        if (!this.isActive) return;
        
        this.config.current = current;
        if (message) {
            this.config.message = message;
        }
        
        this.render();
        this.emit('updated', { current, message });
    }

    /**
     * Stop the progress indicator
     */
    stop(message?: string): void {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Clear the line and show completion message
        process.stdout.write('\r\x1b[K');
        if (message) {
            console.log(UI_COLORS.success + '✓ ' + message + UI_COLORS.reset);
        }
        
        this.emit('stopped', { message });
    }

    /**
     * Render the progress indicator
     */
    private render(): void {
        if (!this.isActive) return;
        
        let output = '';
        
        switch (this.config.type) {
            case ProgressType.Bar:
                output = this.renderProgressBar();
                break;
            case ProgressType.Spinner:
                output = this.renderSpinner();
                break;
            case ProgressType.Dots:
                output = this.renderDots();
                break;
            case ProgressType.Pulse:
                output = this.renderPulse();
                break;
        }
        
        process.stdout.write('\r\x1b[K' + output);
    }

    /**
     * Render progress bar
     */
    private renderProgressBar(): string {
        const { total = 100, current = 0, width = 40, showPercentage, showETA } = this.config;
        
        const percentage = Math.min(100, Math.max(0, (current / total) * 100));
        const completed = Math.floor((percentage / 100) * width);
        const remaining = width - completed;
        
        const bar = UI_COLORS.success + '█'.repeat(completed) + UI_COLORS.reset + 
                   UI_COLORS.muted + '░'.repeat(remaining) + UI_COLORS.reset;
        
        let output = `[${bar}]`;
        
        if (showPercentage) {
            output += ` ${percentage.toFixed(1)}%`;
        }
        
        if (showETA && current > 0 && current < total) {
            const elapsed = Date.now() - this.startTime;
            const rate = current / elapsed;
            const remaining = total - current;
            const eta = remaining / rate;
            output += UI_COLORS.muted + ` ETA: ${this.formatTime(eta)}` + UI_COLORS.reset;
        }
        
        if (this.config.message) {
            output += ` ${this.config.message}`;
        }
        
        return output;
    }

    /**
     * Render spinner
     */
    private renderSpinner(): string {
        const frames = SPINNER_FRAMES.dots;
        const frame = frames[this.frameIndex % frames.length];
        
        let output = UI_COLORS.primary + frame + UI_COLORS.reset;
        
        if (this.config.message) {
            output += ` ${this.config.message}`;
        }
        
        return output;
    }

    /**
     * Render dots
     */
    private renderDots(): string {
        const maxDots = 3;
        const dotsCount = (this.frameIndex % (maxDots + 1));
        const dots = '.'.repeat(dotsCount);
        
        let output = this.config.message || 'Loading';
        output += UI_COLORS.primary + dots + UI_COLORS.reset;
        output += ' '.repeat(maxDots - dotsCount); // Maintain consistent width
        
        return output;
    }

    /**
     * Render pulse
     */
    private renderPulse(): string {
        const intensity = Math.sin(this.frameIndex * 0.2) * 0.5 + 0.5;
        const char = intensity > 0.7 ? '●' : intensity > 0.3 ? '◐' : '○';
        
        let output = UI_COLORS.primary + char + UI_COLORS.reset;
        
        if (this.config.message) {
            output += ` ${this.config.message}`;
        }
        
        return output;
    }

    /**
     * Format time in milliseconds to human readable
     */
    private formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ProgressConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.emit('config-updated', this.config);
    }
}

/**
 * Global interactive prompt instance
 */
export const globalPrompts = new InteractivePrompts();

/**
 * Convenience functions for quick prompts
 */
export const prompts = {
    input: (message: string, defaultValue?: string, validate?: ValidationFunction) => 
        globalPrompts.prompt({ type: PromptType.Input, message, default: defaultValue, validate }),
    
    password: (message: string, validate?: ValidationFunction) => 
        globalPrompts.prompt({ type: PromptType.Password, message, validate }),
    
    confirm: (message: string, defaultValue?: boolean) => 
        globalPrompts.prompt({ type: PromptType.Confirm, message, default: defaultValue }),
    
    select: (message: string, choices: Choice[]) => 
        globalPrompts.prompt({ type: PromptType.Select, message, choices }),
    
    multiSelect: (message: string, choices: Choice[]) => 
        globalPrompts.prompt({ type: PromptType.MultiSelect, message, choices }),
    
    autocomplete: (message: string, choices: Choice[], suggestOnly = false) => 
        globalPrompts.prompt({ type: PromptType.Autocomplete, message, choices, suggestOnly })
};
