import { Job } from "./job.js";
import { JobStorage } from "./JobStorage.js";

// grabbing the button and the list from the popup so I can mess with them
const saveButton = document.getElementById("saveButton");
const jobList = document.getElementById("jobList");

/**
 * Render all saved jobs in the popup list.
 */
async function render() {
  // pulling everything from storage and clearing the old list first
  const jobs = await JobStorage.getAll();
  jobList.innerHTML = "";
  jobs.forEach((job) => {
    // each job becomes a tiny list item with title + date so I remember when I saved it
    const li = document.createElement("li");
    li.textContent = `${job.title} (${job.date})`;
    jobList.appendChild(li);
  });
}

/**
 * Save the current active tab as a job application.
 */
saveButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const job = new Job(tab.url, tab.title);
  // saving it right after making the Job instance so I don't forget later
  await JobStorage.save(job);
  render();
});

// calling render right away so the list doesn't look empty when popup pops
render();
