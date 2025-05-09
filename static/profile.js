document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login";
    return;
  }

  const res = await fetch("/profile-data", {
    headers: { "Authorization": "Bearer " + token }
  });

  const data = await res.json();
  if (data.profile_picture) {
    document.getElementById("profilePreview").src = `/static/uploads/${data.profile_picture}?t=${Date.now()}`;
  }

  document.getElementById("profileUsername").textContent = data.username;
  document.getElementById("profileTarget").textContent = data.target || "Not Set";
  document.getElementById("profileLogCount").textContent = data.logCount;

  // Convert back from metric to imperial for display
  document.getElementById("weight").value = data.weight ? (data.weight / 0.453592).toFixed(1) : '';
  document.getElementById("height").value = data.height ? (data.height / 0.0254).toFixed(1) : '';
  document.getElementById("bmiValue").textContent = data.bmi !== null ? data.bmi : 'N/A';

  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const weightLbs = parseFloat(document.getElementById("weight").value);
    const heightInches = parseFloat(document.getElementById("height").value);

    // Convert to metric before sending to backend
    const weightKg = weightLbs * 0.453592;
    const heightMeters = heightInches * 0.0254;

    const resp = await fetch("/profile-data", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ weight: weightKg, height: heightMeters })
    });

    if (resp.ok) {
      // Re-fetch updated profile data to refresh profile picture
      const res2 = await fetch("/profile-data", {
        headers: { "Authorization": "Bearer " + token }
      });
      const updatedData = await res2.json();

      if (updatedData.profile_picture) {
        document.getElementById("profilePreview").src = `/static/uploads/${updatedData.profile_picture}?t=${Date.now()}`;

      }

      alert("Profile updated!");
    } else {
      alert("Failed to update profile.");
    }
  });
});