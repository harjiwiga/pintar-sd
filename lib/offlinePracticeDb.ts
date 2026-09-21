import type { OfflinePracticePack, OfflineSubjectSummary } from "@/lib/offlinePractice";
import { summarizeOfflinePacks } from "@/lib/offlinePractice";

const DB_NAME = "soalpintar-offline-practice";
const DB_VERSION = 1;
const STORE = "packs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB tidak tersedia di lingkungan ini."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("Gagal membuka IndexedDB."));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "subject" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Operasi IndexedDB gagal."));
  });
}

export async function saveOfflinePracticePack(pack: OfflinePracticePack): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).put(pack));
  } finally {
    db.close();
  }
}

export async function getOfflinePracticePack(subject: string): Promise<OfflinePracticePack | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const result = await idbRequest(tx.objectStore(STORE).get(subject));
    return (result as OfflinePracticePack | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function listOfflinePracticePacks(): Promise<OfflinePracticePack[]> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const result = await idbRequest(tx.objectStore(STORE).getAll());
    return (result as OfflinePracticePack[]) ?? [];
  } finally {
    db.close();
  }
}

export async function listOfflineSubjectSummaries(): Promise<OfflineSubjectSummary[]> {
  const packs = await listOfflinePracticePacks();
  return summarizeOfflinePacks(packs);
}

export async function deleteOfflinePracticePack(subject: string): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await idbRequest(tx.objectStore(STORE).delete(subject));
  } finally {
    db.close();
  }
}

/** Ambil gambar soal sebagai data URL agar tetap tampil offline. */
export async function hydratePackImages(pack: OfflinePracticePack): Promise<OfflinePracticePack> {
  const questions = await Promise.all(
    pack.questions.map(async (question) => {
      if (question.imageDataUrl) return question;
      if (!question.imageUrl) return question;
      try {
        const res = await fetch(question.imageUrl);
        if (!res.ok) return question;
        const blob = await res.blob();
        const imageDataUrl = await blobToDataUrl(blob);
        return { ...question, imageDataUrl };
      } catch {
        return question;
      }
    })
  );
  return { ...pack, questions };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Gagal membaca gambar."));
    reader.readAsDataURL(blob);
  });
}
