"use strict";
/**
 * @fileoverview Enhanced argument parser with validation and type coercion
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgumentParser = void 0;
var zod_1 = require("zod");
var validation_1 = require("../types/validation");
/**
 * Enhanced argument parser with validation and type coercion
 */
var ArgumentParser = /** @class */ (function () {
    function ArgumentParser(config) {
        if (config === void 0) { config = {}; }
        this.arguments = [];
        this.options = [];
        this.subcommands = new Map();
        this.config = __assign({ stopAtPositional: false, allowInterspersed: true, addHelp: true, addVersion: false, caseSensitive: true, mode: 'strict' }, config);
        if (this.config.addHelp) {
            this.addHelpOption();
        }
        if (this.config.addVersion) {
            this.addVersionOption();
        }
    }
    /**
     * Add an argument definition
     */
    ArgumentParser.prototype.addArgument = function (argument) {
        this.arguments.push(argument);
        return this;
    };
    /**
     * Add an option definition
     */
    ArgumentParser.prototype.addOption = function (option) {
        this.options.push(option);
        return this;
    };
    /**
     * Add a subcommand
     */
    ArgumentParser.prototype.addSubcommand = function (subcommand) {
        this.subcommands.set(subcommand.name, subcommand);
        // Add aliases
        if (subcommand.aliases) {
            for (var _i = 0, _a = subcommand.aliases; _i < _a.length; _i++) {
                var alias = _a[_i];
                this.subcommands.set(alias, subcommand);
            }
        }
        return this;
    };
    /**
     * Parse command line arguments with validation
     */
    ArgumentParser.prototype.parse = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var result, potentialSubcommand, subcommandConfig, commandIndex, i, remainingArgs;
            return __generator(this, function (_a) {
                result = {
                    command: '',
                    arguments: {},
                    options: {},
                    positional: [],
                    unknown: [],
                    validation: { success: true, data: {}, errors: [], warnings: [] },
                    help: false,
                    version: false,
                };
                if (args.length === 0) {
                    return [2 /*return*/, result];
                }
                potentialSubcommand = args[0];
                if (!potentialSubcommand.startsWith('-') && this.subcommands.has(potentialSubcommand)) {
                    result.command = potentialSubcommand;
                    result.subcommand = potentialSubcommand;
                    subcommandConfig = this.subcommands.get(potentialSubcommand);
                    // Parse with subcommand's arguments and options
                    return [2 /*return*/, this.parseWithConfig(args.slice(1), result, subcommandConfig.arguments || [], subcommandConfig.options || [])];
                }
                // If first argument is not an option and we have argument definitions, treat it as positional
                if (!potentialSubcommand.startsWith('-') && this.arguments.length > 0) {
                    // Parse all arguments as regular arguments/options (no command)
                    return [2 /*return*/, this.parseWithConfig(args, result, this.arguments, this.options)];
                }
                // If first argument is an option or we have no argument definitions, treat first non-option as command
                if (potentialSubcommand.startsWith('-') || this.arguments.length === 0) {
                    commandIndex = -1;
                    for (i = 0; i < args.length; i++) {
                        if (!args[i].startsWith('-')) {
                            commandIndex = i;
                            break;
                        }
                    }
                    if (commandIndex >= 0) {
                        result.command = args[commandIndex];
                        remainingArgs = __spreadArray(__spreadArray([], args.slice(0, commandIndex), true), args.slice(commandIndex + 1), true);
                        return [2 /*return*/, this.parseWithConfig(remainingArgs, result, this.arguments, this.options)];
                    }
                }
                // Parse without command
                return [2 /*return*/, this.parseWithConfig(args, result, this.arguments, this.options)];
            });
        });
    };
    /**
     * Parse arguments with specific configuration
     */
    ArgumentParser.prototype.parseWithConfig = function (args, result, argumentDefs, optionDefs) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenized;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenized = this.tokenize(args);
                        // Set initial positional arguments
                        result.positional = __spreadArray([], tokenized.positional, true);
                        // Parse options first (this will update result.positional)
                        return [4 /*yield*/, this.parseOptions(tokenized.options, result, optionDefs)];
                    case 1:
                        // Parse options first (this will update result.positional)
                        _a.sent();
                        // Check for help/version flags
                        if (result.options.help || result.options.h) {
                            result.help = true;
                            return [2 /*return*/, result];
                        }
                        if (result.options.version || result.options.v) {
                            result.version = true;
                            return [2 /*return*/, result];
                        }
                        // Parse positional arguments (using the updated positional list)
                        return [4 /*yield*/, this.parseArguments([], result, argumentDefs)];
                    case 2:
                        // Parse positional arguments (using the updated positional list)
                        _a.sent();
                        // Store unknown options in permissive mode
                        if (this.config.mode === 'permissive') {
                            result.unknown = tokenized.unknown;
                        }
                        // Validate the complete result
                        return [4 /*yield*/, this.validateResult(result, argumentDefs, optionDefs)];
                    case 3:
                        // Validate the complete result
                        _a.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Tokenize arguments into options and positional arguments
     */
    ArgumentParser.prototype.tokenize = function (args) {
        var options = [];
        var positional = [];
        var unknown = [];
        var inOptions = true;
        var i = 0;
        while (i < args.length) {
            var arg = args[i];
            // Handle end-of-options marker
            if (arg === '--') {
                inOptions = false;
                i++;
                continue;
            }
            // Handle options
            if (inOptions && arg.startsWith('-')) {
                // Long option with equals
                if (arg.startsWith('--') && arg.includes('=')) {
                    options.push(arg);
                }
                // Long option without equals
                else if (arg.startsWith('--')) {
                    options.push(arg);
                    // The next argument will be handled separately during option parsing
                }
                // Short option(s)
                else if (arg.length > 1) {
                    var shortOptions = arg.slice(1);
                    // Handle combined short options (-abc)
                    if (shortOptions.length > 1) {
                        for (var _i = 0, shortOptions_1 = shortOptions; _i < shortOptions_1.length; _i++) {
                            var shortOpt = shortOptions_1[_i];
                            options.push("-".concat(shortOpt));
                        }
                    }
                    else {
                        options.push(arg);
                    }
                }
                // Stop at positional in strict mode
                if (this.config.stopAtPositional) {
                    inOptions = false;
                }
            }
            // Handle positional arguments
            else {
                positional.push(arg);
                // Stop parsing options after first positional if configured
                if (this.config.stopAtPositional) {
                    inOptions = false;
                }
            }
            i++;
        }
        return { options: options, positional: positional, unknown: unknown };
    };
    /**
     * Parse options and arguments from command line
     */
    ArgumentParser.prototype.parseOptions = function (optionTokens, result, optionDefs) {
        return __awaiter(this, void 0, void 0, function () {
            var allArgs, consumedIndices, i, arg, optionName, optionValue, consumed, _a, name_1, valueParts, optionDef, nextArg, shortOpts, j, shortOpt, shortOptDef, nextArg, k, optionDef, nextArg, optionDef, k, newPositional, i_1;
            return __generator(this, function (_b) {
                allArgs = __spreadArray(__spreadArray([], optionTokens, true), result.positional, true);
                consumedIndices = new Set();
                i = 0;
                while (i < allArgs.length) {
                    arg = allArgs[i];
                    if (!arg.startsWith('-')) {
                        i++;
                        continue;
                    }
                    optionName = '';
                    optionValue = void 0;
                    consumed = 1;
                    // Long option with equals (--option=value)
                    if (arg.startsWith('--') && arg.includes('=')) {
                        _a = arg.slice(2).split('='), name_1 = _a[0], valueParts = _a.slice(1);
                        optionName = name_1;
                        optionValue = valueParts.join('=');
                    }
                    // Long option (--option)
                    else if (arg.startsWith('--')) {
                        optionName = arg.slice(2);
                        optionDef = this.findOption(optionName);
                        if (optionDef && !this.isFlag(optionDef)) {
                            nextArg = allArgs[i + 1];
                            if (nextArg && !nextArg.startsWith('-')) {
                                optionValue = nextArg;
                                consumed = 2; // Consume both the option and its value
                            }
                        }
                    }
                    // Short option (-o)
                    else if (arg.startsWith('-') && arg.length > 1) {
                        shortOpts = arg.slice(1);
                        // Handle combined short options like -abc
                        if (shortOpts.length > 1) {
                            // Process each short option separately
                            for (j = 0; j < shortOpts.length; j++) {
                                shortOpt = shortOpts[j];
                                shortOptDef = this.findOptionByAlias(shortOpt);
                                if (shortOptDef) {
                                    if (this.isFlag(shortOptDef)) {
                                        result.options[shortOptDef.name] = true;
                                    }
                                    else if (j === shortOpts.length - 1) {
                                        nextArg = allArgs[i + 1];
                                        if (nextArg && !nextArg.startsWith('-')) {
                                            result.options[shortOptDef.name] = nextArg;
                                            consumed = 2;
                                        }
                                        else {
                                            result.options[shortOptDef.name] = true;
                                        }
                                    }
                                    else {
                                        result.options[shortOptDef.name] = true;
                                    }
                                }
                            }
                            // Mark indices as consumed
                            for (k = 0; k < consumed; k++) {
                                consumedIndices.add(i + k);
                            }
                            i += consumed;
                            continue;
                        }
                        else {
                            // Single short option
                            optionName = shortOpts;
                            optionDef = this.findOptionByAlias(optionName);
                            if (optionDef && !this.isFlag(optionDef)) {
                                nextArg = allArgs[i + 1];
                                if (nextArg && !nextArg.startsWith('-')) {
                                    optionValue = nextArg;
                                    consumed = 2;
                                }
                            }
                        }
                    }
                    // Process the option (only if not handled in combined short options above)
                    if (optionName) {
                        optionDef = this.findOption(optionName) || this.findOptionByAlias(optionName);
                        if (optionDef) {
                            if (optionDef.multiple) {
                                if (!result.options[optionDef.name]) {
                                    result.options[optionDef.name] = [];
                                }
                                if (optionValue !== undefined) {
                                    result.options[optionDef.name].push(optionValue);
                                }
                                else {
                                    result.options[optionDef.name].push(true);
                                }
                            }
                            else {
                                result.options[optionDef.name] = optionValue !== undefined ? optionValue : true;
                            }
                        }
                        else if (this.config.mode === 'strict') {
                            result.validation.errors.push({
                                path: ['options', optionName],
                                message: "Unknown option: ".concat(arg),
                                code: 'unknown_option',
                                received: arg,
                            });
                        }
                        else {
                            result.unknown.push(arg);
                            if (optionValue !== undefined && consumed === 2) {
                                result.unknown.push(optionValue);
                            }
                        }
                        // Mark consumed indices
                        for (k = 0; k < consumed; k++) {
                            consumedIndices.add(i + k);
                        }
                        i += consumed;
                    }
                    else {
                        i++;
                    }
                }
                newPositional = [];
                for (i_1 = 0; i_1 < allArgs.length; i_1++) {
                    if (!consumedIndices.has(i_1) && !allArgs[i_1].startsWith('-')) {
                        newPositional.push(allArgs[i_1]);
                    }
                }
                result.positional = newPositional;
                return [2 /*return*/];
            });
        });
    };
    /**
     * Check if an option is a boolean flag
     */
    ArgumentParser.prototype.isFlag = function (optionDef) {
        return optionDef.flag === true || optionDef.type === validation_1.ArgumentType.BOOLEAN;
    };
    /**
     * Parse positional arguments
     */
    ArgumentParser.prototype.parseArguments = function (positionalTokens, result, argumentDefs) {
        return __awaiter(this, void 0, void 0, function () {
            var positional, i, argDef;
            return __generator(this, function (_a) {
                positional = result.positional || positionalTokens;
                for (i = 0; i < argumentDefs.length; i++) {
                    argDef = argumentDefs[i];
                    if (argDef.multiple) {
                        // Take all remaining arguments
                        result.arguments[argDef.name] = positional.slice(i);
                        break;
                    }
                    else if (i < positional.length) {
                        result.arguments[argDef.name] = positional[i];
                    }
                    else if (argDef.required) {
                        result.validation.errors.push({
                            path: ['arguments', argDef.name],
                            message: "Missing required argument: ".concat(argDef.name),
                            code: 'missing_argument',
                            expected: argDef.type,
                        });
                    }
                    else if (argDef.defaultValue !== undefined) {
                        result.arguments[argDef.name] = argDef.defaultValue;
                    }
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Validate and transform the complete parsing result
     */
    ArgumentParser.prototype.validateResult = function (result, argumentDefs, optionDefs) {
        return __awaiter(this, void 0, void 0, function () {
            var context, _i, argumentDefs_1, argDef, _a, optionDefs_1, optDef;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        context = {
                            path: [],
                            rawInput: result,
                            parsedArgs: __assign(__assign({}, result.arguments), result.options),
                            command: result.command,
                            env: process.env,
                        };
                        _i = 0, argumentDefs_1 = argumentDefs;
                        _b.label = 1;
                    case 1:
                        if (!(_i < argumentDefs_1.length)) return [3 /*break*/, 4];
                        argDef = argumentDefs_1[_i];
                        return [4 /*yield*/, this.validateField(result.arguments, argDef, context, result.validation)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        _a = 0, optionDefs_1 = optionDefs;
                        _b.label = 5;
                    case 5:
                        if (!(_a < optionDefs_1.length)) return [3 /*break*/, 8];
                        optDef = optionDefs_1[_a];
                        return [4 /*yield*/, this.validateField(result.options, optDef, context, result.validation)];
                    case 6:
                        _b.sent();
                        _b.label = 7;
                    case 7:
                        _a++;
                        return [3 /*break*/, 5];
                    case 8:
                        // Check option conflicts and requirements
                        this.validateOptionConstraints(result, optionDefs);
                        result.validation.success = result.validation.errors.length === 0;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate a single field (argument or option)
     */
    ArgumentParser.prototype.validateField = function (container, fieldDef, context, validation) {
        return __awaiter(this, void 0, void 0, function () {
            var fieldContext, value, builtInResult, customResult;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        fieldContext = __assign(__assign({}, context), { path: __spreadArray(__spreadArray([], context.path, true), [fieldDef.name], false) });
                        value = container[fieldDef.name];
                        // Check environment variable
                        if (value === undefined && fieldDef.envVar && process.env[fieldDef.envVar]) {
                            value = process.env[fieldDef.envVar];
                        }
                        // Apply default value
                        if (value === undefined && fieldDef.defaultValue !== undefined) {
                            value = fieldDef.defaultValue;
                        }
                        // Check required fields
                        if (value === undefined && fieldDef.required) {
                            validation.errors.push({
                                path: fieldContext.path,
                                message: "Missing required ".concat(fieldDef.name),
                                code: 'required',
                                expected: fieldDef.type,
                            });
                            return [2 /*return*/];
                        }
                        if (value === undefined) {
                            return [2 /*return*/];
                        }
                        // Type coercion
                        if (fieldDef.coerce !== false) {
                            value = this.coerceType(value, fieldDef.type);
                        }
                        builtInResult = this.validateBuiltInType(value, fieldDef);
                        if (!builtInResult.success) {
                            (_a = validation.errors).push.apply(_a, builtInResult.errors.map(function (err) { return (__assign(__assign({}, err), { path: fieldContext.path })); }));
                        }
                        // Schema validation
                        if (fieldDef.schema) {
                            try {
                                value = fieldDef.schema.parse(value);
                            }
                            catch (error) {
                                if (error instanceof zod_1.z.ZodError) {
                                    (_b = validation.errors).push.apply(_b, error.issues.map(function (issue) { return ({
                                        path: __spreadArray(__spreadArray([], fieldContext.path, true), issue.path.map(String), true),
                                        message: issue.message,
                                        code: issue.code,
                                        expected: 'valid value',
                                        received: value,
                                    }); }));
                                }
                            }
                        }
                        if (!fieldDef.validator) return [3 /*break*/, 2];
                        return [4 /*yield*/, fieldDef.validator(value, fieldContext)];
                    case 1:
                        customResult = _e.sent();
                        if (!customResult.success) {
                            (_c = validation.errors).push.apply(_c, customResult.errors);
                        }
                        (_d = validation.warnings).push.apply(_d, customResult.warnings);
                        _e.label = 2;
                    case 2:
                        // Store validated value
                        container[fieldDef.name] = value;
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Validate option constraints (conflicts and requirements)
     */
    ArgumentParser.prototype.validateOptionConstraints = function (result, optionDefs) {
        for (var _i = 0, optionDefs_2 = optionDefs; _i < optionDefs_2.length; _i++) {
            var optDef = optionDefs_2[_i];
            if (result.options[optDef.name] === undefined)
                continue;
            // Check conflicts
            if (optDef.conflicts) {
                for (var _a = 0, _b = optDef.conflicts; _a < _b.length; _a++) {
                    var conflictName = _b[_a];
                    if (result.options[conflictName] !== undefined) {
                        result.validation.errors.push({
                            path: ['options', optDef.name],
                            message: "Option --".concat(optDef.name, " conflicts with --").concat(conflictName),
                            code: 'option_conflict',
                        });
                    }
                }
            }
            // Check requirements
            if (optDef.requires) {
                for (var _c = 0, _d = optDef.requires; _c < _d.length; _c++) {
                    var requiredName = _d[_c];
                    if (result.options[requiredName] === undefined) {
                        result.validation.errors.push({
                            path: ['options', optDef.name],
                            message: "Option --".concat(optDef.name, " requires --").concat(requiredName),
                            code: 'option_requirement',
                        });
                    }
                }
            }
        }
    };
    /**
     * Coerce value to specified type
     */
    ArgumentParser.prototype.coerceType = function (value, type) {
        if (value === undefined || value === null)
            return value;
        switch (type) {
            case validation_1.ArgumentType.NUMBER:
                var num = Number(value);
                return isNaN(num) ? value : num;
            case validation_1.ArgumentType.BOOLEAN:
                if (typeof value === 'boolean')
                    return value;
                if (typeof value === 'string') {
                    var lower = value.toLowerCase();
                    if (lower === 'true' || lower === '1' || lower === 'yes' || lower === 'on')
                        return true;
                    if (lower === 'false' || lower === '0' || lower === 'no' || lower === 'off')
                        return false;
                }
                return Boolean(value);
            case validation_1.ArgumentType.ARRAY:
                return Array.isArray(value) ? value : [value];
            case validation_1.ArgumentType.JSON:
                if (typeof value === 'string') {
                    try {
                        return JSON.parse(value);
                    }
                    catch (_a) {
                        return value;
                    }
                }
                return value;
            default:
                return String(value);
        }
    };
    /**
     * Validate built-in types
     */
    ArgumentParser.prototype.validateBuiltInType = function (value, fieldDef) {
        var errors = [];
        switch (fieldDef.type) {
            case validation_1.ArgumentType.NUMBER:
                if (typeof value !== 'number' || isNaN(value)) {
                    errors.push({
                        path: [],
                        message: 'Expected a number',
                        code: 'invalid_type',
                        expected: 'number',
                        received: typeof value,
                    });
                }
                else {
                    if (fieldDef.min !== undefined && value < fieldDef.min) {
                        errors.push({
                            path: [],
                            message: "Value must be at least ".concat(fieldDef.min),
                            code: 'too_small',
                            expected: ">= ".concat(fieldDef.min),
                            received: value,
                        });
                    }
                    if (fieldDef.max !== undefined && value > fieldDef.max) {
                        errors.push({
                            path: [],
                            message: "Value must be at most ".concat(fieldDef.max),
                            code: 'too_big',
                            expected: "<= ".concat(fieldDef.max),
                            received: value,
                        });
                    }
                }
                break;
            case validation_1.ArgumentType.STRING:
                if (typeof value !== 'string') {
                    errors.push({
                        path: [],
                        message: 'Expected a string',
                        code: 'invalid_type',
                        expected: 'string',
                        received: typeof value,
                    });
                }
                else {
                    if (fieldDef.min !== undefined && value.length < fieldDef.min) {
                        errors.push({
                            path: [],
                            message: "String must be at least ".concat(fieldDef.min, " characters"),
                            code: 'too_small',
                            expected: "length >= ".concat(fieldDef.min),
                            received: value.length,
                        });
                    }
                    if (fieldDef.max !== undefined && value.length > fieldDef.max) {
                        errors.push({
                            path: [],
                            message: "String must be at most ".concat(fieldDef.max, " characters"),
                            code: 'too_big',
                            expected: "length <= ".concat(fieldDef.max),
                            received: value.length,
                        });
                    }
                    if (fieldDef.pattern && !fieldDef.pattern.test(value)) {
                        errors.push({
                            path: [],
                            message: "String does not match required pattern",
                            code: 'invalid_string',
                            expected: fieldDef.pattern.toString(),
                            received: value,
                        });
                    }
                }
                break;
            case validation_1.ArgumentType.ENUM:
                if (fieldDef.choices && !fieldDef.choices.includes(String(value))) {
                    errors.push({
                        path: [],
                        message: "Value must be one of: ".concat(fieldDef.choices.join(', ')),
                        code: 'invalid_enum_value',
                        expected: fieldDef.choices,
                        received: value,
                    });
                }
                break;
            case validation_1.ArgumentType.EMAIL:
                var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (typeof value !== 'string' || !emailRegex.test(value)) {
                    errors.push({
                        path: [],
                        message: 'Invalid email address format',
                        code: 'invalid_email',
                        expected: 'valid email',
                        received: value,
                    });
                }
                break;
            case validation_1.ArgumentType.URL:
                try {
                    new URL(String(value));
                }
                catch (_a) {
                    errors.push({
                        path: [],
                        message: 'Invalid URL format',
                        code: 'invalid_url',
                        expected: 'valid URL',
                        received: value,
                    });
                }
                break;
        }
        return {
            success: errors.length === 0,
            data: value,
            errors: errors,
            warnings: [],
        };
    };
    /**
     * Find option by name
     */
    ArgumentParser.prototype.findOption = function (name) {
        var _this = this;
        return this.options.find(function (opt) {
            return _this.config.caseSensitive ? opt.name === name : opt.name.toLowerCase() === name.toLowerCase();
        });
    };
    /**
     * Find option by alias
     */
    ArgumentParser.prototype.findOptionByAlias = function (alias) {
        var _this = this;
        return this.options.find(function (opt) {
            return opt.alias && (_this.config.caseSensitive ? opt.alias === alias : opt.alias.toLowerCase() === alias.toLowerCase());
        });
    };
    /**
     * Add built-in help option
     */
    ArgumentParser.prototype.addHelpOption = function () {
        this.addOption({
            name: 'help',
            alias: 'h',
            description: 'Show help information',
            type: validation_1.ArgumentType.BOOLEAN,
            required: false,
            flag: true,
        });
    };
    /**
     * Add built-in version option
     */
    ArgumentParser.prototype.addVersionOption = function () {
        this.addOption({
            name: 'version',
            alias: 'v',
            description: 'Show version information',
            type: validation_1.ArgumentType.BOOLEAN,
            required: false,
            flag: true,
        });
    };
    return ArgumentParser;
}());
exports.ArgumentParser = ArgumentParser;
