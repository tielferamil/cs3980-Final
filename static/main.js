document.addEventListener('DOMContentLoaded', function () {
    const pathname = window.location.pathname;
  
    if (pathname === "/") {
      fetchCalories();
    } else if (pathname === "/recipes" || pathname === "/recipes/") {
      loadRecipes();
    }
  
    if (pathname !== "/login") {
      checkIfAdmin();
    }
  
    const modalElement = document.getElementById('foodDetailsModal');
    if (modalElement) {
      foodDetailsModal = new bootstrap.Modal(modalElement);
    }
  });
  
  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }
  window.logout = logout;
  
  async function checkIfAdmin() {
    const token = localStorage.getItem("token");
    const res = await fetch("/me", {
      headers: { "Authorization": "Bearer " + token }
    });
    const user = await res.json();
    if (user.is_admin) {
      document.getElementById("adminNavItem")?.classList.remove("d-none");
    }
  }
  