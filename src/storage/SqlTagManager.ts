/**
 * SQL-based implementation of ITagManager using SQLite
 * Single Responsibility: Manages tag lifecycle and operations
 * Dependency Inversion: Implements ITagManager abstraction
 */

import * as sqlite3 from 'sqlite3';
import * as crypto from 'crypto';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag, TagCreateInput, TagUpdateInput, TagFilter } from '../interfaces/ITag';
import { ErrorHandler } from '../utils/ErrorHandler';

export class SqlTagManager implements ITagManager {
  private db: sqlite3.Database;

  constructor(db: sqlite3.Database) {
    this.db = db;
  }

  /**
   * Initializes tag-related database tables
   */
  async initialize(): Promise<void> {
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

    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_INIT_ERROR',
        'Failed to initialize tag tables',
        { error }
      );
    }
  }

  async createTag(input: TagCreateInput): Promise<ITag> {
    try {
      // Check if name already exists
      const existing = await this.getTagByName(input.name);
      if (existing) {
        throw ErrorHandler.createError(
          'TAG_EXISTS',
          'Tag with this name already exists',
          { name: input.name }
        );
      }

      // Validate parent ID if provided
      if (input.parentId) {
        const parent = await this.getTag(input.parentId);
        if (!parent) {
          throw ErrorHandler.createError(
            'PARENT_NOT_FOUND',
            'Parent tag does not exist',
            { parentId: input.parentId }
          );
        }
      }

      const id = crypto.randomUUID();
      const now = Date.now();

      await this.run(
        `INSERT INTO tags (id, name, parent_id, description, color, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.name,
          input.parentId || null,
          input.description || null,
          input.color || null,
          now
        ]
      );

      return {
        id,
        name: input.name,
        parentId: input.parentId,
        description: input.description,
        color: input.color,
        createdAt: new Date(now)
      };
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_CREATE_ERROR',
        'Failed to create tag',
        { input, error }
      );
    }
  }

  async getTag(id: string): Promise<ITag | null> {
    try {
      const row = await this.get<any>(
        'SELECT * FROM tags WHERE id = ?',
        [id]
      );

      if (!row) return null;

      return this.rowToTag(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_GET_ERROR',
        'Failed to get tag',
        { id, error }
      );
    }
  }

  async getTagByName(name: string): Promise<ITag | null> {
    try {
      const row = await this.get<any>(
        'SELECT * FROM tags WHERE name = ?',
        [name]
      );

      if (!row) return null;

      return this.rowToTag(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_GET_ERROR',
        'Failed to get tag by name',
        { name, error }
      );
    }
  }

  async updateTag(id: string, input: TagUpdateInput): Promise<ITag> {
    try {
      const existing = await this.getTag(id);
      if (!existing) {
        throw ErrorHandler.createError(
          'TAG_NOT_FOUND',
          'Tag does not exist',
          { id }
        );
      }

      // Check name uniqueness if changing name
      if (input.name && input.name !== existing.name) {
        const nameExists = await this.getTagByName(input.name);
        if (nameExists) {
          throw ErrorHandler.createError(
            'TAG_NAME_EXISTS',
            'Tag with this name already exists',
            { name: input.name }
          );
        }
      }

      // Validate parent ID if provided
      if (input.parentId !== undefined) {
        if (input.parentId) {
          // Check parent exists
          const parent = await this.getTag(input.parentId);
          if (!parent) {
            throw ErrorHandler.createError(
              'PARENT_NOT_FOUND',
              'Parent tag does not exist',
              { parentId: input.parentId }
            );
          }

          // Prevent circular references
          if (await this.wouldCreateCircularReference(id, input.parentId)) {
            throw ErrorHandler.createError(
              'CIRCULAR_REFERENCE',
              'Cannot create circular tag hierarchy',
              { id, parentId: input.parentId }
            );
          }
        }
      }

      const updates: string[] = [];
      const params: any[] = [];

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
        await this.run(
          `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }

      const updated = await this.getTag(id);
      if (!updated) {
        throw ErrorHandler.createError(
          'TAG_UPDATE_FAILED',
          'Failed to retrieve updated tag',
          { id }
        );
      }

      return updated;
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_UPDATE_ERROR',
        'Failed to update tag',
        { id, input, error }
      );
    }
  }

  async deleteTag(id: string, deleteChildren: boolean = false): Promise<boolean> {
    try {
      const tag = await this.getTag(id);
      if (!tag) {
        return false;
      }

      if (deleteChildren) {
        // Delete all descendant tags recursively
        await this.deleteDescendants(id);
      } else {
        // Promote children to root level
        await this.run(
          'UPDATE tags SET parent_id = NULL WHERE parent_id = ?',
          [id]
        );
      }

      // Delete the tag
      await this.run('DELETE FROM tags WHERE id = ?', [id]);

      return true;
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_DELETE_ERROR',
        'Failed to delete tag',
        { id, deleteChildren, error }
      );
    }
  }

  async listTags(filter?: TagFilter): Promise<ITag[]> {
    try {
      let sql = 'SELECT * FROM tags WHERE 1=1';
      const params: any[] = [];

      if (filter) {
        if (filter.parentId !== undefined) {
          if (filter.parentId === null) {
            sql += ' AND parent_id IS NULL';
          } else {
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

      const rows = await this.all<any>(sql, params);
      const tags = rows.map(row => this.rowToTag(row));

      // Apply minUrlCount filter if provided (requires counting URLs)
      if (filter?.minUrlCount !== undefined && filter.minUrlCount > 0) {
        const counts = await this.getTagUrlCounts(tags.map(t => t.id));
        return tags.filter(tag => {
          const count = counts.get(tag.id) || 0;
          return count >= filter.minUrlCount!;
        });
      }

      return tags;
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_LIST_ERROR',
        'Failed to list tags',
        { filter, error }
      );
    }
  }

  async getChildTags(parentId: string, recursive: boolean = false): Promise<ITag[]> {
    try {
      if (recursive) {
        return await this.getDescendants(parentId);
      }

      const rows = await this.all<any>(
        'SELECT * FROM tags WHERE parent_id = ? ORDER BY name ASC',
        [parentId]
      );

      return rows.map(row => this.rowToTag(row));
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_CHILDREN_ERROR',
        'Failed to get child tags',
        { parentId, recursive, error }
      );
    }
  }

  async getTagPath(id: string): Promise<ITag[]> {
    try {
      const path: ITag[] = [];
      let currentId: string | undefined = id;

      while (currentId) {
        const tag = await this.getTag(currentId);
        if (!tag) break;

        path.unshift(tag);
        currentId = tag.parentId;

        // Prevent infinite loops in case of data corruption
        if (path.length > 100) {
          throw ErrorHandler.createError(
            'TAG_PATH_TOO_DEEP',
            'Tag hierarchy too deep or circular',
            { id }
          );
        }
      }

      return path;
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_PATH_ERROR',
        'Failed to get tag path',
        { id, error }
      );
    }
  }

  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    try {
      let sql = 'SELECT COUNT(*) as count FROM tags WHERE name = ?';
      const params: any[] = [name];

      if (excludeId) {
        sql += ' AND id != ?';
        params.push(excludeId);
      }

      const result = await this.get<{ count: number }>(sql, params);
      return result ? result.count === 0 : true;
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_NAME_CHECK_ERROR',
        'Failed to check tag name availability',
        { name, excludeId, error }
      );
    }
  }

  async ensureTagsExist(tagNames: string[]): Promise<string[]> {
    try {
      const tagIds: string[] = [];

      for (const name of tagNames) {
        let tag = await this.getTagByName(name);

        if (!tag) {
          // Create the tag if it doesn't exist
          tag = await this.createTag({ name });
        }

        tagIds.push(tag.id);
      }

      return tagIds;
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_ENSURE_ERROR',
        'Failed to ensure tags exist',
        { tagNames, error }
      );
    }
  }

  /**
   * Helper method to get URL counts for tags
   */
  private async getTagUrlCounts(tagIds: string[]): Promise<Map<string, number>> {
    try {
      const counts = new Map<string, number>();

      if (tagIds.length === 0) return counts;

      const placeholders = tagIds.map(() => '?').join(',');
      const rows = await this.all<{ tag_id: string; count: number }>(
        `SELECT tag_id, COUNT(*) as count
         FROM url_tags
         WHERE tag_id IN (${placeholders})
         GROUP BY tag_id`,
        tagIds
      );

      for (const row of rows) {
        counts.set(row.tag_id, row.count);
      }

      return counts;
    } catch (error) {
      // Return empty map if table doesn't exist yet
      return new Map();
    }
  }

  /**
   * Helper method to check for circular references
   */
  private async wouldCreateCircularReference(childId: string, parentId: string): Promise<boolean> {
    if (childId === parentId) return true;

    const path = await this.getTagPath(parentId);
    return path.some(tag => tag.id === childId);
  }

  /**
   * Helper method to get all descendants recursively
   */
  private async getDescendants(parentId: string): Promise<ITag[]> {
    const descendants: ITag[] = [];
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
  private async deleteDescendants(parentId: string): Promise<void> {
    const children = await this.getChildTags(parentId, false);

    for (const child of children) {
      await this.deleteDescendants(child.id);
      await this.run('DELETE FROM tags WHERE id = ?', [child.id]);
    }
  }

  /**
   * Helper method to convert database row to ITag
   */
  private rowToTag(row: any): ITag {
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
  private async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Helper method to get single row
   */
  private async get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  /**
   * Helper method to get multiple rows
   */
  private async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }
}