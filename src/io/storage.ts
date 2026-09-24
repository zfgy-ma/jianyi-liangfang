import type { Project } from '../core/types';

const DB_NAME = 'jianyi-liangfang';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runRequest<T>(
  mode: IDBTransactionMode,
  build: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = build(transaction.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

/** 自动保存：每个工程一条记录 */
export async function saveProject(project: Project): Promise<void> {
  await runRequest('readwrite', (store) => store.put(project));
}

export async function loadProject(id: string): Promise<Project | null> {
  const project = await runRequest<Project | undefined>('readonly', (store) =>
    store.get(id),
  );
  return project ?? null;
}

export async function listProjects(): Promise<Project[]> {
  const projects = await runRequest<Project[]>('readonly', (store) =>
    store.getAll(),
  );
  return projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteProject(id: string): Promise<void> {
  await runRequest('readwrite', (store) => store.delete(id));
}
