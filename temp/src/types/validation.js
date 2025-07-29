"use strict";
/**
 * @fileoverview Validation types and interfaces for argument parsing and validation engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgumentType = void 0;
/**
 * Argument type definitions for enhanced parsing
 */
var ArgumentType;
(function (ArgumentType) {
    ArgumentType["STRING"] = "string";
    ArgumentType["NUMBER"] = "number";
    ArgumentType["BOOLEAN"] = "boolean";
    ArgumentType["ARRAY"] = "array";
    ArgumentType["FILE_PATH"] = "file-path";
    ArgumentType["DIRECTORY_PATH"] = "directory-path";
    ArgumentType["URL"] = "url";
    ArgumentType["EMAIL"] = "email";
    ArgumentType["JSON"] = "json";
    ArgumentType["ENUM"] = "enum";
})(ArgumentType || (exports.ArgumentType = ArgumentType = {}));
