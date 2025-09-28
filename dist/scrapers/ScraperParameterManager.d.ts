/**
 * Single Responsibility: Manages scraper parameter configuration and validation
 * Open/Closed Principle: Open for extension through new validators
 * Dependency Inversion: Depends on interfaces, not concrete implementations
 */
import { IParameterManager, IParameterValidator, ScraperConfiguration, BatchScraperConfiguration, ScraperSpecificParameters, ParameterValidationResult, PlaywrightParameters, Crawl4AIParameters, DoclingParameters } from '../interfaces/IScraperParameters';
/**
 * Base validator for common parameter validation
 */
declare abstract class BaseParameterValidator implements IParameterValidator {
    abstract validate(parameters: any): ParameterValidationResult;
    abstract getDefaultParameters(): ScraperSpecificParameters;
    abstract getSupportedParameters(): string[];
    normalize(parameters: any): ScraperSpecificParameters;
    protected validateBaseParameters(params: any): string[];
}
/**
 * Validator for Playwright parameters
 */
export declare class PlaywrightParameterValidator extends BaseParameterValidator {
    validate(parameters: any): ParameterValidationResult;
    getDefaultParameters(): PlaywrightParameters;
    getSupportedParameters(): string[];
}
/**
 * Validator for Crawl4AI parameters
 */
export declare class Crawl4AIParameterValidator extends BaseParameterValidator {
    validate(parameters: any): ParameterValidationResult;
    getDefaultParameters(): Crawl4AIParameters;
    getSupportedParameters(): string[];
}
/**
 * Validator for Docling parameters
 */
export declare class DoclingParameterValidator extends BaseParameterValidator {
    validate(parameters: any): ParameterValidationResult;
    getDefaultParameters(): DoclingParameters;
    getSupportedParameters(): string[];
}
/**
 * Main parameter manager implementation
 */
export declare class ScraperParameterManager implements IParameterManager {
    private parameters;
    private validators;
    constructor();
    setParameters(url: string, config: ScraperConfiguration): void;
    getParameters(url: string): ScraperConfiguration | null;
    setBatchParameters(batch: BatchScraperConfiguration): void;
    getBatchParameters(urls: string[]): Map<string, ScraperConfiguration>;
    validateParameters(scraperType: string, params: any): ParameterValidationResult;
    mergeWithDefaults(scraperType: string, params: any): ScraperSpecificParameters;
    clearParameters(url?: string): void;
    exportParameters(): Map<string, ScraperConfiguration>;
    importParameters(params: Map<string, ScraperConfiguration>): void;
    /**
     * Register a custom validator for a scraper type
     */
    registerValidator(scraperType: string, validator: IParameterValidator): void;
    /**
     * Get supported parameters for a scraper type
     */
    getSupportedParameters(scraperType: string): string[];
    /**
     * Get default parameters for a scraper type
     */
    getDefaultParameters(scraperType: string): ScraperSpecificParameters | null;
}
export {};
//# sourceMappingURL=ScraperParameterManager.d.ts.map