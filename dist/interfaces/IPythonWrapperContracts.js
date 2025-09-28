"use strict";
/**
 * Contract definitions for Python wrapper outputs
 * These interfaces define the expected structure of data returned by Python wrappers
 * Single Responsibility: Define contracts between Python and TypeScript layers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractValidatorFactory = exports.DeepDoctectionContractValidator = exports.Crawl4AIContractValidator = exports.DoclingContractValidator = exports.BaseContractValidator = void 0;
/**
 * Base contract validator implementation
 */
class BaseContractValidator {
    errors = [];
    warnings = [];
    getErrors() {
        return [...this.errors];
    }
    getWarnings() {
        return [...this.warnings];
    }
    reset() {
        this.errors = [];
        this.warnings = [];
    }
    checkRequired(obj, field, type) {
        if (!(field in obj)) {
            this.errors.push(`Missing required field: ${field}`);
            return false;
        }
        if (type && typeof obj[field] !== type) {
            this.errors.push(`Field ${field} should be ${type}, got ${typeof obj[field]}`);
            return false;
        }
        return true;
    }
    checkOptional(obj, field, type) {
        if (field in obj && type && typeof obj[field] !== type) {
            this.warnings.push(`Field ${field} should be ${type}, got ${typeof obj[field]}`);
            return false;
        }
        return true;
    }
    checkArray(obj, field, required = false) {
        if (required && !(field in obj)) {
            this.errors.push(`Missing required array: ${field}`);
            return false;
        }
        if (field in obj && !Array.isArray(obj[field])) {
            const level = required ? 'errors' : 'warnings';
            this[level].push(`Field ${field} should be an array`);
            return false;
        }
        return true;
    }
}
exports.BaseContractValidator = BaseContractValidator;
/**
 * Docling contract validator
 */
class DoclingContractValidator extends BaseContractValidator {
    validate(response) {
        this.reset();
        // Check base response structure
        if (!this.checkRequired(response, 'success', 'boolean'))
            return false;
        if (!this.checkRequired(response, 'executionTime', 'number'))
            return false;
        // If success is false, we only need error information
        if (!response.success) {
            this.checkOptional(response, 'error', 'string');
            return true;
        }
        // Check data structure
        if (!this.checkRequired(response, 'data', 'object'))
            return false;
        const data = response.data;
        if (!this.checkRequired(data, 'success', 'boolean'))
            return false;
        // Check optional document fields
        if ('document' in data) {
            const doc = data.document;
            this.checkOptional(doc, 'text', 'string');
            this.checkOptional(doc, 'markdown', 'string');
            this.checkOptional(doc, 'html', 'string');
            this.checkOptional(doc, 'json', 'object');
        }
        // Check optional metadata
        if ('metadata' in data) {
            const meta = data.metadata;
            this.checkOptional(meta, 'title', 'string');
            this.checkOptional(meta, 'author', 'string');
            this.checkOptional(meta, 'page_count', 'number');
            this.checkOptional(meta, 'word_count', 'number');
        }
        // Check optional arrays
        this.checkArray(data, 'tables');
        this.checkArray(data, 'figures');
        this.checkArray(data, 'annotations');
        this.checkArray(data, 'bookmarks');
        this.checkArray(data, 'form_fields');
        this.checkArray(data, 'embedded_files');
        return this.errors.length === 0;
    }
}
exports.DoclingContractValidator = DoclingContractValidator;
/**
 * Crawl4AI contract validator
 */
class Crawl4AIContractValidator extends BaseContractValidator {
    validate(response) {
        this.reset();
        // Check base response structure
        if (!this.checkRequired(response, 'success', 'boolean'))
            return false;
        if (!this.checkRequired(response, 'executionTime', 'number'))
            return false;
        // If success is false, we only need error information
        if (!response.success) {
            this.checkOptional(response, 'error', 'string');
            return true;
        }
        // Check data structure
        if (!this.checkRequired(response, 'data', 'object'))
            return false;
        const data = response.data;
        if (!this.checkRequired(data, 'success', 'boolean'))
            return false;
        // Check optional content fields
        this.checkOptional(data, 'content', 'string');
        this.checkOptional(data, 'markdown', 'string');
        this.checkOptional(data, 'html', 'string');
        // Check optional metadata
        if ('metadata' in data) {
            const meta = data.metadata;
            this.checkOptional(meta, 'title', 'string');
            this.checkOptional(meta, 'extraction_strategy', 'string');
            this.checkArray(meta, 'links');
            this.checkArray(meta, 'images');
        }
        // Check optional chunks array
        this.checkArray(data, 'chunks');
        return this.errors.length === 0;
    }
}
exports.Crawl4AIContractValidator = Crawl4AIContractValidator;
/**
 * DeepDoctection contract validator
 */
class DeepDoctectionContractValidator extends BaseContractValidator {
    validate(response) {
        this.reset();
        // Check base response structure
        if (!this.checkRequired(response, 'success', 'boolean'))
            return false;
        if (!this.checkRequired(response, 'executionTime', 'number'))
            return false;
        // If success is false, we only need error information
        if (!response.success) {
            this.checkOptional(response, 'error', 'string');
            return true;
        }
        // Check data structure
        if (!this.checkRequired(response, 'data', 'object'))
            return false;
        const data = response.data;
        if (!this.checkRequired(data, 'success', 'boolean'))
            return false;
        // Check optional content
        this.checkOptional(data, 'content', 'string');
        // Check optional arrays
        this.checkArray(data, 'tables');
        this.checkArray(data, 'layout');
        // Check optional metadata
        if ('metadata' in data) {
            const meta = data.metadata;
            this.checkOptional(meta, 'page_count', 'number');
            this.checkOptional(meta, 'document_type', 'string');
        }
        return this.errors.length === 0;
    }
}
exports.DeepDoctectionContractValidator = DeepDoctectionContractValidator;
/**
 * Factory for creating contract validators
 */
class ContractValidatorFactory {
    static createValidator(scraperType) {
        switch (scraperType) {
            case 'docling':
                return new DoclingContractValidator();
            case 'crawl4ai':
                return new Crawl4AIContractValidator();
            case 'deepdoctection':
                return new DeepDoctectionContractValidator();
            default:
                return null;
        }
    }
}
exports.ContractValidatorFactory = ContractValidatorFactory;
//# sourceMappingURL=IPythonWrapperContracts.js.map