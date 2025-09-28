/**
 * Contract definitions for Python wrapper outputs
 * These interfaces define the expected structure of data returned by Python wrappers
 * Single Responsibility: Define contracts between Python and TypeScript layers
 */
/**
 * Base contract for all Python wrapper responses
 */
export interface IPythonWrapperResponse {
    success: boolean;
    data?: any;
    error?: string;
    stderr?: string;
    exitCode?: number;
    executionTime: number;
}
/**
 * Docling wrapper response contract
 */
export interface IDoclingResponse extends IPythonWrapperResponse {
    data?: {
        success: boolean;
        content?: string;
        format?: string;
        document?: {
            text?: string;
            markdown?: string;
            html?: string;
            json?: any;
        };
        metadata?: {
            title?: string;
            author?: string;
            page_count?: number;
            word_count?: number;
            document_type?: string;
            language?: string;
            created_date?: string;
            modified_date?: string;
        };
        tables?: Array<{
            rows?: string[][];
            caption?: string;
        }>;
        figures?: Array<{
            caption?: string;
            page?: number;
            type?: string;
        }>;
        annotations?: Array<{
            type?: string;
            content?: string;
        }>;
        bookmarks?: Array<{
            title?: string;
            page?: number;
        }>;
        form_fields?: Array<{
            name?: string;
            value?: string;
        }>;
        embedded_files?: Array<{
            name?: string;
            size?: number;
            type?: string;
        }>;
        error?: string;
    };
}
/**
 * Crawl4AI wrapper response contract
 */
export interface ICrawl4AIResponse extends IPythonWrapperResponse {
    data?: {
        success: boolean;
        content?: string;
        markdown?: string;
        html?: string;
        metadata?: {
            title?: string;
            description?: string;
            language?: string;
            keywords?: string[];
            author?: string;
            crawl_depth?: number;
            extraction_strategy?: string;
            links?: Array<{
                url: string;
                text?: string;
                type?: string;
            }>;
            images?: Array<{
                url: string;
                alt?: string;
                title?: string;
            }>;
            word_count?: number;
            session_id?: string;
            cache_mode?: string;
            magic?: boolean;
        };
        chunks?: Array<{
            text: string;
            metadata?: any;
        }>;
        error?: string;
    };
}
/**
 * DeepDoctection wrapper response contract
 */
export interface IDeepDoctectionResponse extends IPythonWrapperResponse {
    data?: {
        success: boolean;
        content?: string;
        tables?: Array<{
            data?: string[][];
            type?: string;
            confidence?: number;
        }>;
        layout?: Array<{
            type: string;
            bbox?: number[];
            text?: string;
            confidence?: number;
        }>;
        metadata?: {
            page_count?: number;
            document_type?: string;
            processing_time?: number;
        };
        error?: string;
    };
}
/**
 * Contract validator interface
 */
export interface IContractValidator<T> {
    validate(response: any): response is T;
    getErrors(): string[];
    getWarnings(): string[];
}
/**
 * Base contract validator implementation
 */
export declare abstract class BaseContractValidator<T> implements IContractValidator<T> {
    protected errors: string[];
    protected warnings: string[];
    abstract validate(response: any): response is T;
    getErrors(): string[];
    getWarnings(): string[];
    protected reset(): void;
    protected checkRequired(obj: any, field: string, type?: string): boolean;
    protected checkOptional(obj: any, field: string, type?: string): boolean;
    protected checkArray(obj: any, field: string, required?: boolean): boolean;
}
/**
 * Docling contract validator
 */
export declare class DoclingContractValidator extends BaseContractValidator<IDoclingResponse> {
    validate(response: any): response is IDoclingResponse;
}
/**
 * Crawl4AI contract validator
 */
export declare class Crawl4AIContractValidator extends BaseContractValidator<ICrawl4AIResponse> {
    validate(response: any): response is ICrawl4AIResponse;
}
/**
 * DeepDoctection contract validator
 */
export declare class DeepDoctectionContractValidator extends BaseContractValidator<IDeepDoctectionResponse> {
    validate(response: any): response is IDeepDoctectionResponse;
}
/**
 * Factory for creating contract validators
 */
export declare class ContractValidatorFactory {
    static createValidator(scraperType: string): IContractValidator<any> | null;
}
//# sourceMappingURL=IPythonWrapperContracts.d.ts.map