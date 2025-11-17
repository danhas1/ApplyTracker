document.getElementById("registerBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const data = await apiRequest("/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    });

    alert("Registration successful!");
    window.location.href = "login.html";
  } catch (err) {
    alert("Error: " + err.message);
  }
});
