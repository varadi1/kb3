/**
 * SQL implementation of IProcessedFileRepository
 * Single Responsibility: Only manages processed file records in SQL database
 * Open/Closed: Can be extended without modification
 */
import { IProcessedFileRepository, ProcessedFileInfo, ProcessedFileRecord, ProcessedFileStatus, ListProcessedFilesOptions, ProcessedFileStatistics } from '../interfaces/IProcessedFileRepository';
export declare class SqlProcessedFileRepository implements IProcessedFileRepository {
    private db;
    private readonly dbPath;
    constructor(databasePath: string);
    initialize(): Promise<void>;
    private createDatabase;
    private run;
    private get;
    private all;
    recordProcessedFile(fileInfo: ProcessedFileInfo): Promise<string>;
    getProcessedFile(fileId: string): Promise<ProcessedFileRecord | null>;
    getProcessedFilesByOriginal(originalFileId: string): Promise<ProcessedFileRecord[]>;
    getProcessedFilesByUrl(url: string): Promise<ProcessedFileRecord[]>;
    listProcessedFiles(options?: ListProcessedFilesOptions): Promise<ProcessedFileRecord[]>;
    updateFileStatus(fileId: string, status: ProcessedFileStatus): Promise<boolean>;
    getStatistics(): Promise<ProcessedFileStatistics>;
    private generateFileId;
    private mapSortColumn;
    private rowToRecord;
    close(): Promise<void>;
}
//# sourceMappingURL=SqlProcessedFileRepository.d.ts.map