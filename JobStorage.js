/**
 * Handles saving and loading job applications
 * from Chrome's local storage.
 */
export class JobStorage {
  static async getAll() {
    // basic promise wrapper since chrome storage still uses callbacks
    return new Promise((resolve) => {
      chrome.storage.local.get(["jobs"], (result) => {
        resolve(result.jobs || []);
      });
    });
  }

  static async save(job) {
    // grab current jobs, shove the new one in, then drop it back into storage
    const jobs = await JobStorage.getAll();
    jobs.push(job);
    return new Promise((resolve) => {
      chrome.storage.local.set({ jobs }, () => resolve(true));
    });
  }

  static async clearAll() {
    // not using it now but nice to have a quick reset button later
    return new Promise((resolve) => {
      chrome.storage.local.set({ jobs: [] }, () => resolve(true));
    });
  }
}
