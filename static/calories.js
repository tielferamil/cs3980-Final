
const apiUrl = "http://localhost:8000/calories/";
let dailyTarget = 0; // Default target
let editingFoodId = null; // ID of the food item being edited
let foodDetailsModal; // Modal for food details
let currentFoodList = []; // List of foods
const recipeCache = {}; // Cache for recipes

// Function to check if the user is logged in and fetches calorie data
async function fetchCalories() {
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!response.ok) {
      alert("Failed to fetch calorie data. You may be logged out.");
      return;
    }


    const data = await response.json();
    const totalCalories = data.totalCalories;
    document.getElementById('totalCalories').textContent = totalCalories;

    if (data.target > 0) {
      dailyTarget = data.target;
    }

    document.getElementById('dailyTarget').textContent = dailyTarget > 0 ? dailyTarget : 'Not Set';

    if (dailyTarget === 0) {
      document.getElementById('caloriePercentage').textContent = "Set a target to see percentage";
    } else {
      const percentage = ((totalCalories / dailyTarget) * 100).toFixed(2);
      document.getElementById('caloriePercentage').textContent = percentage + "%";
    }

    const foodList = document.getElementById('foodList');
    foodList.innerHTML = '';
    currentFoodList = data.foods;

    data.foods.forEach((food, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<b>${food.name}</b> &nbsp- ${food.calories} Calories`;

      li.classList.add('food-item-clickable');
      li.addEventListener('click', () => showFoodDetails(food, index));

      const buttonContainer = document.createElement('div');
      buttonContainer.classList.add('button-container');

      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.classList.add('edit');
      editButton.onclick = (e) => {
        e.stopPropagation();
        editFood(index, food.name, food.calories);
      };
      buttonContainer.appendChild(editButton);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('delete');
      deleteButton.onclick = (e) => {
        e.stopPropagation();
        deleteFood(index);
      };
      buttonContainer.appendChild(deleteButton);

      li.appendChild(buttonContainer);
      foodList.appendChild(li);
    });
  } catch (error) {
    alert("Failed to fetch calorie data. Network error or server is down");
    console.error(error);
  }
}

// Function to set the daily calorie target
async function setCalorieTarget() {
  const token = localStorage.getItem("token");
  dailyTarget = document.getElementById('calorieTarget').value;

  if (dailyTarget > 0) {
    await fetch(apiUrl + 'target', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(Number(dailyTarget))
    });

    document.getElementById('dailyTarget').textContent = dailyTarget;
    fetchCalories();
  } else {
    alert("Please enter a valid calorie target.");
  }
}

// Function to log food
async function logFood() {
  const token = localStorage.getItem("token");

  if (dailyTarget === 0) {
    alert("Please set a daily calorie target before logging food.");
    return;
  }

  let name = document.getElementById('foodName').value.trim();
  name = name.charAt(0).toUpperCase() + name.slice(1);

  if (!name) {
    alert("Please enter a food name.");
    return;
  }
  
  try {
    const appId = '93f9f23d';
    const appKey = 'b9ae8e8f821adc2861fa772f51e388e1';

    // Fetch nutrition data from Nutritionix API
    const apiResponse = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-id": appId,
        "x-app-key": appKey
      },
      body: JSON.stringify({ query: name })
    });

    const nutritionData = await apiResponse.json();

    let calories, fat = null, protein = null, carbs = null;

    // Check if the API returned valid data
    if (nutritionData.foods && nutritionData.foods.length > 0) {
      const foodData = nutritionData.foods[0];
      calories = Math.round(foodData.nf_calories);
      fat = foodData.nf_total_fat;
      protein = foodData.nf_protein;
      carbs = foodData.nf_total_carbohydrate;
    } else {
      const manual = prompt(`Could not find data for "${name}". Please enter calories manually:`);
      if (!manual || isNaN(manual)) {
        alert("Invalid calorie input.");
        return;
      }
      calories = Number(manual);
    }

    // Log food to backend
    const response = await fetch(apiUrl + 'log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name, calories, fat, protein, carbs })
    });

    if (!response.ok) {
      alert("Failed to log food to backend");
      return;
    }

    document.getElementById('foodForm').reset();
    fetchCalories();

  } catch (err) {
    console.error("Nutritionix failed:", err);
    const manual = prompt(`Nutrition API error. Please enter calories for "${name}":`);
    if (!manual || isNaN(manual)) {
      alert("Invalid calorie input.");
      return;
    }

    // Log food to backend with manual input
    const response = await fetch(apiUrl + 'log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ name, calories: Number(manual) })
    });

    if (!response.ok) {
      alert("Failed to log food to backend");
      return;
    }

    document.getElementById('foodForm').reset();
    fetchCalories();
  }
}

// Function to update food details
async function updateFood(index, name, calories) {
  const token = localStorage.getItem("token");
  const foodId = currentFoodList[index]._id;

  const response = await fetch(apiUrl + `log/${foodId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ name, calories: Number(calories) })
  });

  if (!response.ok) {
    alert("Failed to update food");
  }
}

// Function to delete food
async function deleteFood(index) {
  const token = localStorage.getItem("token");
  const foodId = currentFoodList[index]._id;

  const response = await fetch(apiUrl + `log/${foodId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (response.ok) {
    fetchCalories();
  } else {
    alert("Failed to delete food");
  }
}

// Function to edit food details
function editFood(index, name, calories) {
  document.getElementById('foodName').value = name;
  document.getElementById('foodCalories').value = calories;
  editingFoodId = index;
  if (foodDetailsModal) foodDetailsModal.hide();
}

// Function to show food details in a modal
function showFoodDetails(food, index) {
  document.getElementById('modalFoodName').textContent = food.name;
  document.getElementById('modalFoodCalories').textContent = food.calories + ' calories';

  // Calculate and display the percentage of daily target
  const percentage = (dailyTarget > 0)
    ? ((food.calories / dailyTarget) * 100).toFixed(2) + '%'
    : 'Set a daily target to see percentage';
    // Display the data in the modal
  document.getElementById('modalFoodPercentage').textContent = percentage;
  document.getElementById('modalFoodFat').textContent = food.fat ? food.fat + ' g' : 'N/A';
  document.getElementById('modalFoodProtein').textContent = food.protein ? food.protein + ' g' : 'N/A';
  document.getElementById('modalFoodCarbs').textContent = food.carbs ? food.carbs + ' g' : 'N/A';

  document.getElementById('recipeTitle').value = "";
  document.getElementById('recipeIngredients').value = "";
  document.getElementById('recipeInstructions').value = "";

  const token = localStorage.getItem("token");

  // Check if the recipe is already cached
  if (recipeCache[food._id]) {
    const cached = recipeCache[food._id];
    document.getElementById('recipeTitle').value = cached.name || "";
    document.getElementById('recipeIngredients').value = Array.isArray(cached.ingredients)
      ? cached.ingredients.join(", ")
      : cached.ingredients || "";
    document.getElementById('recipeInstructions').value = cached.instructions || "";
  } else { // Fetch the recipe from the server
    fetch(`http://localhost:8000/recipes/food/${food._id}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(recipe => {
        if (recipe) {
          recipeCache[food._id] = recipe;
          document.getElementById('recipeTitle').value = recipe.name || "";
          document.getElementById('recipeIngredients').value = Array.isArray(recipe.ingredients)
            ? recipe.ingredients.join(", ")
            : recipe.ingredients || "";
          document.getElementById('recipeInstructions').value = recipe.instructions || "";
        }
      })
      .catch(err => {
        console.warn("No recipe found or error loading recipe:", err);
      });
  }

  document.getElementById('modalEditButton').onclick = function () {
    editFood(index, food.name, food.calories);
  };

  const saveBtn = document.getElementById("saveRecipeButton");
  if (saveBtn) {
    saveBtn.onclick = saveRecipe;
  }

  foodDetailsModal.show();
}

// Function to save a recipe
async function saveRecipe() {
  const token = localStorage.getItem("token");

  const titleEl = document.getElementById("recipeTitle");
  const ingredientsEl = document.getElementById("recipeIngredients");
  const instructionsEl = document.getElementById("recipeInstructions");
  const title = titleEl.value.trim();
  const ingredients = ingredientsEl.value.trim().split(",").map(s => s.trim());
  const instructions = instructionsEl.value.trim();

  const food = currentFoodList.find(f => f.name === document.getElementById('modalFoodName').textContent);
  const foodId = food?._id || null;

  const response = await fetch("http://localhost:8000/recipes/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      food_id: foodId,
      name: title,
      ingredients,
      instructions
    })
  });

  if (response.ok) {
    alert("Recipe saved!");
    recipeCache[foodId] = {
      food_id: foodId,
      name: title,
      ingredients,
      instructions
    };

    titleEl.value = "";
    ingredientsEl.value = "";
    instructionsEl.value = "";
  }
}
