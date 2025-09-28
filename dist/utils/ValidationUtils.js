"use strict";
/**
 * Validation utilities for input validation and data integrity
 * Single Responsibility: Centralized validation logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
class ValidationUtils {
    /**
     * Validates a URL string
     * @param url URL to validate
     * @throws Error if URL is invalid
     */
    static validateUrl(url) {
        if (!url || typeof url !== 'string' || url.trim().length === 0) {
            throw new Error('URL cannot be empty');
        }
        try {
            const parsedUrl = new URL(url);
            if (!['http:', 'https:', 'file:'].includes(parsedUrl.protocol)) {
                throw new Error('URL must use http, https, or file protocol');
            }
            if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname.startsWith('127.')) {
                console.warn('Warning: Processing localhost URLs may not be safe in production');
            }
        }
        catch (error) {
            if (error instanceof TypeError) {
                throw new Error(`Invalid URL format: ${url}`);
            }
            throw error;
        }
    }
    /**
     * Validates an array of URLs
     * @param urls URLs to validate
     * @returns Object with valid and invalid URLs
     */
    static validateUrls(urls) {
        if (!Array.isArray(urls)) {
            throw new Error('URLs must be an array');
        }
        const valid = [];
        const invalid = [];
        for (let i = 0; i < urls.length; i++) {
            try {
                this.validateUrl(urls[i]);
                valid.push(urls[i]);
            }
            catch (error) {
                invalid.push({
                    index: i,
                    value: urls[i],
                    error: error.message
                });
            }
        }
        return { valid, invalid };
    }
    /**
     * Validates file path for security
     * @param filePath File path to validate
     * @throws Error if path is unsafe
     */
    static validateFilePath(filePath) {
        if (!filePath || typeof filePath !== 'string' || filePath.trim().length === 0) {
            throw new Error('File path cannot be empty');
        }
        // Check for path traversal attempts
        const normalizedPath = filePath.replace(/\\/g, '/');
        if (normalizedPath.includes('../') || normalizedPath.includes('..\\')) {
            throw new Error('Path traversal not allowed');
        }
        // Check for absolute paths on non-Windows systems
        if (normalizedPath.startsWith('/') && process.platform !== 'win32') {
            console.warn('Warning: Absolute paths should be used carefully');
        }
        // Check for reserved names
        const fileName = normalizedPath.split('/').pop() || '';
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3',
            'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
            'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6',
            'LPT7', 'LPT8', 'LPT9'];
        if (reservedNames.includes(fileName.toUpperCase().split('.')[0])) {
            throw new Error(`Reserved file name: ${fileName}`);
        }
    }
    /**
     * Validates content size
     * @param size Content size in bytes
     * @param maxSize Maximum allowed size
     * @throws Error if size exceeds limit
     */
    static validateContentSize(size, maxSize) {
        if (typeof size !== 'number' || size < 0) {
            throw new Error('Content size must be a non-negative number');
        }
        if (typeof maxSize !== 'number' || maxSize <= 0) {
            throw new Error('Max size must be a positive number');
        }
        if (size > maxSize) {
            throw new Error(`Content size ${size} exceeds maximum allowed size ${maxSize}`);
        }
    }
    /**
     * Validates MIME type format
     * @param mimeType MIME type to validate
     * @throws Error if MIME type is invalid
     */
    static validateMimeType(mimeType) {
        if (!mimeType || typeof mimeType !== 'string') {
            throw new Error('MIME type cannot be empty');
        }
        const mimeTypeRegex = /^[a-zA-Z][a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/;
        if (!mimeTypeRegex.test(mimeType)) {
            throw new Error(`Invalid MIME type format: ${mimeType}`);
        }
    }
    /**
     * Validates configuration object structure
     * @param config Configuration to validate
     * @param schema Expected schema
     * @throws Error if configuration is invalid
     */
    static validateConfig(config, schema) {
        if (!config || typeof config !== 'object') {
            throw new Error('Configuration must be an object');
        }
        this.validateObjectSchema(config, schema, 'config');
    }
    /**
     * Validates an object against a schema
     * @param obj Object to validate
     * @param schema Schema to validate against
     * @param path Current validation path for error reporting
     */
    static validateObjectSchema(obj, schema, path) {
        // Check required fields
        for (const requiredField of schema.required || []) {
            if (!(requiredField in obj)) {
                throw new Error(`Missing required field: ${path}.${requiredField}`);
            }
        }
        // Validate each field
        for (const [fieldName, fieldValue] of Object.entries(obj)) {
            const fieldSchema = schema.properties?.[fieldName];
            if (!fieldSchema) {
                if (!schema.allowAdditionalProperties) {
                    throw new Error(`Unexpected field: ${path}.${fieldName}`);
                }
                continue;
            }
            const fieldPath = `${path}.${fieldName}`;
            this.validateFieldValue(fieldValue, fieldSchema, fieldPath);
        }
    }
    /**
     * Validates a field value against its schema
     * @param value Field value
     * @param schema Field schema
     * @param path Field path for error reporting
     */
    static validateFieldValue(value, schema, path) {
        // Type validation
        if (schema.type && typeof value !== schema.type) {
            throw new Error(`Invalid type for ${path}: expected ${schema.type}, got ${typeof value}`);
        }
        // String validations
        if (schema.type === 'string' && typeof value === 'string') {
            if (schema.minLength && value.length < schema.minLength) {
                throw new Error(`${path} must be at least ${schema.minLength} characters long`);
            }
            if (schema.maxLength && value.length > schema.maxLength) {
                throw new Error(`${path} must be at most ${schema.maxLength} characters long`);
            }
            if (schema.pattern && !schema.pattern.test(value)) {
                throw new Error(`${path} does not match required pattern`);
            }
        }
        // Number validations
        if (schema.type === 'number' && typeof value === 'number') {
            if (schema.min !== undefined && value < schema.min) {
                throw new Error(`${path} must be at least ${schema.min}`);
            }
            if (schema.max !== undefined && value > schema.max) {
                throw new Error(`${path} must be at most ${schema.max}`);
            }
        }
        // Array validations
        if (schema.type === 'array' && Array.isArray(value)) {
            if (schema.minItems && value.length < schema.minItems) {
                throw new Error(`${path} must have at least ${schema.minItems} items`);
            }
            if (schema.maxItems && value.length > schema.maxItems) {
                throw new Error(`${path} must have at most ${schema.maxItems} items`);
            }
            if (schema.itemSchema) {
                value.forEach((item, index) => {
                    this.validateFieldValue(item, schema.itemSchema, `${path}[${index}]`);
                });
            }
        }
        // Object validation (recursive)
        if (schema.type === 'object' && schema.objectSchema && typeof value === 'object' && value !== null) {
            this.validateObjectSchema(value, schema.objectSchema, path);
        }
        // Enum validation
        if (schema.enum && !schema.enum.includes(value)) {
            throw new Error(`${path} must be one of: ${schema.enum.join(', ')}`);
        }
    }
    /**
     * Sanitizes user input to prevent injection attacks
     * @param input Input string to sanitize
     * @returns Sanitized string
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') {
            return '';
        }
        return input
            .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
            .trim()
            .substring(0, 1000); // Limit length
    }
    /**
     * Validates email format
     * @param email Email to validate
     * @throws Error if email is invalid
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') {
            throw new Error('Email cannot be empty');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Invalid email format');
        }
    }
    /**
     * Validates that a value is within an array of allowed values
     * @param value Value to validate
     * @param allowedValues Array of allowed values
     * @param fieldName Field name for error reporting
     * @throws Error if value is not allowed
     */
    static validateEnum(value, allowedValues, fieldName) {
        if (!allowedValues.includes(value)) {
            throw new Error(`Invalid value for ${fieldName}: ${value}. Allowed values: ${allowedValues.join(', ')}`);
        }
    }
    /**
     * Checks if a value is empty (null, undefined, empty string, empty array)
     * @param value Value to check
     * @returns true if value is empty
     */
    static isEmpty(value) {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === 'string') {
            return value.trim().length === 0;
        }
        if (Array.isArray(value)) {
            return value.length === 0;
        }
        if (typeof value === 'object') {
            return Object.keys(value).length === 0;
        }
        return false;
    }
}
exports.ValidationUtils = ValidationUtils;
//# sourceMappingURL=ValidationUtils.js.map