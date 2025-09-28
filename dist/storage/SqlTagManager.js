"use strict";
/**
 * SQL-based implementation of ITagManager using SQLite
 * Single Responsibility: Manages tag lifecycle and operations
 * Dependency Inversion: Implements ITagManager abstraction
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlTagManager = void 0;
const crypto = __importStar(require("crypto"));
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlTagManager {
    db;
    constructor(db) {
        this.db = db;
    }
    /**
     * Initializes tag-related database tables
     */
    async initialize() {
        try {
            // Create tags table with hierarchical support
            await this.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          parent_id TEXT,
          description TEXT,
          color TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL
        )
      `);
            // Create indices for better query performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_tag_name ON tags(name)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_tag_parent ON tags(parent_id)');
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_INIT_ERROR', 'Failed to initialize tag tables', { error });
        }
    }
    async createTag(input) {
        try {
            // Check if name already exists
            const existing = await this.getTagByName(input.name);
            if (existing) {
                throw ErrorHandler_1.ErrorHandler.createError('TAG_EXISTS', 'Tag with this name already exists', { name: input.name });
            }
            // Validate parent ID if provided
            if (input.parentId) {
                const parent = await this.getTag(input.parentId);
                if (!parent) {
                    throw ErrorHandler_1.ErrorHandler.createError('PARENT_NOT_FOUND', 'Parent tag does not exist', { parentId: input.parentId });
                }
            }
            const id = crypto.randomUUID();
            const now = Date.now();
            await this.run(`INSERT INTO tags (id, name, parent_id, description, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`, [
                id,
                input.name,
                input.parentId || null,
                input.description || null,
                input.color || null,
                now
            ]);
            return {
                id,
                name: input.name,
                parentId: input.parentId,
                description: input.description,
                color: input.color,
                createdAt: new Date(now)
            };
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_CREATE_ERROR', 'Failed to create tag', { input, error });
        }
    }
    async getTag(id) {
        try {
            const row = await this.get('SELECT * FROM tags WHERE id = ?', [id]);
            if (!row)
                return null;
            return this.rowToTag(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_GET_ERROR', 'Failed to get tag', { id, error });
        }
    }
    async getTagByName(name) {
        try {
            const row = await this.get('SELECT * FROM tags WHERE name = ?', [name]);
            if (!row)
                return null;
            return this.rowToTag(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_GET_ERROR', 'Failed to get tag by name', { name, error });
        }
    }
    async updateTag(id, input) {
        try {
            const existing = await this.getTag(id);
            if (!existing) {
                throw ErrorHandler_1.ErrorHandler.createError('TAG_NOT_FOUND', 'Tag does not exist', { id });
            }
            // Check name uniqueness if changing name
            if (input.name && input.name !== existing.name) {
                const nameExists = await this.getTagByName(input.name);
                if (nameExists) {
                    throw ErrorHandler_1.ErrorHandler.createError('TAG_NAME_EXISTS', 'Tag with this name already exists', { name: input.name });
                }
            }
            // Validate parent ID if provided
            if (input.parentId !== undefined) {
                if (input.parentId) {
                    // Check parent exists
                    const parent = await this.getTag(input.parentId);
                    if (!parent) {
                        throw ErrorHandler_1.ErrorHandler.createError('PARENT_NOT_FOUND', 'Parent tag does not exist', { parentId: input.parentId });
                    }
                    // Prevent circular references
                    if (await this.wouldCreateCircularReference(id, input.parentId)) {
                        throw ErrorHandler_1.ErrorHandler.createError('CIRCULAR_REFERENCE', 'Cannot create circular tag hierarchy', { id, parentId: input.parentId });
                    }
                }
            }
            const updates = [];
            const params = [];
            if (input.name !== undefined) {
                updates.push('name = ?');
                params.push(input.name);
            }
            if (input.parentId !== undefined) {
                updates.push('parent_id = ?');
                params.push(input.parentId || null);
            }
            if (input.description !== undefined) {
                updates.push('description = ?');
                params.push(input.description || null);
            }
            if (input.color !== undefined) {
                updates.push('color = ?');
                params.push(input.color || null);
            }
            if (updates.length > 0) {
                params.push(id);
                await this.run(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`, params);
            }
            const updated = await this.getTag(id);
            if (!updated) {
                throw ErrorHandler_1.ErrorHandler.createError('TAG_UPDATE_FAILED', 'Failed to retrieve updated tag', { id });
            }
            return updated;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_UPDATE_ERROR', 'Failed to update tag', { id, input, error });
        }
    }
    async deleteTag(id, deleteChildren = false) {
        try {
            const tag = await this.getTag(id);
            if (!tag) {
                return false;
            }
            if (deleteChildren) {
                // Delete all descendant tags recursively
                await this.deleteDescendants(id);
            }
            else {
                // Promote children to root level
                await this.run('UPDATE tags SET parent_id = NULL WHERE parent_id = ?', [id]);
            }
            // Delete the tag
            await this.run('DELETE FROM tags WHERE id = ?', [id]);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_DELETE_ERROR', 'Failed to delete tag', { id, deleteChildren, error });
        }
    }
    async listTags(filter) {
        try {
            let sql = 'SELECT * FROM tags WHERE 1=1';
            const params = [];
            if (filter) {
                if (filter.parentId !== undefined) {
                    if (filter.parentId === null) {
                        sql += ' AND parent_id IS NULL';
                    }
                    else {
                        sql += ' AND parent_id = ?';
                        params.push(filter.parentId);
                    }
                }
                if (filter.nameContains) {
                    sql += ' AND name LIKE ?';
                    params.push(`%${filter.nameContains}%`);
                }
            }
            sql += ' ORDER BY name ASC';
            if (filter?.limit) {
                sql += ' LIMIT ?';
                params.push(filter.limit);
            }
            if (filter?.offset) {
                sql += ' OFFSET ?';
                params.push(filter.offset);
            }
            const rows = await this.all(sql, params);
            const tags = rows.map(row => this.rowToTag(row));
            // Apply minUrlCount filter if provided (requires counting URLs)
            if (filter?.minUrlCount !== undefined && filter.minUrlCount > 0) {
                const counts = await this.getTagUrlCounts(tags.map(t => t.id));
                return tags.filter(tag => {
                    const count = counts.get(tag.id) || 0;
                    return count >= filter.minUrlCount;
                });
            }
            return tags;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_LIST_ERROR', 'Failed to list tags', { filter, error });
        }
    }
    async getChildTags(parentId, recursive = false) {
        try {
            if (recursive) {
                return await this.getDescendants(parentId);
            }
            const rows = await this.all('SELECT * FROM tags WHERE parent_id = ? ORDER BY name ASC', [parentId]);
            return rows.map(row => this.rowToTag(row));
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_CHILDREN_ERROR', 'Failed to get child tags', { parentId, recursive, error });
        }
    }
    async getTagPath(id) {
        try {
            const path = [];
            let currentId = id;
            while (currentId) {
                const tag = await this.getTag(currentId);
                if (!tag)
                    break;
                path.unshift(tag);
                currentId = tag.parentId;
                // Prevent infinite loops in case of data corruption
                if (path.length > 100) {
                    throw ErrorHandler_1.ErrorHandler.createError('TAG_PATH_TOO_DEEP', 'Tag hierarchy too deep or circular', { id });
                }
            }
            return path;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_PATH_ERROR', 'Failed to get tag path', { id, error });
        }
    }
    async isNameAvailable(name, excludeId) {
        try {
            let sql = 'SELECT COUNT(*) as count FROM tags WHERE name = ?';
            const params = [name];
            if (excludeId) {
                sql += ' AND id != ?';
                params.push(excludeId);
            }
            const result = await this.get(sql, params);
            return result ? result.count === 0 : true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_NAME_CHECK_ERROR', 'Failed to check tag name availability', { name, excludeId, error });
        }
    }
    async ensureTagsExist(tagNames) {
        try {
            const tagIds = [];
            for (const name of tagNames) {
                let tag = await this.getTagByName(name);
                if (!tag) {
                    // Create the tag if it doesn't exist
                    tag = await this.createTag({ name });
                }
                tagIds.push(tag.id);
            }
            return tagIds;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_ENSURE_ERROR', 'Failed to ensure tags exist', { tagNames, error });
        }
    }
    /**
     * Helper method to get URL counts for tags
     */
    async getTagUrlCounts(tagIds) {
        try {
            const counts = new Map();
            if (tagIds.length === 0)
                return counts;
            const placeholders = tagIds.map(() => '?').join(',');
            const rows = await this.all(`SELECT tag_id, COUNT(*) as count
         FROM url_tags
         WHERE tag_id IN (${placeholders})
         GROUP BY tag_id`, tagIds);
            for (const row of rows) {
                counts.set(row.tag_id, row.count);
            }
            return counts;
        }
        catch (error) {
            // Return empty map if table doesn't exist yet
            return new Map();
        }
    }
    /**
     * Helper method to check for circular references
     */
    async wouldCreateCircularReference(childId, parentId) {
        if (childId === parentId)
            return true;
        const path = await this.getTagPath(parentId);
        return path.some(tag => tag.id === childId);
    }
    /**
     * Helper method to get all descendants recursively
     */
    async getDescendants(parentId) {
        const descendants = [];
        const children = await this.getChildTags(parentId, false);
        for (const child of children) {
            descendants.push(child);
            const childDescendants = await this.getDescendants(child.id);
            descendants.push(...childDescendants);
        }
        return descendants;
    }
    /**
     * Helper method to delete all descendants recursively
     */
    async deleteDescendants(parentId) {
        const children = await this.getChildTags(parentId, false);
        for (const child of children) {
            await this.deleteDescendants(child.id);
            await this.run('DELETE FROM tags WHERE id = ?', [child.id]);
        }
    }
    /**
     * Helper method to convert database row to ITag
     */
    rowToTag(row) {
        return {
            id: row.id,
            name: row.name,
            parentId: row.parent_id || undefined,
            description: row.description || undefined,
            color: row.color || undefined,
            createdAt: new Date(row.created_at)
        };
    }
    /**
     * Helper method to run SQL queries
     */
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Helper method to get single row
     */
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    /**
     * Helper method to get multiple rows
     */
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        });
    }
}
exports.SqlTagManager = SqlTagManager;
//# sourceMappingURL=SqlTagManager.js.map