/**
 * Represents a single job application.
 * Each job stores its URL, title, date, company and description.
 */
export class Job {
  constructor(url, title, company = "Unknown", description = "") {
    // just dumping everything onto this object so it's easy to store later
    this.url = url;
    this.title = title;
    this.company = company;
    this.description = description;
    this.date = new Date().toLocaleDateString();
  }

  /**
   * Returns a short text summary of this job.
   */
  summary() {
    // summary mainly for the popup list so I can skim fast
    return `${this.title} at ${this.company} (${this.date})`;
  }
}
