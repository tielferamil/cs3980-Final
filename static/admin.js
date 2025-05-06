// admin.js
async function loadAdminData() {
    const token = localStorage.getItem("token");
    if (!token) {
      document.getElementById("adminData").innerHTML = "<p>You are not logged in.</p>";
      return;
    }

    // Check if the user is an admin
    try {
      const res = await fetch("http://localhost:8000/admin/users", {
        headers: { "Authorization": "Bearer " + token }
      });

      if (res.status === 403) {
        document.getElementById("adminData").innerHTML = "<p>Access denied. You must be an admin.</p>";
        return;
      }

      if (!res.ok) {
        document.getElementById("adminData").innerHTML = "<p>Failed to load users.</p>";
        return;
      }
      // Fetch all users
      const users = await res.json();
      const container = document.getElementById("adminData");
      container.innerHTML = "<h3>All Users</h3><ul class='list-group'>";
      // Display users in a list
      users.forEach(u => {
        container.innerHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
          ${u.username}
          <span class="badge ${u.is_admin ? 'bg-success' : 'bg-secondary'}">${u.is_admin ? 'Admin' : 'User'}</span>
        </li>`;
      });
      container.innerHTML += "</ul>";
    } catch (err) {
      document.getElementById("adminData").innerHTML = "<p>Error loading data.</p>";
      console.error(err);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  window.addEventListener("DOMContentLoaded", loadAdminData);