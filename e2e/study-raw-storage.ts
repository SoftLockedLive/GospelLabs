/**
 * Direct access to the app's IndexedDB stores for the study specs, bypassing
 * the app (and its validation), the way another tab, an older or newer
 * version, or a damaged record would. The app's live queries don't notice
 * these writes until the page next reads (for example, after a reload).
 * Open a page of the app first so the database exists.
 */
import type { Page } from "@playwright/test";

/** Stores a record in one of the app's stores exactly as given. */
export function putStoredRecord(page: Page, store: string, record: object) {
  return page.evaluate(
    ({ name, value }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction(name, "readwrite");
          transaction.objectStore(name).put(value);
          transaction.oncomplete = () => {
            request.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { name: store, value: record },
  );
}

/** Deletes a record from one of the app's stores. */
export function deleteStoredRecord(page: Page, store: string, key: string) {
  return page.evaluate(
    ({ name, id }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("gospel-labs");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const transaction = request.result.transaction(name, "readwrite");
          transaction.objectStore(name).delete(id);
          transaction.oncomplete = () => {
            request.result.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    { name: store, id: key },
  );
}
