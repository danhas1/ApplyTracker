const uploadInput = document.getElementById("uploadResume");
const resumeList = document.getElementById("resumeList");
const backBtn = document.getElementById("backBtn");

initResumes();

function initResumes() {
  backBtn?.addEventListener("click", () => (window.location.href = "popup.html"));
  uploadInput?.addEventListener("change", handleUpload);

  ensureToken()
    .then(loadResumes)
    .catch((err) => {
      if (err.message !== "AUTH_REQUIRED") {
        console.error(err);
        alert("Unable to load resumes.");
      }
    });
}

async function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const formData = new FormData();
    formData.append("file", file);
    await apiRequest("/resumes", { method: "POST", body: formData });
    uploadInput.value = "";
    await loadResumes();
  } catch (err) {
    console.error("Upload failed:", err);
    alert(err.message || "Could not upload the resume.");
  }
}

async function loadResumes() {
  try {
    const response = await apiRequest("/resumes");
    const resumes = Array.isArray(response) ? response : response?.resumes || [];
    renderResumes(resumes);
  } catch (err) {
    if (err.message !== "AUTH_REQUIRED") {
      console.error("Failed to fetch resumes:", err);
      alert(err.message || "Failed to load resumes.");
    }
  }
}

function renderResumes(resumes) {
  resumeList.innerHTML = "";

  if (!resumes.length) {
    const li = document.createElement("li");
    li.textContent = "No resumes uploaded yet.";
    resumeList.appendChild(li);
    return;
  }

  resumes.forEach((resume) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <a href="${resume.url}" target="_blank" rel="noopener noreferrer">${resume.name || "Unnamed resume"}</a>
      <button data-id="${resume._id || resume.id}" class="deleteBtn">🗑</button>
    `;
    resumeList.appendChild(li);
  });

  resumeList.querySelectorAll(".deleteBtn").forEach((btn) =>
    btn.addEventListener("click", (event) => handleDelete(event.target.dataset.id))
  );
}

async function handleDelete(id) {
  if (!id) return alert("Resume id missing.");
  if (!confirm("Delete this resume?")) return;
  try {
    await apiRequest(`/resumes/${id}`, { method: "DELETE" });
    await loadResumes();
  } catch (err) {
    console.error("Delete failed:", err);
    alert(err.message || "Could not delete this resume.");
  }
}
