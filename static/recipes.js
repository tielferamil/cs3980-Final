// Serves recipe page
// Load and delete recipes
async function loadRecipes() {
  const token = localStorage.getItem("token");
  const container = document.getElementById("recipesContainer");
  const noRecipesMessage = document.getElementById("noRecipesMessage");

  container.innerHTML = "";
  noRecipesMessage.style.display = "none"; // Hide it initially

  try {
    const response = await fetch("http://localhost:8000/recipes/", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!response.ok) {
      container.innerHTML = `<p class="text-center w-100 text-danger">Failed to load recipes. You may be logged out.</p>`;
      noRecipesMessage.style.display = "block";
      return;
    }

    const recipes = await response.json();

    if (recipes.length === 0) {
      noRecipesMessage.style.display = "block";
      return;
    }

    noRecipesMessage.style.display = "none"; // Hide if recipes are found

    recipes.forEach(recipe => {
      const col = document.createElement("div");
      col.className = "col";

      // creates card for the recipes
      const card = `
        <div class="card h-100 shadow-sm border border-1 rounded-4" style="background-color: #fdfdfd;">
          <div class="card-body d-flex flex-column p-4">
            <h5 class="card-title mb-3 text-dark fw-semibold">${recipe.name}</h5>
            <div class="mb-3 overflow-auto" style="max-height: 130px;">
              <strong class="text-muted">Ingredients:</strong>
              <p class="mb-0 small" style="white-space: pre-wrap;">${Array.isArray(recipe.ingredients) ? recipe.ingredients.join(", ") : recipe.ingredients}</p>
            </div>
            <div class="overflow-auto" style="max-height: 130px;">
              <strong class="text-muted">Instructions:</strong>
              <p class="mb-0 small" style="white-space: pre-wrap;">${recipe.instructions}</p>
              <button class="btn btn-sm btn-danger delete-btn mt-3" onclick="deleteRecipe('${recipe._id}')">Delete</button>
            </div>
          </div>
        </div>
      `;

      col.innerHTML = card;
      container.appendChild(col);
    });
  } catch (err) {
    container.innerHTML = `<p class="text-center w-100 text-danger">Error loading recipes.</p>`;
    noRecipesMessage.style.display = "block";
    console.error(err);
  }
}

async function deleteRecipe(recipeId) {
  const token = localStorage.getItem("token");

  if (!confirm("Are you sure you want to delete this recipe?")) return;

  try {
    const response = await fetch(`http://localhost:8000/recipes/${recipeId}`, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (response.ok) {
      alert("Recipe deleted.");
      loadRecipes();
    } else {
      alert("Failed to delete recipe.");
    }
  } catch (err) {
    console.error("Error deleting recipe:", err);
    alert("An error occurred while deleting.");
  }
}


window.deleteRecipe = deleteRecipe;