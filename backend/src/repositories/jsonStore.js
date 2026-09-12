import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');

// Serializes writes per-file so concurrent requests can't clobber each other.
const writeQueues = new Map();

function queueWrite(filePath, task) {
  const prev = writeQueues.get(filePath) || Promise.resolve();
  const next = prev.then(task, task);
  writeQueues.set(
    filePath,
    next.finally(() => {
      if (writeQueues.get(filePath) === next) writeQueues.delete(filePath);
    })
  );
  return next;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/**
 * Minimal JSON-file-backed key/value collection with atomic (write-tmp + rename)
 * persistence. This is intentionally simple — see repositories/*.js for the
 * domain-specific methods built on top of it.
 */
export class JsonCollection {
  constructor(name) {
    this.filePath = path.join(DATA_DIR, `${name}.json`);
  }

  async _read() {
    await ensureDataDir();
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      // Corrupt file: don't crash the app, start fresh but keep a backup.
      console.error(`Corrupt data file ${this.filePath}, resetting:`, err.message);
      try {
        await fs.copyFile(this.filePath, `${this.filePath}.corrupt-${Date.now()}`);
      } catch {
        // ignore
      }
      return {};
    }
  }

  async _write(data) {
    await ensureDataDir();
    return queueWrite(this.filePath, async () => {
      const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
      await fs.rename(tmpPath, this.filePath);
    });
  }

  async get(id) {
    const data = await this._read();
    return data[id] ?? null;
  }

  async getAll() {
    return this._read();
  }

  async set(id, value) {
    const data = await this._read();
    data[id] = value;
    await this._write(data);
    return value;
  }

  async update(id, updater) {
    const data = await this._read();
    const current = data[id] ?? null;
    const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    data[id] = updated;
    await this._write(data);
    return updated;
  }

  async delete(id) {
    const data = await this._read();
    if (!(id in data)) return false;
    delete data[id];
    await this._write(data);
    return true;
  }

  async deleteWhere(predicate) {
    const data = await this._read();
    let changed = false;
    for (const [id, value] of Object.entries(data)) {
      if (predicate(value, id)) {
        delete data[id];
        changed = true;
      }
    }
    if (changed) await this._write(data);
    return changed;
  }
}
