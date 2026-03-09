import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';
import { TABLE_NAME } from '../config/constants.js';
import type { DocumentChunk } from '../types/chunk.js';

const SIDECAR_FILE = '_chunks.json';

interface LanceTable {
  createIndex(...args: unknown[]): Promise<unknown>;
}

interface LanceConnection {
  openTable(name: string): Promise<LanceTable>;
  createTable(name: string, data: DocumentChunk[]): Promise<LanceTable>;
  dropTable(name: string): Promise<void>;
}

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

export class LanceIndexer {
  private db: LanceConnection | null = null;
  private table: LanceTable | null = null;

  async createTable(): Promise<void> {
    await ensureDir(env.LANCEDB_PATH);

    try {
      const lancedb = await import('vectordb');
      this.db = await (lancedb as unknown as { connect: (uri: string) => Promise<LanceConnection> }).connect(
        env.LANCEDB_PATH,
      );
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
    // Step 1: 更新対象 ChangeRequest (project_id:change_request_number) の旧チャンクを先に取り除く。
    const updateTargets = new Set(chunks.map((c) => `${c.project_id}:${c.change_request_number}`));
    const retained = existing.filter((c) => !updateTargets.has(`${c.project_id}:${c.change_request_number}`));
    // Step 2: source_id で重複排除する（異常系の安全弁）。
    const deduped = new Map<string, DocumentChunk>();
    for (const chunk of [...retained, ...chunks]) deduped.set(chunk.source_id, chunk);
    const values = Array.from(deduped.values());
    await this.writeSidecar(values);

    if (this.table && this.db) {
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
