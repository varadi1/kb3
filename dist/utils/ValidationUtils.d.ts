/**
 * Validation utilities for input validation and data integrity
 * Single Responsibility: Centralized validation logic
 */
export declare class ValidationUtils {
    /**
     * Validates a URL string
     * @param url URL to validate
     * @throws Error if URL is invalid
     */
    static validateUrl(url: string): void;
    /**
     * Validates an array of URLs
     * @param urls URLs to validate
     * @returns Object with valid and invalid URLs
     */
    static validateUrls(urls: string[]): ValidationResult<string[]>;
    /**
     * Validates file path for security
     * @param filePath File path to validate
     * @throws Error if path is unsafe
     */
    static validateFilePath(filePath: string): void;
    /**
     * Validates content size
     * @param size Content size in bytes
     * @param maxSize Maximum allowed size
     * @throws Error if size exceeds limit
     */
    static validateContentSize(size: number, maxSize: number): void;
    /**
     * Validates MIME type format
     * @param mimeType MIME type to validate
     * @throws Error if MIME type is invalid
     */
    static validateMimeType(mimeType: string): void;
    /**
     * Validates configuration object structure
     * @param config Configuration to validate
     * @param schema Expected schema
     * @throws Error if configuration is invalid
     */
    static validateConfig(config: any, schema: ConfigSchema): void;
    /**
     * Validates an object against a schema
     * @param obj Object to validate
     * @param schema Schema to validate against
     * @param path Current validation path for error reporting
     */
    private static validateObjectSchema;
    /**
     * Validates a field value against its schema
     * @param value Field value
     * @param schema Field schema
     * @param path Field path for error reporting
     */
    private static validateFieldValue;
    /**
     * Sanitizes user input to prevent injection attacks
     * @param input Input string to sanitize
     * @returns Sanitized string
     */
    static sanitizeInput(input: string): string;
    /**
     * Validates email format
     * @param email Email to validate
     * @throws Error if email is invalid
     */
    static validateEmail(email: string): void;
    /**
     * Validates that a value is within an array of allowed values
     * @param value Value to validate
     * @param allowedValues Array of allowed values
     * @param fieldName Field name for error reporting
     * @throws Error if value is not allowed
     */
    static validateEnum<T>(value: T, allowedValues: T[], fieldName: string): void;
    /**
     * Checks if a value is empty (null, undefined, empty string, empty array)
     * @param value Value to check
     * @returns true if value is empty
     */
    static isEmpty(value: any): boolean;
}
export interface ValidationResult<T> {
    valid: T;
    invalid: ValidationError[];
}
export interface ValidationError {
    index?: number;
    field?: string;
    value: any;
    error: string;
}
export interface ConfigSchema {
    required?: string[];
    properties?: Record<string, FieldSchema>;
    allowAdditionalProperties?: boolean;
}
export interface FieldSchema {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    min?: number;
    max?: number;
    minItems?: number;
    maxItems?: number;
    itemSchema?: FieldSchema;
    objectSchema?: ConfigSchema;
    enum?: any[];
}
//# sourceMappingURL=ValidationUtils.d.ts.map