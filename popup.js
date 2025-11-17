// ======================================
// ApplyTracker Popup Logic
// ======================================

// Keep all popup elements handy so we can update them quickly.
const saveButton = document.getElementById("saveButton");
const jobList = document.getElementById("jobList");
const emptyMsg = document.getElementById("emptyMsg");
const searchInput = document.getElementById("searchInput");
const logoutButton = document.getElementById("logoutButton");
const resumesButton = document.getElementById("resumesButton");
const totalCount = document.getElementById("totalCount");
const activeCount = document.getElementById("activeCount");
const rejectedCount = document.getElementById("rejectedCount");
const acceptedCount = document.getElementById("acceptedCount");

// Store jobs so we can re-render without pinging the API every time.
let jobsCache = [];
let filteredJobs = [];

initPopup();

// Kick off the popup by wiring events and fetching the latest jobs.
function initPopup() {
  saveButton?.addEventListener("click", handleSaveJob);
  searchInput?.addEventListener("input", handleSearch);
  logoutButton?.addEventListener("click", forceLogout);
  resumesButton?.addEventListener("click", () => (window.location.href = "resumes.html"));

  ensureToken()
    .then(loadJobs)
    .catch((err) => {
      if (err.message !== "AUTH_REQUIRED") {
        console.error(err);
        alert("Unable to load jobs. Please try again.");
      }
    });
}

// Save the current browser tab as a new job entry.
async function handleSaveJob() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const normalizedTitle = sanitizeTitle(tab);
    const payload = {
      title: normalizedTitle,
      url: tab.url || "N/A",
      date: new Date().toISOString(),
      status: "Active",
    };

    await apiRequest("/jobs", { method: "POST", body: payload });
    await loadJobs();
  } catch (err) {
    console.error("Error saving job:", err);
    alert(err.message || "Could not save this job.");
  }
}

// Clean page titles so the job list stays readable.
function sanitizeTitle(tab) {
  let fallbackHost = "Unknown page";
  try {
    const url = new URL(tab.url);
    fallbackHost = url.hostname.replace("www.", "") || fallbackHost;
  } catch (err) {
    // ignore
  }

  const baseTitle = (tab.title || "").split("–")[0].split("-")[0].trim();
  return baseTitle.length >= 3 ? baseTitle : fallbackHost;
}

// Pull the latest jobs from the server and show them.
async function loadJobs() {
  try {
    const response = await apiRequest("/jobs");
    const jobs = Array.isArray(response) ? response : response?.jobs || [];
    jobsCache = jobs;
    filteredJobs = jobs;
    renderJobs(jobsCache);
  } catch (err) {
    if (err.message === "AUTH_REQUIRED") return;
    console.error("Failed to load jobs:", err);
    alert(err.message || "Failed to load jobs.");
  }
}

// Build the job cards list inside the popup.
function renderJobs(jobs) {
  // Start fresh for every render so we don't stack duplicates.
  jobList.innerHTML = "";

  if (!jobs.length) {
    // Show the empty-state message when there are no jobs to show.
    emptyMsg.style.display = "block";
    updateStats([]);
    return;
  }

  // There are jobs, so hide the empty-state message.
  emptyMsg.style.display = "none";

  // Build each job card with action buttons and visuals.
  jobs.forEach((job) => {
    const li = document.createElement("li");
    li.className = "job-card";
    // Main card layout: title, info line, placeholder for buttons.
    li.innerHTML = `
      <div class="job-title">${job.title || "Untitled Job"}</div>
      <div class="job-info">${formatDate(job.date)} · <a href="${job.url}" target="_blank">${extractHost(job.url)}</a></div>
      <div class="btn-container"></div>
    `;

    const btnContainer = li.querySelector(".btn-container");

    // Toggle between Active and Rejected.
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "status-btn";
    toggleBtn.textContent = job.status === "Rejected" ? "Mark Active" : "Mark Rejected";
    toggleBtn.addEventListener("click", () =>
      updateJobStatus(job, job.status === "Rejected" ? "Active" : "Rejected")
    );
    btnContainer.appendChild(toggleBtn);

    // Toggle between Active and Accepted.
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "accept-btn";
    acceptBtn.textContent = job.status === "Accepted" ? "Mark Active" : "Mark Accepted";
    acceptBtn.addEventListener("click", () =>
      updateJobStatus(job, job.status === "Accepted" ? "Active" : "Accepted")
    );
    btnContainer.appendChild(acceptBtn);

    // Remove the job entirely.
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteJob(job));
    btnContainer.appendChild(deleteBtn);

    // Dim rejected cards so they look less prominent.
    if (job.status === "Rejected") {
      li.style.opacity = "0.6";
      li.style.backgroundColor = "#f3f3f3";
    }

    jobList.appendChild(li);
  });
  updateStats(jobs);
}

// Show quick stats so the user knows their progress.
function updateStats(jobs) {
  const total = jobs.length;
  const active = jobs.filter((job) => job.status === "Active").length;
  const rejected = jobs.filter((job) => job.status === "Rejected").length;
  const accepted = jobs.filter((job) => job.status === "Accepted").length;

  totalCount.textContent = total;
  activeCount.textContent = active;
  rejectedCount.textContent = rejected;
  acceptedCount.textContent = accepted;
}

// Filter visible jobs as the user types in the search box.
function handleSearch(e) {
  const term = e.target.value.toLowerCase();
  filteredJobs = jobsCache.filter((job) => {
    return (
      job.title?.toLowerCase().includes(term) ||
      job.url?.toLowerCase().includes(term) ||
      job.status?.toLowerCase().includes(term)
    );
  });
  renderJobs(filteredJobs);
}

// Toggle Active/Rejected/Accepted states via the API.
async function updateJobStatus(job, status) {
  try {
    const id = job._id || job.id || job.jobId;
    if (!id) throw new Error("Missing job identifier.");
    await apiRequest(`/jobs/${id}`, {
      method: "PATCH",
      body: { status },
    });
    await loadJobs();
  } catch (err) {
    console.error("Status update failed:", err);
    alert(err.message || "Could not update job status.");
  }
}

// Remove a job completely after a quick confirmation.
async function deleteJob(job) {
  if (!confirm("Remove this job from your list?")) return;
  try {
    const id = job._id || job.id || job.jobId;
    if (!id) throw new Error("Missing job identifier.");
    await apiRequest(`/jobs/${id}`, { method: "DELETE" });
    await loadJobs();
  } catch (err) {
    console.error("Delete failed:", err);
    alert(err.message || "Could not delete job.");
  }
}

// Format timestamps into short human dates.
function formatDate(value) {
  if (!value) return "Unknown date";
  try {
    return new Date(value).toLocaleDateString();
  } catch (err) {
    return value;
  }
}

// Show only the site host instead of the full URL.
function extractHost(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch (err) {
    return "Open";
  }
}
