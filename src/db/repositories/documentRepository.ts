import { getDB } from '../database'
import type { Document } from '../../types'

export class DocumentRepository {
  async getAll(): Promise<Document[]> {
    const db = await getDB()
    const docs = await db.getAll('documents')
    return docs.sort((a, b) => b.createdAt - a.createdAt)
  }

  async getById(id: string): Promise<Document | undefined> {
    const db = await getDB()
    return db.get('documents', id)
  }

  async create(doc: Document, blob: Blob): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(['documents', 'documentBlobs'], 'readwrite')
    await tx.objectStore('documents').put(doc)
    await tx.objectStore('documentBlobs').put({ id: doc.id, blob })
    await tx.done
  }

  async update(doc: Document): Promise<void> {
    const db = await getDB()
    await db.put('documents', doc)
  }

  async getBlob(id: string): Promise<Blob | undefined> {
    const db = await getDB()
    const record = await db.get('documentBlobs', id)
    return record?.blob
  }

  async delete(id: string): Promise<void> {
    const db = await getDB()
    const tx = db.transaction(['documents', 'documentBlobs', 'chunks'], 'readwrite')
    await tx.objectStore('documents').delete(id)
    await tx.objectStore('documentBlobs').delete(id)
    const chunks = await db.getAllFromIndex('chunks', 'by-source', id)
    for (const chunk of chunks) {
      await tx.objectStore('chunks').delete(chunk.id)
    }
    await tx.done
  }

  async count(): Promise<number> {
    const db = await getDB()
    return db.count('documents')
  }
}

export const documentRepo = new DocumentRepository()
