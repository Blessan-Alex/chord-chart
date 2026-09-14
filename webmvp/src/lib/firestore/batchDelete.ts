import { writeBatch, type DocumentReference, type Firestore } from "firebase/firestore";

const DELETE_BATCH_SIZE = 450;

/** Delete many Firestore docs in chunks (max 500 ops per batch). */
export async function commitBatchedDeletes(
  firestore: Firestore,
  refs: DocumentReference[],
): Promise<void> {
  for (let i = 0; i < refs.length; i += DELETE_BATCH_SIZE) {
    const batch = writeBatch(firestore);
    for (const ref of refs.slice(i, i + DELETE_BATCH_SIZE)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}
