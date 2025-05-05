// Global variables
let currentGoals = [];
let goalDetailsModal;
let currentGoalId = null;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function () {
  goalDetailsModal = new bootstrap.Modal(document.getElementById('goalDetailsModal'));

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  document.getElementById('targetDate').valueAsDate = defaultDate;

  document.getElementById('goalType').addEventListener('change', handleGoalTypeChange);
  document.getElementById('updateProgressBtn').addEventListener('click', updateGoalProgress);
  document.getElementById('editGoalBtn').addEventListener('click', editCurrentGoal);
  document.getElementById('deleteGoalBtn').addEventListener('click', deleteCurrentGoal);

  fetchGoals();
});

// Helper: Show in-page Bootstrap alert
function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('feedbackAlert');
  alertBox.className = `alert alert-${type}`;
  alertBox.textContent = message;
  alertBox.classList.remove('d-none');

  setTimeout(() => {
    alertBox.classList.add('d-none');
  }, 3000);
}

function handleGoalTypeChange() {
  const goalType = document.getElementById('goalType').value;
  const measurementUnitSelect = document.getElementById('measurementUnit');
  measurementUnitSelect.innerHTML = '';

  switch (goalType) {
    case 'weight':
      addOptions(measurementUnitSelect, ['kg', 'lbs']); break;
    case 'nutrition':
      addOptions(measurementUnitSelect, ['calories', 'grams', 'servings']); break;
    case 'exercise':
      addOptions(measurementUnitSelect, ['mins', 'steps', 'sessions', 'km', 'miles']); break;
    case 'water':
      addOptions(measurementUnitSelect, ['cups', 'ml', 'oz', 'liters']); break;
    case 'custom':
      addOptions(measurementUnitSelect, ['none', 'times', 'days', 'sessions', 'units']); break;
  }
}

function addOptions(selectElement, options) {
  options.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    selectElement.appendChild(optionElement);
  });
}

async function saveGoal() {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/login");

  const goalType = document.getElementById('goalType').value;
  const goalTitle = document.getElementById('goalTitle').value;
  const targetValue = parseFloat(document.getElementById('targetValue').value);
  const measurementUnit = document.getElementById('measurementUnit').value;
  const targetDate = document.getElementById('targetDate').value;
  const notes = document.getElementById('notes').value;

  if (!goalType || !goalTitle || isNaN(targetValue) || !targetDate) {
    showAlert("Please fill in all required fields.", 'danger');
    return;
  }

  const goal = {
    type: goalType,
    title: goalTitle,
    targetValue,
    currentValue: 0,
    measurementUnit,
    targetDate,
    notes
  };

  try {
    const response = await fetch('/goals/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(goal)
    });

    if (!response.ok) throw new Error('Failed to save goal');

    // Reset form
    document.getElementById('goalForm').reset();
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    document.getElementById('targetDate').valueAsDate = defaultDate;

    // Wait for fetchGoals to complete before proceeding
    await fetchGoals();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showAlert("Goal saved successfully!");
  } catch (error) {
    console.error(error);
    showAlert("Failed to save goal. Please try again.", 'danger');
  }
}

async function fetchGoals() {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/login");

  try {
    const response = await fetch('/goals/list', {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });

    if (!response.ok) throw new Error('Failed to fetch goals');

    currentGoals = await response.json();
    displayGoals();
    updateProgressSummary();
  } catch (error) {
    console.error('Error fetching goals:', error);
  }
}

function displayGoals() {
  const goalsContainer = document.getElementById('goalsContainer');
  const noGoalsMessage = document.getElementById('noGoalsMessage');

  if (currentGoals.length === 0) {
    noGoalsMessage.style.display = 'block';
    goalsContainer.innerHTML = '';
    return;
  }

  noGoalsMessage.style.display = 'none';
  goalsContainer.innerHTML = '';

  currentGoals.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.targetDate) - new Date(b.targetDate);
  });

  currentGoals.forEach(goal => {
    const goalCard = document.createElement('div');
    goalCard.className = `card mb-3 ${goal.completed ? 'border-success' : ''}`;
    const formattedDate = new Date(goal.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const icon = getGoalTypeIcon(goal.type);
    const daysRemaining = getDaysRemaining(goal.targetDate);
    const daysRemainingText = daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Deadline passed';
    const progress = goal.progress || Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) || 0;

    goalCard.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center">
          <h5 class="card-title">${icon} ${goal.title} ${goal.completed ? '<span class="badge bg-success">Completed</span>' : ''}</h5>
          <span class="badge ${daysRemaining > 7 ? 'bg-primary' : daysRemaining > 0 ? 'bg-warning' : 'bg-danger'}">
            ${daysRemainingText}
          </span>
        </div>
        <div class="card-text mb-2">
          <small class="text-muted">Target: ${goal.targetValue} ${goal.measurementUnit} by ${formattedDate}</small>
        </div>
        <div class="progress mb-2">
          <div class="progress-bar ${goal.completed ? 'bg-success' : ''}" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
        </div>
        <button class="btn btn-sm btn-primary view-goal-btn" data-goal-id="${goal._id}">View Details</button>
      </div>
    `;

    goalCard.querySelector('.view-goal-btn').addEventListener('click', () => showGoalDetails(goal));
    goalsContainer.appendChild(goalCard);
  });
}

function updateProgressSummary() {
  const total = currentGoals.length;
  const completed = currentGoals.filter(g => g.completed).length;
  const inProgress = total - completed;
  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('goalsCompleted').textContent = completed;
  document.getElementById('goalsInProgress').textContent = inProgress;
  document.getElementById('overallProgress').textContent = `${progressPercent}%`;

  const bar = document.getElementById('progressBar');
  bar.style.width = `${progressPercent}%`;
  bar.setAttribute('aria-valuenow', progressPercent);
}

function getGoalTypeIcon(type) {
  return {
    weight: '⚖️',
    nutrition: '🍎',
    exercise: '🏃',
    water: '💧',
    custom: '🎯'
  }[type] || '📋';
}

function getDaysRemaining(targetDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function showGoalDetails(goal) {
  currentGoalId = goal._id;
  const icon = getGoalTypeIcon(goal.type);
  document.getElementById('goalDetailsModalLabel').innerHTML = `${icon} Goal Details`;
  document.getElementById('modalGoalTitle').textContent = goal.title;
  document.getElementById('modalGoalType').textContent = goal.type.charAt(0).toUpperCase() + goal.type.slice(1);
  document.getElementById('modalTargetValue').textContent = `${goal.targetValue} ${goal.measurementUnit}`;
  document.getElementById('modalTargetDate').textContent = new Date(goal.targetDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('modalNotes').textContent = goal.notes || 'No notes provided';

  const progress = goal.progress || Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) || 0;
  const progressBar = document.getElementById('modalProgressBar');
  progressBar.style.width = `${progress}%`;
  progressBar.textContent = `${progress}%`;
  progressBar.className = 'progress-bar ' + (
    goal.completed ? 'bg-success' :
      progress >= 75 ? 'bg-success' :
        progress >= 50 ? 'bg-info' :
          progress >= 25 ? 'bg-warning' : 'bg-danger'
  );
  document.getElementById('modalProgressText').textContent = `${progress}% (Current: ${goal.currentValue} ${goal.measurementUnit})`;
  document.getElementById('progressUpdate').value = goal.currentValue;
  goalDetailsModal.show();
}

async function updateGoalProgress() {
  if (!currentGoalId) return;
  const goal = currentGoals.find(g => g._id === currentGoalId);
  if (!goal) return;

  const newValue = parseFloat(document.getElementById('progressUpdate').value);
  if (isNaN(newValue)) return showAlert('Please enter a valid number', 'danger');

  const percentage = Math.min(100, Math.round((newValue / goal.targetValue) * 100));
  const completed = percentage >= 100;

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/goals/${currentGoalId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ currentValue: newValue, progress: percentage, completed })
    });

    if (!response.ok) throw new Error('Failed to update goal');

    // Wait for fetchGoals to complete
    await fetchGoals();
    goalDetailsModal.hide();
    showAlert("Progress updated!");
  } catch (error) {
    console.error(error);
    showAlert("Failed to update goal.", 'danger');
  }
}

async function editCurrentGoal() {
  if (!currentGoalId) return;
  const goal = currentGoals.find(g => g._id === currentGoalId);
  if (!goal) return;

  goalDetailsModal.hide();
  document.getElementById('goalType').value = goal.type;
  handleGoalTypeChange();
  document.getElementById('goalTitle').value = goal.title;
  document.getElementById('targetValue').value = goal.targetValue;
  document.getElementById('measurementUnit').value = goal.measurementUnit;
  document.getElementById('targetDate').value = goal.targetDate.split('T')[0];
  document.getElementById('notes').value = goal.notes || '';

  document.getElementById('goalForm').scrollIntoView({ behavior: 'smooth' });
  const saveBtn = document.querySelector('#goalForm button[type="button"]');
  saveBtn.textContent = 'Update Goal';
  saveBtn.onclick = () => updateGoal(currentGoalId);
}

async function updateGoal(goalId) {
  const token = localStorage.getItem("token");
  if (!token) return (window.location.href = "/login");

  const goalType = document.getElementById('goalType').value;
  const goalTitle = document.getElementById('goalTitle').value;
  const targetValue = parseFloat(document.getElementById('targetValue').value);
  const measurementUnit = document.getElementById('measurementUnit').value;
  const targetDate = document.getElementById('targetDate').value;
  const notes = document.getElementById('notes').value;

  if (!goalType || !goalTitle || isNaN(targetValue) || !targetDate) {
    showAlert("Please fill in all required fields.", 'danger');
    return;
  }

  const goal = { type: goalType, title: goalTitle, targetValue, measurementUnit, targetDate, notes };

  try {
    const response = await fetch(`/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(goal)
    });

    if (!response.ok) throw new Error('Failed to update goal');

    // Reset form
    document.getElementById('goalForm').reset();
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    document.getElementById('targetDate').valueAsDate = defaultDate;

    const saveBtn = document.querySelector('#goalForm button[type="button"]');
    saveBtn.textContent = 'Save Goal';
    saveBtn.onclick = saveGoal;

    // Wait for fetchGoals to complete
    await fetchGoals();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    showAlert("Goal updated successfully!");
  } catch (error) {
    console.error(error);
    showAlert("Failed to update goal.", 'danger');
  }
}

async function deleteCurrentGoal() {
  if (!currentGoalId) return;
  if (!confirm('Are you sure you want to delete this goal?')) return;

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`/goals/${currentGoalId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });

    if (!response.ok) throw new Error('Failed to delete goal');

    // Wait for fetchGoals to complete
    await fetchGoals();
    goalDetailsModal.hide();
    showAlert("Goal deleted successfully!");
  } catch (error) {
    console.error(error);
    showAlert("Failed to delete goal.", 'danger');
  }
}

window.saveGoal = saveGoal;