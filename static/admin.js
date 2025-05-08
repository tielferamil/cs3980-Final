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
        const listItem = document.createElement("li");
        listItem.className = "list-group-item d-flex justify-content-between align-items-center";

        const userInfo = document.createElement("span");
        userInfo.innerHTML = `
          ${u.username}
          <span class="badge ${u.is_admin ? 'bg-success' : 'bg-secondary'}">${u.is_admin ? 'Admin' : 'User'}</span>
        `;

        const buttons = document.createElement("div");

        if (u.is_admin) {
          const demoteBtn = document.createElement("button");
          demoteBtn.textContent = "Demote";
          demoteBtn.className = "btn btn-sm btn-outline-warning me-2";
          demoteBtn.onclick = () => demoteUser(u.username);
          buttons.appendChild(demoteBtn);
        } else {
          const promoteBtn = document.createElement("button");
          promoteBtn.textContent = "Promote";
          promoteBtn.className = "btn btn-sm btn-outline-primary me-2";
          promoteBtn.onclick = () => promoteUser(u.username);
          buttons.appendChild(promoteBtn);
        }

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "btn btn-sm btn-outline-danger";
        deleteBtn.onclick = () => deleteUser(u.username);
        buttons.appendChild(deleteBtn);

        listItem.appendChild(userInfo);
        listItem.appendChild(buttons);
        container.appendChild(listItem);
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      document.getElementById("adminData").innerHTML = "<p>Error loading users.</p>";
    }
  }

  // promote user to admin
  async function promoteUser(username) {
    const token = localStorage.getItem("token");
    if (!confirm('Promote this user to admin?')) return;
    try {
      const res = await fetch(`http://localhost:8000/admin/promote/${username}`, {
        method: "PUT",
        headers: { "Authorization": "Bearer " + token }
      });

      if (res.ok) {
        alert("User promoted to admin.");
        loadAdminData();
      } else {
        alert("Failed to promote user.");
      }
    } catch (error) {
      console.error("Error promoting user:", error);
    }
  }

  // delete user from database
  async function deleteUser(username) {
    const token = localStorage.getItem("token");
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`http://localhost:8000/admin/delete/${username}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
      });

      if (res.ok) {
        alert("User deleted.");
        loadAdminData();
      } else {
        alert("Failed to delete user.");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  async function demoteUser(username) {
  const token = localStorage.getItem("token");
  if (!confirm('Demote this user from admin?')) return;
  try {
    const res = await fetch(`http://localhost:8000/admin/demote/${username}`, {
      method: "PUT",
      headers: { "Authorization": "Bearer " + token }
    });

    if (res.ok) {
      alert("User demoted from admin.");
      loadAdminData();
    } else {
      alert("Failed to demote user.");
    }
  } catch (error) {
    console.error("Error demoting user:", error);
  }
}


  // logout function
  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  window.addEventListener("DOMContentLoaded", loadAdminData);
