import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { TABLE_NAME } from '../config/constants.js';
import type { DocumentChunk } from '../types/chunk.js';

const SIDECAR_FILE = '_chunks.json';

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export class LanceIndexer {
  private db: any;
  private table: any;

  async createTable(): Promise<void> {
    await ensureDir(env.LANCEDB_PATH);

    try {
      const lancedb = await import('vectordb');
      this.db = await (lancedb as any).connect(env.LANCEDB_PATH);
      try {
        this.table = await this.db.openTable(TABLE_NAME);
      } catch {
        this.table = await this.db.createTable(TABLE_NAME, []);
      }
    } catch {
      this.db = null;
      this.table = null;
    }
  }

  private sidecarPath(): string {
    return path.join(env.LANCEDB_PATH, SIDECAR_FILE);
  }

  private async readSidecar(): Promise<DocumentChunk[]> {
    try {
      const raw = await fs.readFile(this.sidecarPath(), 'utf-8');
      return JSON.parse(raw) as DocumentChunk[];
    } catch {
      return [];
    }
  }

  private async writeSidecar(chunks: DocumentChunk[]): Promise<void> {
    await ensureDir(env.LANCEDB_PATH);
    await fs.writeFile(this.sidecarPath(), JSON.stringify(chunks, null, 2), 'utf-8');
  }

  async upsert(chunks: DocumentChunk[]): Promise<void> {
    const existing = await this.readSidecar();
    const updateTargets = new Set(chunks.map((c) => `${c.project_id}:${c.source_iid}`));
    const retained = existing.filter((c) => !updateTargets.has(`${c.project_id}:${c.source_iid}`));
    const deduped = new Map<string, DocumentChunk>();
    for (const chunk of [...retained, ...chunks]) deduped.set(chunk.source_id, chunk);
    const values = Array.from(deduped.values());
    await this.writeSidecar(values);

    if (this.table) {
      try {
        await this.db.dropTable(TABLE_NAME);
      } catch {
        // no-op
      }
      this.table = await this.db.createTable(TABLE_NAME, values);
      try {
        await this.table.createIndex('text', { config: { type: 'fts' } });
      } catch {
        // no-op (SDK差分吸収)
      }
    }
  }

  async readAll(): Promise<DocumentChunk[]> {
    return this.readSidecar();
  }
}
