const apiUrl = "http://localhost:8000/calories/";
let dailyTarget = 0; //tracks the daily calorie target
let editingFoodId = null; //tracks which food item is being edited

//modal ref
let foodDetailsModal;
//track current food list
let currentFoodList = [];

//initializes the modal
document.addEventListener('DOMContentLoaded', function () {
    foodDetailsModal = new bootstrap.Modal(document.getElementById('foodDetailsModal'));
});

//fetches calorie data from the backend
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
        currentFoodList = data.foods; //store food data for reference

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

//sets the daily calorie target
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

//logs a new food item or update an existing one
async function logFood() {
    const token = localStorage.getItem("token");

    if (dailyTarget === 0) {
        alert("Please set a daily calorie target before logging food.");
        return;
    }

    let name = document.getElementById('foodName').value;
    name = name.charAt(0).toUpperCase() + name.slice(1);

    const calories = document.getElementById('foodCalories').value;

    if (editingFoodId !== null) {
        //if editing it sends a PUT request to update the food item
        await updateFood(editingFoodId, name, calories);
        editingFoodId = null; // Reset editing state
    } else {
        //if it is not editing, send a POST request to log a new food item
        const response = await fetch(apiUrl + 'log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 
                'Authorization': 'Bearer ' + token},
            body: JSON.stringify({ name, calories: Number(calories) })
        });

        if (!response.ok) {
            alert("Failed to log food");
            return;
        }
    }

    document.getElementById('foodForm').reset();
    fetchCalories();
}

//update an existing food
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

//deletes food item
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

//populates the form with a food item's data for editing
function editFood(index, name, calories, recipe = '') {
    document.getElementById('foodName').value = name;
    document.getElementById('foodCalories').value = calories;
    editingFoodId = index;

    if (foodDetailsModal) foodDetailsModal.hide();
}

//shows the food details in a modal
function showFoodDetails(food, index) {
    document.getElementById('modalFoodName').textContent = food.name;
    document.getElementById('modalFoodCalories').textContent = food.calories + ' calories';

    const percentage = (dailyTarget > 0)
        ? ((food.calories / dailyTarget) * 100).toFixed(2) + '%'
        : 'Set a daily target to see percentage';
    document.getElementById('modalFoodPercentage').textContent = percentage;

    document.getElementById('recipeTitle').value = food.name || "";
    document.getElementById('recipeIngredients').value = "";
    document.getElementById('recipeInstructions').value = "";

    fetch(`http://localhost:8000/recipes/food/${food._id}`)
        .then(res => res.json())
        .then(recipe => {
            if (recipe && recipe.title) {
                document.getElementById('recipeTitle').value = recipe.title;
                document.getElementById('recipeIngredients').value = recipe.ingredients;
                document.getElementById('recipeInstructions').value = recipe.instructions;
            }
        })
        .catch(err => {
            console.warn("No recipe found or error loading recipe:", err);
        });

    document.getElementById('modalEditButton').onclick = function () {
        editFood(index, food.name, food.calories);
    };

    const saveBtn = document.getElementById("saveRecipeButton");
    if (saveBtn) {
        saveBtn.onclick = saveRecipe;
    }

    foodDetailsModal.show();
}


//logout function
function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login"; // Redirect to login page
}

//loads calorie data on index page load only
if (window.location.pathname === "/") {
    fetchCalories();
}

async function saveRecipe() {
    const token = localStorage.getItem("token");

    const titleEl = document.getElementById("recipeTitle");
    const ingredientsEl = document.getElementById("recipeIngredients");
    const instructionsEl = document.getElementById("recipeInstructions");
    const title = titleEl.value.trim();
    const ingredients = ingredientsEl.value.trim();
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
            title,
            ingredients,
            instructions,
            food_id: foodId
        })
    });

    if (response.ok) {
        alert("Recipe saved!");
        titleEl.value = "";
        ingredientsEl.value = "";
        instructionsEl.value = "";
    } else {
        alert("Failed to save recipe.");
    }
}

// checks if the user is an admin and shows the admin nav item
async function checkIfAdmin() {
    const token = localStorage.getItem("token");
    const res = await fetch("/me", {
      headers: { "Authorization": "Bearer " + token }
    });
    const user = await res.json();
    if (user.is_admin) {
      document.getElementById("adminNavItem").classList.remove("d-none");
    }
  }
  
  if (window.location.pathname !== "/login") {
    checkIfAdmin();
  }
  


window.logout = logout;
