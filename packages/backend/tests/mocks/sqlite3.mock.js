// Mock for sqlite3 module
class Database {
  constructor(filename, callback) {
    this.filename = filename;
    this.statements = new Map();
    if (callback) {
      process.nextTick(() => callback(null));
    }
  }

  run(sql, params, callback) {
    const cb = callback || params;
    if (typeof cb === 'function') {
      process.nextTick(() => cb.call({ lastID: 1, changes: 1 }, null));
    }
    return this;
  }

  get(sql, params, callback) {
    const cb = callback || params;
    if (typeof cb === 'function') {
      process.nextTick(() => cb(null, { id: 1, data: 'mock' }));
    }
    return this;
  }

  all(sql, params, callback) {
    const cb = callback || params;
    if (typeof cb === 'function') {
      process.nextTick(() => cb(null, []));
    }
    return this;
  }

  prepare(sql) {
    const statement = {
      run: (...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          process.nextTick(() => callback.call({ lastID: 1, changes: 1 }, null));
        }
        return statement;
      },
      get: (...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, { id: 1, data: 'mock' }));
        }
        return statement;
      },
      all: (...args) => {
        const callback = args[args.length - 1];
        if (typeof callback === 'function') {
          process.nextTick(() => callback(null, []));
        }
        return statement;
      },
      finalize: (callback) => {
        if (callback) process.nextTick(() => callback(null));
        return statement;
      }
    };
    this.statements.set(sql, statement);
    return statement;
  }

  serialize(callback) {
    if (callback) {
      process.nextTick(() => callback());
    }
    return this;
  }

  parallelize(callback) {
    if (callback) {
      process.nextTick(() => callback());
    }
    return this;
  }

  close(callback) {
    if (callback) {
      process.nextTick(() => callback(null));
    }
    return this;
  }

  exec(sql, callback) {
    if (typeof callback === 'function') {
      process.nextTick(() => callback(null));
    } else if (typeof sql === 'function') {
      // Handle case where first argument is the callback
      process.nextTick(() => sql(null));
    }
    return this;
  }
}

module.exports = {
  Database,
  verbose: () => ({
    Database
  }),
  OPEN_READWRITE: 2,
  OPEN_CREATE: 4
};