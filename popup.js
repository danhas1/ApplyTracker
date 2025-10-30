const saveButton = document.getElementById("saveButton");
const jobList = document.getElementById("jobList");
const emptyMsg = document.getElementById("emptyMsg");
const searchInput = document.getElementById("searchInput");

/**
 * Adds the current active tab as a saved job.
 */
saveButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Clean and sanitize title
  let title = tab.title || "Unknown page";
  title = title.replace(/â€“|â€”|–|—/g, "-");
  title = title.replace(/[^\x20-\x7Eא-ת.,;:!?@#%&()\-\s'"]/g, "");
  title = title.trim();

  const job = {
    title,
    url: tab.url || "N/A",
    date: new Date().toLocaleDateString(),
    status: "Active" // default status
  };

  // Save job to Chrome Sync Storage
  chrome.storage.sync.get(["jobs"], (result) => {
    const jobs = result.jobs || [];
    jobs.push(job);
    chrome.storage.sync.set({ jobs }, () => {
      render(jobs);
    });
  });
});

/**
 * Handles live search filtering of jobs.
 */
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  chrome.storage.sync.get(["jobs"], (result) => {
    const jobs = result.jobs || [];
    const filtered = jobs.filter(
      (job) =>
        job.title.toLowerCase().includes(query) ||
        job.url.toLowerCase().includes(query)
    );
    render(filtered);
  });
});

/**
 * Renders all saved jobs in styled cards.
 */
function render(jobs) {
  jobList.innerHTML = "";

  if (!jobs || jobs.length === 0) {
    emptyMsg.style.display = "block";
    updateStats(0, 0, 0);
    return;
  }

  emptyMsg.style.display = "none";

  jobs.forEach((job, index) => {
    const card = document.createElement("div");
    card.className = "job-card";

    // Slightly gray out rejected jobs
    if (job.status === "Rejected") {
      card.style.opacity = "0.6";
      card.style.backgroundColor = "#f3f3f3";
    }

    card.innerHTML = `
      <div class="job-title">${job.title}</div>
      <div class="job-info">Date: ${job.date}</div>
      <div class="job-info">
        URL: <a href="${job.url}" target="_blank">${new URL(job.url).hostname}</a>
      </div>
      <button class="status-btn" data-index="${index}">
        ${job.status === "Rejected" ? "Mark as Active" : "Mark as Rejected"}
      </button>
      <button class="delete-btn" data-index="${index}">Delete</button>
    `;

    jobList.appendChild(card);
  });

  // Count stats
  const total = jobs.length;
  const rejected = jobs.filter((j) => j.status === "Rejected").length;
  const active = total - rejected;
  updateStats(total, active, rejected);

  // Delete button logic
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.dataset.index;
      jobs.splice(idx, 1);
      chrome.storage.sync.set({ jobs }, () => render(jobs));
    });
  });

  // Status button logic
  document.querySelectorAll(".status-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.dataset.index;
      jobs[idx].status =
        jobs[idx].status === "Rejected" ? "Active" : "Rejected";
      chrome.storage.sync.set({ jobs }, () => render(jobs));
    });
  });
}

/**
 * Updates the stats bar at the top.
 */
function updateStats(total, active, rejected) {
  document.getElementById("totalCount").textContent = total;
  document.getElementById("activeCount").textContent = active;
  document.getElementById("rejectedCount").textContent = rejected;
}

// Load jobs on popup open
chrome.storage.sync.get(["jobs"], (result) => {
  render(result.jobs || []);
});