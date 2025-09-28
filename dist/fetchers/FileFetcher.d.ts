/**
 * Local file system fetcher
 * Single Responsibility: Fetches content from local file system
 */
import { BaseFetcher } from './BaseFetcher';
import { FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';
export declare class FileFetcher extends BaseFetcher {
    private readonly basePath?;
    private readonly allowedExtensions?;
    constructor(maxSize?: number, timeout?: number, basePath?: string, allowedExtensions?: string[]);
    canFetch(url: string): boolean;
    protected performFetch(url: string, options: FetchOptions): Promise<FetchedContent>;
    private extractFilePath;
    private resolvePath;
    private validateFileAccess;
    private determineMimeType;
    private isValidFilePath;
    /**
     * Lists files in a directory
     * @param directoryUrl Directory URL or path
     * @param options Fetch options
     * @returns Promise resolving to array of file URLs
     */
    listFiles(directoryUrl: string, _options?: FetchOptions): Promise<string[]>;
    /**
     * Checks if a file exists
     * @param url File URL or path
     * @returns Promise resolving to existence status
     */
    exists(url: string): Promise<boolean>;
    /**
     * Gets file metadata without reading content
     * @param url File URL or path
     * @returns Promise resolving to file metadata
     */
    getMetadata(url: string): Promise<FileMetadata>;
    /**
     * Gets the base path for relative file resolution
     * @returns Base path or undefined
     */
    getBasePath(): string | undefined;
    /**
     * Gets allowed file extensions
     * @returns Set of allowed extensions or undefined
     */
    getAllowedExtensions(): Set<string> | undefined;
}
export interface FileMetadata {
    path: string;
    size: number;
    mimeType: string;
    lastModified: Date;
    created: Date;
    isDirectory: boolean;
    isFile: boolean;
    permissions: number;
}
//# sourceMappingURL=FileFetcher.d.ts.map