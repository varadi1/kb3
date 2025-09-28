/**
 * SQL implementation of IOriginalFileRepository
 * Single Responsibility: Only manages original file records in SQL database
 */
import { IOriginalFileRepository, OriginalFileInfo, OriginalFileRecord, FileStatus, ListOriginalFilesOptions, OriginalFileStatistics } from '../interfaces/IOriginalFileRepository';
export declare class SqlOriginalFileRepository implements IOriginalFileRepository {
    private db;
    private readonly dbPath;
    constructor(databasePath: string);
    initialize(): Promise<void>;
    private createDatabase;
    private run;
    private get;
    private all;
    recordOriginalFile(fileInfo: OriginalFileInfo): Promise<string>;
    getOriginalFile(fileId: string): Promise<OriginalFileRecord | null>;
    getOriginalFilesByUrl(url: string): Promise<OriginalFileRecord[]>;
    listOriginalFiles(options?: ListOriginalFilesOptions): Promise<OriginalFileRecord[]>;
    updateFileStatus(fileId: string, status: FileStatus): Promise<boolean>;
    getStatistics(): Promise<OriginalFileStatistics>;
    private generateFileId;
    private mapSortColumn;
    private rowToRecord;
    close(): Promise<void>;
}
//# sourceMappingURL=SqlOriginalFileRepository.d.ts.map