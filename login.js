document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });

    // Save token for later requests
    await chrome.storage.local.set({ token: data.token });

    alert("Login successful!");
    window.location.href = "popup.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
});
