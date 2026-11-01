//console.log('Hello');

//window.alert('This is an alert')
//window.alert('I like pizza')

// ===== Shared data and element references =====

const resources = [
  "Strength",
  "Dexterity",
  "Endurance",
  "Charisma",
  "Manipulation",
  "Tranquility",
  "Willpower",
  "Instinct",
  "Knowledge",
  "Pyromancy",
  "Terramancy",
  "Hydromancy",
  "Aeromancy",
  "Arcanamancy",
  "Luxmancy",
  "Umbramancy",
  "Floramancy",
  "Faunamancy",
  "Necromancy",
  "Deusmancy",
  "Melodemancy",
];

const recipeIngredients = {};

const modalStack = []; //used to track modals in stack.

const selectedResources = [];
const craftingItemMap = new Map();
let unknownCount = 0; //Used to track amount of ??? ingredient
let editingItemName = null; //used to track if user is editing a new item or doing it through table.
const craftingRecipeMap = new Map();
let selectedRecipeName = null; //used to track if user is editing a recipe or doing it through table.
let editingRecipeName = null;

const resourceSelect = document.getElementById("resourceSelect");
const addButton = document.getElementById("addResource"); //button for adding a resource to an item
const selectedContainer = document.getElementById("selectedResources"); //Contains resources assigned to current item
const resourceSubmitButton = document.getElementById("resource-submit"); //Button for submit within item

//data-modal-target is the attribute we call in html for all modal opening buttons which we will have 2-3 in this program
const openModalButtons = document.querySelectorAll("[data-modal-target]");
const closeModalButtons = document.querySelectorAll("[data-close-button]");
const overlay = document.getElementById("overlay");

// ===== Recipe handling: ingredient picker, form, and editing =====

function updateRecipeDropdown() {
  const dropdown = document.getElementById("recipe-resource-select");
  const alternativeDropdown = document.getElementById(
    "recipe-alternative-resource-select",
  );

  // Clear both dropdowns
  dropdown.replaceChildren();
  alternativeDropdown.replaceChildren();

  // Primary resource placeholder
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select resource...";
  placeholder.disabled = true;
  placeholder.selected = true;

  dropdown.appendChild(placeholder);

  // Alternative resource default option
  const noAlternative = document.createElement("option");
  noAlternative.value = "";
  noAlternative.textContent = "No alternative";
  noAlternative.selected = true;

  alternativeDropdown.appendChild(noAlternative);

  // Populate both dropdowns
  resources.forEach((resource) => {
    // Primary resource option
    const option = document.createElement("option");
    option.value = resource;
    option.textContent = resource;

    dropdown.appendChild(option);

    // Alternative resource option
    const alternativeOption = document.createElement("option");
    alternativeOption.value = resource;
    alternativeOption.textContent = resource;

    alternativeDropdown.appendChild(alternativeOption);
  });
}

document.getElementById("recipe-add-resource").addEventListener("click", () => {
  // Get the primary resource
  const resource = document.getElementById("recipe-resource-select").value;

  // Get the optional alternative resource
  const alternative = document.getElementById(
    "recipe-alternative-resource-select",
  ).value;

  // Get the required quantity
  const quantity = Number(document.getElementById("recipe-quantity").value);

  // Validate input
  if (!resource || !Number.isInteger(quantity) || quantity < 1) {
    alert("Please select a resource and a valid quantity.");
    return;
  }

  // Prevent selecting the same resource twice
  if (alternative && resource === alternative) {
    alert("Primary and alternative resources must be different.");
    return;
  }

  // Create the ingredient key
  const key = alternative ? [resource, alternative].sort().join("/") : resource;

  // Add or update the resource quantity
  recipeIngredients[key] = quantity;

  // Refresh the displayed ingredients
  updateRecipeSelectedIngredients();
});

function updateRecipeSelectedIngredients() {
  const container = document.getElementById("recipe-selected-ingredients");

  container.replaceChildren();

  for (const [resource, amount] of Object.entries(recipeIngredients)) {
    const button = document.createElement("button");
    button.type = "button";

    button.textContent = `${amount} ${resource} ×`;

    button.addEventListener("click", () => {
      delete recipeIngredients[resource];

      updateRecipeSelectedIngredients();
    });

    container.appendChild(button);
  }
}

function clearRecipeForm() {
  document.getElementById("recipe-name").value = "";
  document.getElementById("recipe-description").value = "";
  document.getElementById("recipe-crafted").checked = false;
  repeatableCheckbox.checked = false;
  craftedCountInput.value = 0;
  updateRecipeCraftedFields();
  document.getElementById("recipe-quantity").value = 1;

  // Clear our temporary ingredients
  for (const resource of Object.keys(recipeIngredients)) {
    delete recipeIngredients[resource];
  }

  updateRecipeSelectedIngredients();
  updateRecipeDropdown();
}

document.getElementById("recipe-edit-button").addEventListener("click", () => {
  if (selectedRecipeName === null) return;

  editRecipe(selectedRecipeName);
});

document.getElementById("recipe-submit").addEventListener("click", () => {
  const recipeName = document.getElementById("recipe-name").value.trim();

  const description = document
    .getElementById("recipe-description")
    .value.trim();

  const crafted = document.getElementById("recipe-crafted").checked;
  const repeatable = repeatableCheckbox.checked;
  const rawCount = craftedCountInput.value.trim();
  const enteredCount = Number(rawCount);

  if (
    repeatable &&
    (rawCount === "" || !Number.isInteger(enteredCount) || enteredCount < 0)
  ) {
    alert("Please enter a valid crafted count.");
    return;
  }

  const craftedCount = repeatable ? enteredCount : crafted ? 1 : 0;

  // Validate recipe name
  if (recipeName === "") {
    alert("Please enter a recipe name.");
    return;
  }

  // Validate ingredients
  if (Object.keys(recipeIngredients).length === 0) {
    alert("Please add at least one ingredient.");
    return;
  }

  // EDIT MODE
  if (editingRecipeName !== null) {
    // Ensure the original recipe still exists
    if (!craftingRecipeMap.has(editingRecipeName)) {
      alert("The recipe being edited no longer exists.");
      return;
    }

    // Prevent overwriting a different recipe
    if (recipeName !== editingRecipeName && craftingRecipeMap.has(recipeName)) {
      alert(`${recipeName} already exists.`);
      return;
    }

    // Remove old key only if name changed
    if (recipeName !== editingRecipeName) {
      craftingRecipeMap.delete(editingRecipeName);
    }
  }

  // CREATE MODE
  else if (craftingRecipeMap.has(recipeName)) {
    const shouldUpdate = window.confirm(
      `${recipeName} already exists. Overwrite it?`,
    );

    if (!shouldUpdate) return;
  }

  // Save the recipe
  craftingRecipeMap.set(recipeName, {
    ingredients: { ...recipeIngredients },
    description: description,
    repeatable: repeatable,
    craftedCount: craftedCount,
  });

  saveData();

  // Refresh the Recipe Table
  buildRecipeTable();

  // If editing through Info modal, update its contents
  if (editingRecipeName !== null) {
    selectedRecipeName = recipeName;

    document.getElementById("recipe-info-title").textContent = recipeName;

    document.getElementById("recipe-info-description").textContent =
      description || "No description added yet.";
  }

  // Clear the form
  clearRecipeForm();

  // Close the form and return to the parent modal
  closeModal(document.getElementById("new-recipe-modal"));
});

function editRecipe(recipeName) {
  const recipe = craftingRecipeMap.get(recipeName);

  if (!recipe) return;

  // Reset form before loading existing data
  clearRecipeForm();

  // Enter editing mode
  editingRecipeName = recipeName;

  // Load recipe name
  document.getElementById("recipe-name").value = recipeName;

  // Load description
  document.getElementById("recipe-description").value = recipe.description;

  // Load crafted status

  repeatableCheckbox.checked = recipe.repeatable === true;

  const previousCount = recipe.craftedCount ?? (recipe.crafted ? 1 : 0);
  document.getElementById("recipe-crafted").checked = previousCount > 0;

  craftedCountInput.value = previousCount;

  updateRecipeCraftedFields();

  // Load ingredients
  Object.assign(recipeIngredients, recipe.ingredients);

  // Update visible ingredient buttons
  updateRecipeSelectedIngredients();
  updateRecipeDropdown();

  // Change modal title and submit button
  document.querySelector("#new-recipe-modal .title").textContent =
    "Edit Recipe";

  document.getElementById("recipe-submit").textContent = "Save Changes";

  // Open the existing form
  openModal(document.getElementById("new-recipe-modal"));
}

// ===== Resource item handling: selection and submission =====

function updateDropdown() {
  resourceSelect.innerHTML = "";

  // Create the initial placeholder
  const placeholder = document.createElement("option");

  placeholder.value = "";
  placeholder.textContent = "Select a resource...";
  placeholder.disabled = true;
  placeholder.selected = true;

  resourceSelect.appendChild(placeholder);

  // Populate the available resources
  resources.forEach((resource) => {
    if (!selectedResources.includes(resource)) {
      const option = document.createElement("option");

      option.value = resource;
      option.textContent = resource;

      resourceSelect.appendChild(option);
    }
  });
}
//General location for buttons down here
addButton.addEventListener("click", () => {
  const resource = resourceSelect.value;

  if (!resource) {
    return;
  }

  selectedResources.push(resource);

  updateDropdown();
  updateSelectedResources();
});

//listener for ??? resource
const unknownButton = document.getElementById("addUnknown");

unknownButton.addEventListener("click", () => {
  unknownCount++;
  updateSelectedResources();
});

resourceSubmitButton.addEventListener("click", () => {
  const temp_name = document.getElementById("item-name").value.trim();

  // Validate input
  if (temp_name === "" || selectedResources.length === 0) {
    alert("Error: Can't submit a resource without a name or attributes.");
    return;
  }

  // EDIT MODE
  if (editingItemName !== null) {
    // Prevent overwriting a different existing item
    if (temp_name !== editingItemName && craftingItemMap.has(temp_name)) {
      alert(`${temp_name} already exists. Please choose another name.`);
      return;
    }

    const oldAmount = craftingItemMap.get(editingItemName)?.amount ?? 0;

    // Remove the old entry
    craftingItemMap.delete(editingItemName);

    // Save with the updated resources and previous amount
    craftingItemMap.set(temp_name, {
      resources: [...selectedResources],
      amount: oldAmount,
      unknownCount: unknownCount,
    });

    //Save the data onto our local file system
    saveData();

    // Refresh the resource table
    buildResTable([...craftingItemMap]);

    // Clear inputs
    clearResourceSelection();
    updateDropdown();

    // Close editing modal, returning to parent table
    closeModal(document.getElementById("new-item-modal"));

    // Reset editing mode
    editingItemName = null;

    return;
  }

  // CREATE MODE
  if (craftingItemMap.has(temp_name)) {
    const shouldUpdate = window.confirm(
      `${temp_name} already exists, would you like to update its resources?`,
    );

    if (!shouldUpdate) {
      return;
    }
  }

  // Save new item (or update existing one if confirmed)
  const currentAmount = craftingItemMap.get(temp_name)?.amount ?? 0;

  craftingItemMap.set(temp_name, {
    resources: [...selectedResources],
    amount: currentAmount,
    unknownCount: unknownCount,
  });

  saveData();

  buildResTable([...craftingItemMap]);

  // Show success message
  document.getElementById("resource-success").classList.add("show");

  // Clear inputs for next item
  clearResourceSelection();
  updateDropdown();
});

const successMessage = document.getElementById("resource-success");

document.addEventListener(
  "click",
  () => {
    successMessage.classList.remove("show");
  },
  true,
);

document.addEventListener("input", () => {
  successMessage.classList.remove("show");
});

//End of general location for buttons
function updateSelectedResources() {
  selectedContainer.innerHTML = "";

  selectedResources.forEach((resource) => {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = resource + " ×";

    button.addEventListener("click", () => {
      const index = selectedResources.indexOf(resource);

      selectedResources.splice(index, 1);

      updateDropdown();
      updateSelectedResources(); //This is called so we can remove the item from the array, we only reach this in case we click the remove
    });

    selectedContainer.appendChild(button);
  });
  for (let i = 0; i < unknownCount; i++) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = "??? ×";

    button.addEventListener("click", () => {
      unknownCount--;
      updateSelectedResources();
    });

    selectedContainer.appendChild(button);
  }
}

// button=> and ()=> is the same way as writing function function(button){ something here} or function(){something here}
//it is a shortcut to make a function that this program declares to receive

// ===== General handling: modal stack and open/close events =====

openModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal = document.querySelector(button.dataset.modalTarget);
    openModal(modal);
  });
});

overlay.addEventListener("click", () => {
  if (modalStack.length > 0) {
    const topModal = modalStack[modalStack.length - 1];
    closeModal(topModal);
  }
});

closeModalButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const modal =
      button.closest(
        ".modal",
      ); /* This checks for the closest parent, so we can retrieve the modal to close through this */
    closeModal(modal);
  });
});

function openModal(modal) {
  if (modal == null) return;
  if (modalStack.includes(modal)) return;

  // Actions specific to each modal
  switch (modal.id) {
    case "resource-table-modal":
      buildResTable([...craftingItemMap]);
      break;

    case "recipe-table-modal":
      buildRecipeTable();
      break;

    case "crafting-recipe-modal":
      // Add specific initialization here later
      break;
  }

  // Add the modal to our stack
  modalStack.push(modal);

  // Ensure each new modal appears above the previous one
  modal.style.zIndex = 101 + modalStack.length;

  modal.classList.add("active");
  overlay.classList.add("active");
}

function closeModal(modal) {
  if (modal == null) return;

  // Only allow closing the topmost modal
  if (modalStack[modalStack.length - 1] !== modal) return;

  switch (modal.id) {
    case "new-item-modal":
      if (
        !document.getElementById("item-name").value == "" ||
        !(selectedResources.length == 0)
      ) {
        const shouldUpdate = window.confirm(
          "You have unsaved changes, are you sure you want to close?",
        );
        if (shouldUpdate == false) {
          return;
        }
      }

      clearResourceSelection();
      updateDropdown();

      editingItemName = null;

      break;

    case "recipe-table-modal":
      selectedRecipeName = null;
      break;

    case "new-recipe-modal": {
      const hasUnsavedRecipe =
        document.getElementById("recipe-name").value.trim() !== "" ||
        document.getElementById("recipe-description").value.trim() !== "" ||
        Object.keys(recipeIngredients).length > 0 ||
        document.getElementById("recipe-crafted").checked ||
        repeatableCheckbox.checked ||
        Number(craftedCountInput.value) > 0;

      if (hasUnsavedRecipe) {
        const shouldClose = window.confirm(
          "You have unsaved recipe changes. Close anyway?",
        );

        if (!shouldClose) return;
      }

      // Clear the form
      clearRecipeForm();

      // Reset editing mode
      editingRecipeName = null;

      // Restore original labels
      document.querySelector("#new-recipe-modal .title").textContent =
        "Input New Recipe";

      document.getElementById("recipe-submit").textContent = "Submit Recipe";

      break;
    }

    default:
      // Other modals warning
      break;
  }

  modal.classList.remove("active");
  modalStack.pop();

  if (
    modal.id === "new-item-modal" &&
    modalStack[modalStack.length - 1]?.id === "resource-table-modal"
  ) {
    buildResTable([...craftingItemMap]);
  } //refresh the modal table when you close an outer modal

  // Only remove overlay when ALL modals are closed
  if (modalStack.length === 0) {
    overlay.classList.remove("active");
  }
}

// ===== App initialization and resource form reset =====

function initializeApp() {
  updateDropdown();
  updateSelectedResources();

  updateRecipeDropdown();
  updateRecipeSelectedIngredients();
}

function clearResourceSelection() {
  selectedResources.length = 0;
  unknownCount = 0;

  document.getElementById("item-name").value = "";

  updateDropdown();
  updateSelectedResources();
}

// ===== Resource item table: display, editing, and deletion =====

function buildResTable(arr) {
  var table = document.getElementById("resTable");

  table.innerHTML = "";
  for (const [itemName, item] of arr) {
    const row = table.insertRow();

    // Item name
    row.insertCell(0).textContent = itemName;

    // Resources
    const displayedResources = [
      ...item.resources,
      ...Array(item.unknownCount ?? 0).fill("???"),
    ];

    row.insertCell(1).textContent = displayedResources.join(", ");

    // Edit button
    const editButton = document.createElement("button");
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      editItem(itemName);
    });

    row.insertCell(2).appendChild(editButton);

    //Amount input button

    const amountInput = document.createElement("input");

    amountInput.type = "number";
    amountInput.min = "0";
    amountInput.step = "1";
    amountInput.value = item.amount;

    amountInput.addEventListener("change", () => {
      const rawValue = amountInput.value.trim();
      const newAmount = Number(rawValue);

      if (rawValue === "" || !Number.isInteger(newAmount) || newAmount < 0) {
        alert("Please enter a valid amount (0 or higher).");
        amountInput.value = item.amount;
        return;
      }

      // Update the item stored in the Map
      item.amount = newAmount;

      saveData();
    });

    row.insertCell(3).appendChild(amountInput);

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";

    deleteButton.addEventListener("click", () => {
      if (window.confirm(`Delete ${itemName}?`)) {
        craftingItemMap.delete(itemName);

        saveData();

        buildResTable([...craftingItemMap]);
      }
    });

    row.insertCell(4).appendChild(deleteButton);
  }
}

function editItem(itemName) {
  editingItemName = itemName;

  // Fill the name input
  document.getElementById("item-name").value = itemName;

  // Load previously selected resources
  selectedResources.length = 0;
  selectedResources.push(...craftingItemMap.get(itemName).resources);
  unknownCount = craftingItemMap.get(itemName).unknownCount ?? 0;

  // Update the interface
  updateDropdown();
  updateSelectedResources();

  // Open the existing modal
  openModal(document.getElementById("new-item-modal"));
}

// ===== Recipe table: display, information, and deletion =====

function buildRecipeTable() {
  const table = document.getElementById("recipeTable");

  // Clear existing rows
  table.replaceChildren();

  for (const [recipeName, recipe] of craftingRecipeMap) {
    const row = table.insertRow();

    // Column 1: Recipe name
    row.insertCell(0).textContent = recipeName;

    // Column 2: Ingredients
    const ingredientText = Object.entries(recipe.ingredients)
      .map(([resource, amount]) => `${amount} ${resource}`)
      .join(", ");

    row.insertCell(1).textContent = ingredientText;

    // Column 3: Info button
    const infoButton = document.createElement("button");
    infoButton.type = "button";
    infoButton.textContent = "Info";

    infoButton.addEventListener("click", () => {
      openRecipeInfo(recipeName);
    });

    row.insertCell(2).appendChild(infoButton);

    // Column 4: Crafted
    let craftedText = "No";

    if (recipe.craftedCount > 0) {
      if (recipe.repeatable) {
        craftedText = `Yes x${recipe.craftedCount}`;
      } else {
        craftedText = "Yes";
      }
    }

    row.insertCell(3).textContent = craftedText;

    //to do add logic to check if something is craftable

    // Column 5: Craftable
    const isCraftable = craftableRecipe(recipe.ingredients);

    // Create the button
    const craftableButton = document.createElement("button");

    craftableButton.type = "button";
    craftableButton.textContent = isCraftable ? "Yes" : "No";

    // Give it a CSS class depending on the result
    craftableButton.className = isCraftable ? "craftable-yes" : "craftable-no";

    // Open the appropriate combination modal
    craftableButton.addEventListener("click", () => {
      if (isCraftable) {
        document.getElementById("craftable-recipe-name").textContent =
          recipeName;

        showCraftableCombinations(recipeName, recipe.ingredients);

        openModal(document.getElementById("craftable-combinations-modal"));
      } else {
        document.getElementById("uncraftable-recipe-name").textContent =
          recipeName;

        showClosestCraftingCombinations(recipe.ingredients);

        openModal(document.getElementById("uncraftable-combinations-modal"));
      }
    });

    // Insert the button into column 5
    row.insertCell(4).appendChild(craftableButton);
  }
}

const repeatableCheckbox = document.getElementById("recipe-repeatable");
const craftedCountInput = document.getElementById("recipe-crafted-count");

function updateRecipeCraftedFields() {
  const repeatable = repeatableCheckbox.checked;

  document.getElementById("recipe-crafted-once-field").hidden = repeatable;
  document.getElementById("recipe-crafted-count-field").hidden = !repeatable;
}

repeatableCheckbox.addEventListener("change", updateRecipeCraftedFields);

function openRecipeInfo(recipeName) {
  const recipe = craftingRecipeMap.get(recipeName);

  if (!recipe) return;

  // Remember which recipe we're viewing
  selectedRecipeName = recipeName;

  // Set the title
  document.getElementById("recipe-info-title").textContent = recipeName;

  // Set the description
  document.getElementById("recipe-info-description").textContent =
    recipe.description || "No description added yet.";

  // Open the modal
  openModal(document.getElementById("recipe-info-modal"));
}

document
  .getElementById("recipe-delete-button")
  .addEventListener("click", () => {
    if (selectedRecipeName === null) return;

    const shouldDelete = window.confirm(
      `Are you sure you want to delete ${selectedRecipeName}?`,
    );

    if (!shouldDelete) return;

    // Delete the recipe
    craftingRecipeMap.delete(selectedRecipeName);

    saveData();

    // Refresh the table
    buildRecipeTable();

    // Close the Info modal
    closeModal(document.getElementById("recipe-info-modal"));
  });

// ===== Data: Json manipulation =====

const STORAGE_KEY = "rpgCraftingData_v1";

//This function turns our maps into data that our program can stringify
function collectData() {
  return {
    version: 2,

    items: [...craftingItemMap].map(([name, item]) => ({
      name: name,
      resources: [...item.resources],
      amount: item.amount,
      unknownCount: item.unknownCount ?? 0,
    })),

    recipes: [...craftingRecipeMap].map(([name, recipe]) => ({
      name: name,
      ingredients: { ...recipe.ingredients },
      description: recipe.description,
      repeatable: recipe.repeatable,
      craftedCount: recipe.craftedCount,
    })),
  };
}

function saveData() {
  const snapshot = collectData();
  pendingSaves++;

  const operation = saveQueue.then(async () => {
    if (syncBlocked || currentRevision === null) {
      return false;
    }

    try {
      const response = await fetch("/api/data", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          expectedRevision: currentRevision,
          data: snapshot,
        }),
      });

      // Another device saved changes first.
      if (response.status === 409) {
        syncBlocked = true;

        alert(
          "Another device changed the shared data.\n\n" +
            "Your latest changes were NOT saved.\n\n" +
            "Export JSON to keep your current changes, " +
            "then refresh the page before editing again.",
        );

        return false;
      }

      if (!response.ok) {
        throw new Error(`Save failed (${response.status})`);
      }

      const result = await response.json();

      currentRevision = result.revision;

      return true;
    } catch (error) {
      console.error("Shared save failed:", error);

      syncBlocked = true;

      alert(
        "Could not save to your PC.\n\n" +
          "Your changes are only in this browser tab.\n\n" +
          "Export JSON for a backup, " +
          "then reconnect and refresh.",
      );

      return false;
    }
  });

  saveQueue = operation.finally(() => {
    pendingSaves--;
  });

  return saveQueue;
}

// Warn if someone closes the browser during an unfinished save.
window.addEventListener("beforeunload", (event) => {
  if (pendingSaves > 0) {
    event.preventDefault();
    event.returnValue = "";
  }
});

function applyData(data) {
  // Verify the expected JSON structure
  if (!data || !Array.isArray(data.items) || !Array.isArray(data.recipes)) {
    throw new Error("Invalid crafting data format.");
  }

  const loadedItems = new Map();
  const loadedRecipes = new Map();

  // Reconstruct resource items
  for (const item of data.items) {
    if (typeof item?.name !== "string" || !Array.isArray(item.resources)) {
      throw new Error("Invalid item in saved data.");
    }

    loadedItems.set(item.name, {
      resources: [...item.resources],

      amount:
        Number.isInteger(item.amount) && item.amount >= 0 ? item.amount : 0,

      unknownCount:
        Number.isInteger(item.unknownCount) && item.unknownCount >= 0
          ? item.unknownCount
          : 0,
    });
  }

  // Reconstruct recipes
  for (const recipe of data.recipes) {
    if (
      typeof recipe?.name !== "string" ||
      !recipe.ingredients ||
      typeof recipe.ingredients !== "object" ||
      Array.isArray(recipe.ingredients)
    ) {
      throw new Error("Invalid recipe in saved data.");
    }

    const loadedCount =
      Number.isInteger(recipe.craftedCount) && recipe.craftedCount >= 0
        ? recipe.craftedCount
        : recipe.crafted === true
          ? 1
          : 0;

    const repeatable = recipe.repeatable === true;

    loadedRecipes.set(recipe.name, {
      ingredients: { ...recipe.ingredients },
      description: recipe.description ?? "",
      repeatable: repeatable,

      // Normal recipes can only be crafted once
      craftedCount: repeatable ? loadedCount : Math.min(loadedCount, 1),
    });
  }

  // Replace current data after validation succeeds
  craftingItemMap.clear();
  craftingRecipeMap.clear();

  for (const [name, item] of loadedItems) {
    craftingItemMap.set(name, item);
  }

  for (const [name, recipe] of loadedRecipes) {
    craftingRecipeMap.set(name, recipe);
  }
}

let currentRevision = null;
let syncBlocked = false;
let saveQueue = Promise.resolve();
let pendingSaves = 0;

async function loadData() {
  const response = await fetch("/api/data", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load shared data");
  }

  const result = await response.json();

  applyData(result.data);

  currentRevision = result.revision;
  syncBlocked = false;
}

//Allows export of json
document.getElementById("export-data").addEventListener("click", () => {
  // Collect and format the data
  const data = collectData();
  const json = JSON.stringify(data, null, 2);

  // Create a downloadable JSON file
  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  // Create a temporary download link
  const link = document.createElement("a");

  link.href = url;
  link.download = "rpg-crafting-data.json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Clean up the temporary URL
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

//allows import of json

const importFileInput = document.getElementById("import-file");

document.getElementById("import-data").addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files[0];

  if (!file) return;

  try {
    // Read the selected file
    const json = await file.text();

    // Convert JSON into an object
    const data = JSON.parse(json);

    const shouldImport = window.confirm(
      "Importing will replace your current items and recipes. Continue?",
    );

    if (!shouldImport) return;

    // Restore the imported items and recipes
    applyData(data);

    // Save the imported data to the shared server
    const saved = await saveData();

    // Do not report success unless the server accepted the save.
    if (!saved) {
      return;
    }

    // Refresh the tables
    buildResTable([...craftingItemMap]);
    buildRecipeTable();

    alert("Data imported successfully to the shared server!");
  } catch (error) {
    console.error("Import failed:", error);
    alert("Unable to import this JSON file.");
  } finally {
    importFileInput.value = "";
  }
});

// ====  Crafting logic ====

function findCraftingCombinations(ingredients, maxResults = Infinity) {
  const slots = [];

  // Turn recipe quantities into individual requirements.
  // Example: Strength: 2 becomes two Strength slots.
  for (const [requirement, amount] of Object.entries(ingredients)) {
    const options = requirement
      .split("/")
      .map((name) => name.trim())
      .filter(Boolean)
      .sort();

    if (!Number.isInteger(amount) || amount < 0 || options.length === 0) {
      return [];
    }

    for (let i = 0; i < amount; i++) {
      slots.push(options);
    }
  }

  if (slots.length === 0) return [];

  // Group identical requirements to reduce duplicate searches.
  slots.sort((a, b) => a.join("/").localeCompare(b.join("/")));

  const neededResources = new Set(slots.flat());

  // Only consider items that are available and useful.
  const items = [...craftingItemMap]
    .filter(([, item]) => item.amount > 0)
    .map(([name, item]) => ({
      name,
      amount: item.amount,
      resources: [...new Set(item.resources)].filter((resource) =>
        neededResources.has(resource),
      ),
    }))
    .filter((item) => item.resources.length > 0);

  const remaining = items.map((item) => item.amount);

  const chosen = [];
  const combinations = [];
  const seen = new Set();

  function backtrack(slotIndex) {
    // Stop early when only a limited number is requested.
    if (combinations.length >= maxResults) return;

    // SUCCESS: every required resource has been supplied.
    if (slotIndex === slots.length) {
      const grouped = new Map();

      for (const { itemIndex, resource } of chosen) {
        const name = items[itemIndex].name;

        if (!grouped.has(name)) {
          grouped.set(name, {
            name,
            resources: {},
          });
        }

        const counts = grouped.get(name).resources;
        counts[resource] = (counts[resource] ?? 0) + 1;
      }

      const combination = [...grouped.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      // Create a unique representation to eliminate duplicates.
      const signature = JSON.stringify(
        combination.map((item) => [
          item.name,
          Object.values(item.resources).reduce(
            (sum, amount) => sum + amount,
            0,
          ),
        ]),
      );

      if (!seen.has(signature)) {
        seen.add(signature);
        combinations.push(combination);
      }

      return;
    }

    const options = slots[slotIndex];

    // Prevent reversing the order of items used for identical slots.
    const sameAsPrevious =
      slotIndex > 0 && options.join("/") === slots[slotIndex - 1].join("/");

    const firstItemIndex = sameAsPrevious ? chosen[slotIndex - 1].itemIndex : 0;

    // Try each available item.
    for (let i = firstItemIndex; i < items.length; i++) {
      if (remaining[i] === 0) continue;

      // Try each resource that this item can contribute.
      for (const resource of items[i].resources) {
        if (!options.includes(resource)) continue;

        // Use one copy of this item.
        remaining[i]--;

        chosen.push({
          itemIndex: i,
          resource,
        });

        // Continue to the next required resource.
        backtrack(slotIndex + 1);

        // Undo this choice and explore another possibility.
        chosen.pop();
        remaining[i]++;

        if (combinations.length >= maxResults) return;
      }
    }
  }

  backtrack(0);

  return combinations;

  function findClosestCraftingCombinations(ingredients) {
    const slots = [];

    // Convert recipe requirements into individual slots.
    for (const [requirement, amount] of Object.entries(ingredients)) {
      const options = requirement
        .split("/")
        .map((name) => name.trim())
        .filter(Boolean)
        .sort();

      if (!Number.isInteger(amount) || amount < 1 || options.length === 0) {
        return [];
      }

      for (let i = 0; i < amount; i++) {
        slots.push({
          key: options.join("/"),
          options,
        });
      }
    }

    if (slots.length === 0) return [];

    // Group identical requirements together.
    slots.sort((a, b) => a.key.localeCompare(b.key));

    const needed = new Set(slots.flatMap((slot) => slot.options));

    // Only use items that are available and relevant.
    const items = [...craftingItemMap]
      .filter(([, item]) => item.amount > 0)
      .map(([name, item]) => ({
        name,
        amount: item.amount,
        resources: [...new Set(item.resources)]
          .filter((resource) => needed.has(resource))
          .sort(),
      }))
      .filter((item) => item.resources.length > 0);

    const remaining = items.map((item) => item.amount);
    const assignments = [];

    const results = [];
    const seen = new Set();

    let bestMatched = 0;

    // Save a completed partial combination, but only if
    // it is as good as the best combination found.
    function saveCombination(matched) {
      if (matched === 0 || matched < bestMatched) return;

      if (matched > bestMatched) {
        bestMatched = matched;
        results.length = 0;
        seen.clear();
      }

      const used = new Map();
      const missing = new Map();

      for (let i = 0; i < slots.length; i++) {
        const choice = assignments[i];

        if (choice === null) {
          const key = slots[i].key;
          missing.set(key, (missing.get(key) ?? 0) + 1);
          continue;
        }

        const name = items[choice.itemIndex].name;

        if (!used.has(name)) {
          used.set(name, {
            name,
            amount: 0,
            resources: new Map(),
          });
        }

        const item = used.get(name);
        item.amount++;

        item.resources.set(
          choice.resource,
          (item.resources.get(choice.resource) ?? 0) + 1,
        );
      }

      const selected = [...used.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      const missingList = [...missing].sort((a, b) => a[0].localeCompare(b[0]));

      // Ignore duplicate item combinations with identical missing needs.
      const signature = JSON.stringify([
        selected.map((item) => [item.name, item.amount]),
        missingList,
      ]);

      if (seen.has(signature)) return;
      seen.add(signature);

      results.push({
        used: selected.map((item) => ({
          name: item.name,
          amount: item.amount,
          resources: [...item.resources],
        })),
        missing: missingList,
        matched,
      });
    }

    // Recursively try using an item or leaving a resource missing.
    function backtrack(index, matched) {
      // Prune branches that cannot equal the best result.
      if (matched + slots.length - index < bestMatched) return;

      const available = remaining.reduce((sum, amount) => sum + amount, 0);

      if (matched + Math.min(slots.length - index, available) < bestMatched)
        return;

      if (index === slots.length) {
        saveCombination(matched);
        return;
      }

      const slot = slots[index];

      // Avoid permutations of identical requirement slots.
      const repeated = index > 0 && slot.key === slots[index - 1].key;

      const previous = repeated ? assignments[index - 1] : undefined;

      if (!repeated || previous !== null) {
        const start = repeated ? previous.itemIndex : 0;

        for (let i = start; i < items.length; i++) {
          if (remaining[i] === 0) continue;

          for (const resource of items[i].resources) {
            if (!slot.options.includes(resource)) continue;

            if (
              repeated &&
              i === previous.itemIndex &&
              resource.localeCompare(previous.resource) < 0
            )
              continue;

            // Temporarily commit one inventory item.
            remaining[i]--;
            assignments.push({ itemIndex: i, resource });

            backtrack(index + 1, matched + 1);

            // Undo the choice for the next possibility.
            assignments.pop();
            remaining[i]++;
          }
        }
      }

      // Alternative branch: this resource is missing.
      assignments.push(null);
      backtrack(index + 1, matched);
      assignments.pop();
    }

    backtrack(0, 0);

    return results;
  }
}

function findClosestCraftingCombinations(ingredients) {
  const slots = [];

  // Convert recipe requirements into individual slots.
  for (const [requirement, amount] of Object.entries(ingredients)) {
    const options = requirement
      .split("/")
      .map((name) => name.trim())
      .filter(Boolean)
      .sort();

    if (!Number.isInteger(amount) || amount < 1 || options.length === 0) {
      return [];
    }

    for (let i = 0; i < amount; i++) {
      slots.push({
        key: options.join("/"),
        options,
      });
    }
  }

  if (slots.length === 0) return [];

  // Group identical requirements together.
  slots.sort((a, b) => a.key.localeCompare(b.key));

  const needed = new Set(slots.flatMap((slot) => slot.options));

  // Only use items that are available and relevant.
  const items = [...craftingItemMap]
    .filter(([, item]) => item.amount > 0)
    .map(([name, item]) => ({
      name,
      amount: item.amount,
      resources: [...new Set(item.resources)]
        .filter((resource) => needed.has(resource))
        .sort(),
    }))
    .filter((item) => item.resources.length > 0);

  const remaining = items.map((item) => item.amount);
  const assignments = [];

  const results = [];
  const seen = new Set();

  let bestMatched = 0;

  // Save a completed partial combination, but only if
  // it is as good as the best combination found.
  function saveCombination(matched) {
    if (matched === 0 || matched < bestMatched) return;

    if (matched > bestMatched) {
      bestMatched = matched;
      results.length = 0;
      seen.clear();
    }

    const used = new Map();
    const missing = new Map();

    for (let i = 0; i < slots.length; i++) {
      const choice = assignments[i];

      if (choice === null) {
        const key = slots[i].key;
        missing.set(key, (missing.get(key) ?? 0) + 1);
        continue;
      }

      const name = items[choice.itemIndex].name;

      if (!used.has(name)) {
        used.set(name, {
          name,
          amount: 0,
          resources: new Map(),
        });
      }

      const item = used.get(name);
      item.amount++;

      item.resources.set(
        choice.resource,
        (item.resources.get(choice.resource) ?? 0) + 1,
      );
    }

    const selected = [...used.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    const missingList = [...missing].sort((a, b) => a[0].localeCompare(b[0]));

    // Ignore duplicate item combinations with identical missing needs.
    const signature = JSON.stringify([
      selected.map((item) => [item.name, item.amount]),
      missingList,
    ]);

    if (seen.has(signature)) return;
    seen.add(signature);

    results.push({
      used: selected.map((item) => ({
        name: item.name,
        amount: item.amount,
        resources: [...item.resources],
      })),
      missing: missingList,
      matched,
    });
  }

  // Recursively try using an item or leaving a resource missing.
  function backtrack(index, matched) {
    // Prune branches that cannot equal the best result.
    if (matched + slots.length - index < bestMatched) return;

    const available = remaining.reduce((sum, amount) => sum + amount, 0);

    if (matched + Math.min(slots.length - index, available) < bestMatched)
      return;

    if (index === slots.length) {
      saveCombination(matched);
      return;
    }

    const slot = slots[index];

    // Avoid permutations of identical requirement slots.
    const repeated = index > 0 && slot.key === slots[index - 1].key;

    const previous = repeated ? assignments[index - 1] : undefined;

    if (!repeated || previous !== null) {
      const start = repeated ? previous.itemIndex : 0;

      for (let i = start; i < items.length; i++) {
        if (remaining[i] === 0) continue;

        for (const resource of items[i].resources) {
          if (!slot.options.includes(resource)) continue;

          if (
            repeated &&
            i === previous.itemIndex &&
            resource.localeCompare(previous.resource) < 0
          )
            continue;

          // Temporarily commit one inventory item.
          remaining[i]--;
          assignments.push({ itemIndex: i, resource });

          backtrack(index + 1, matched + 1);

          // Undo the choice for the next possibility.
          assignments.pop();
          remaining[i]++;
        }
      }
    }

    // Alternative branch: this resource is missing.
    assignments.push(null);
    backtrack(index + 1, matched);
    assignments.pop();
  }

  backtrack(0, 0);

  return results;
}

function showClosestCraftingCombinations(ingredients) {
  const container = document.getElementById("uncraftable-combinations-list");

  const emptyMessage = document.getElementById("no-starting-items-message");

  container.replaceChildren();
  emptyMessage.hidden = true;

  const combinations = findClosestCraftingCombinations(ingredients);

  // No available item can contribute any required resource.
  if (combinations.length === 0) {
    emptyMessage.hidden = false;
    return;
  }

  const totalNeeded = Object.values(ingredients).reduce(
    (sum, amount) => sum + amount,
    0,
  );

  combinations.forEach((combination, index) => {
    const row = document.createElement("div");
    row.className = "combination-row";

    // Left side: items and assigned resources.
    const details = document.createElement("div");
    details.className = "combination-details";

    const title = document.createElement("strong");
    title.textContent = `Combination ${index + 1} — ${combination.matched}/${totalNeeded}`;

    const itemText = document.createElement("span");
    itemText.className = "combination-items";

    const items = combination.used.flatMap((item) =>
      item.resources.map(
        ([resource, amount]) =>
          `${item.name} (${resource})${amount > 1 ? ` ×${amount}` : ""}`,
      ),
    );

    itemText.textContent = items.join("\n");

    details.append(title, itemText);

    // Right side: the missing resource requirements.
    const missingText = document.createElement("div");
    missingText.className = "combination-missing";

    const missingResources = combination.missing.map(([resource, amount]) =>
      amount > 1 ? `${resource} ×${amount}` : resource,
    );

    missingText.textContent = `Missing:\n${missingResources.join("\n")}`;

    row.append(details, missingText);
    container.appendChild(row);
  });
}

function craftRecipe(recipeName, combination) {
  const recipe = craftingRecipeMap.get(recipeName);

  if (!recipe) {
    alert("Recipe not found.");
    return;
  }

  // Prevent crafting a non-repeatable recipe twice.
  if (!recipe.repeatable && recipe.craftedCount > 0) {
    alert("This recipe has already been crafted.");
    return;
  }

  // Store the items and amounts this combination will consume.
  const usedItems = new Map();

  for (const item of combination) {
    let used = usedItems.get(item.name);

    if (!used) {
      used = {
        amount: 0,
        resources: new Map(),
      };

      usedItems.set(item.name, used);
    }

    // Count how many copies of this item are being consumed.
    for (const [resource, amount] of Object.entries(item.resources)) {
      if (!Number.isInteger(amount) || amount < 1) {
        alert("Invalid crafting combination.");
        return;
      }

      used.amount += amount;

      used.resources.set(
        resource,
        (used.resources.get(resource) ?? 0) + amount,
      );
    }
  }

  // Validate inventory and prepare the confirmation message.
  const changes = [];

  for (const [itemName, used] of usedItems) {
    const inventoryItem = craftingItemMap.get(itemName);

    // Make sure we still have enough of this item.
    if (!inventoryItem || inventoryItem.amount < used.amount) {
      alert(`Not enough ${itemName} available to craft this recipe.`);
      return;
    }

    const before = inventoryItem.amount;
    const after = before - used.amount;

    const resourceText = [...used.resources]
      .map(([resource, amount]) =>
        amount === 1 ? resource : `${resource} x${amount}`,
      )
      .join(", ");

    changes.push({
      name: itemName,
      before,
      after,
      resourceText,
    });
  }

  // Build the confirmation message.
  const itemLines = changes
    .map(
      (item) =>
        `${item.name} (${item.resourceText}) ${item.before}x --> ${item.after}x`,
    )
    .join("\n");

  const confirmed = window.confirm(
    `Are you sure you want to craft ${recipeName}?\n\n` +
      `The following items will be consumed:\n\n` +
      itemLines,
  );

  // The user pressed Cancel: change nothing.
  if (!confirmed) return;

  // ===== Apply the crafting changes =====

  // 1. Decrease inventory quantities.
  for (const item of changes) {
    craftingItemMap.get(item.name).amount = item.after;
  }

  // 2. Update the recipe's crafted status.
  if (recipe.repeatable) {
    recipe.craftedCount = (recipe.craftedCount ?? 0) + 1;
  } else {
    recipe.craftedCount = 1;
  }

  // 3. Save everything to local storage.
  saveData();

  // 4. Close the combination modal.
  closeModal(document.getElementById("craftable-combinations-modal"));

  // 5. Refresh both tables.
  buildResTable([...craftingItemMap]);
  buildRecipeTable();
}

function showCraftableCombinations(recipeName, ingredients) {
  const container = document.getElementById("craftable-combinations-list");

  container.replaceChildren();

  // Get every valid combination.
  const combinations = findCraftingCombinations(ingredients);

  // Handle an empty result.
  if (combinations.length === 0) {
    container.textContent = "No valid combinations are available.";
    return;
  }

  // Create one row for every combination.
  combinations.forEach((combination, index) => {
    const row = document.createElement("div");
    row.className = "combination-row";

    const label = document.createElement("label");
    label.className = "combination-choice";

    // Radio button for selecting a combination.
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "chosen-combination";
    radio.value = index;

    const details = document.createElement("span");
    details.className = "combination-details";

    const heading = document.createElement("strong");
    heading.className = "combination-heading";
    heading.textContent = `Combination ${index + 1}`;

    details.appendChild(heading);

    // Display the item names, quantities and assigned resources.
    for (const item of combination) {
      const itemAmount = Object.values(item.resources).reduce(
        (sum, amount) => sum + amount,
        0,
      );

      const resourceText = Object.entries(item.resources)
        .map(([resource, amount]) => `${amount} ${resource}`)
        .join(", ");

      const itemLine = document.createElement("span");
      itemLine.className = "combination-items";

      itemLine.textContent = `${item.name} ×${itemAmount} (${resourceText})`;

      details.appendChild(itemLine);
    }

    label.append(radio, details);

    // Placeholder Craft button.
    const craftButton = document.createElement("button");
    craftButton.type = "button";
    craftButton.className = "craft-action";
    craftButton.textContent = "Craft";
    craftButton.disabled = true;

    // Enable the Craft button when this combination is selected.
    radio.addEventListener("change", () => {
      // Disable all other Craft buttons.
      container.querySelectorAll(".craft-action").forEach((button) => {
        button.disabled = true;
      });

      // Enable the button for the selected combination.
      craftButton.disabled = false;
    });

    // Craft using this specific combination.
    craftButton.addEventListener("click", () => {
      craftRecipe(recipeName, combination);
    });

    row.append(label, craftButton);
    container.appendChild(row);
  });
}

function sameResources(a, b) {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((resource) => a[resource] === b[resource])
  );
}
function craftableRecipe(ingredients) {
  return findCraftingCombinations(ingredients, 1).length > 0;
}

// ===== Table sorting =====

const tableSortState = {
  resTable: { key: null, ascending: true },
  recipeTable: { key: null, ascending: true },
};

// Read the value used to sort a particular row
function getSortValue(row, key) {
  switch (key) {
    case "name":
      return row.cells[0].textContent.trim();

    case "amount":
      return Number(row.cells[3].querySelector("input").value);

    case "crafted": {
      const text = row.cells[3].textContent.trim();

      if (!text.startsWith("Yes")) return 0;

      // Yes = 1, Yes x2 = 2, etc.
      const match = text.match(/x(\d+)/i);
      return match ? Number(match[1]) : 1;
    }

    case "craftable":
      return row.cells[4].textContent.trim() === "Yes" ? 1 : 0;
  }

  return 0;
}

// Apply the currently selected sorting
function applyCurrentSort(tableId) {
  const state = tableSortState[tableId];

  if (!state || state.key === null) return;

  const tbody = document.getElementById(tableId);
  const rows = Array.from(tbody.rows);

  rows.sort((a, b) => {
    const valueA = getSortValue(a, state.key);
    const valueB = getSortValue(b, state.key);

    let comparison;

    if (typeof valueA === "string") {
      comparison = valueA.localeCompare(valueB, undefined, {
        sensitivity: "base",
        numeric: true,
      });
    } else {
      comparison = valueA - valueB;
    }

    if (comparison !== 0) {
      return state.ascending ? comparison : -comparison;
    }

    // Alphabetical fallback when values are equal
    return a.cells[0].textContent.localeCompare(b.cells[0].textContent);
  });

  // Rearrange existing rows without recreating them
  tbody.replaceChildren(...rows);
}

// Handle clicking sortable column headers
document.querySelectorAll(".sort-header").forEach((button) => {
  button.addEventListener("click", () => {
    const tableId = button.dataset.sortTable;
    const key = button.dataset.sortKey;
    const state = tableSortState[tableId];

    if (state.key === key) {
      // Clicking the same column reverses direction
      state.ascending = !state.ascending;
    } else {
      state.key = key;

      // Names A-Z, all other columns highest/Yes first
      state.ascending = key === "name";
    }

    applyCurrentSort(tableId);

    // Update sorting arrows
    document
      .querySelectorAll(`[data-sort-table="${tableId}"]`)
      .forEach((header) => {
        const active = header.dataset.sortKey === state.key;

        header.querySelector(".sort-arrow").textContent = active
          ? state.ascending
            ? "▲"
            : "▼"
          : "↕";

        header
          .closest("th")
          .setAttribute(
            "aria-sort",
            active ? (state.ascending ? "ascending" : "descending") : "none",
          );
      });
  });
});

// ===== Mobile table sorting =====

document.querySelectorAll(".mobile-sort-controls").forEach((controls) => {
  const select = controls.querySelector(".mobile-sort-select");
  const directionButton = controls.querySelector(".mobile-sort-direction");

  const tableId = controls.dataset.sortTable;

  function sortMobileTable() {
    const key = select.value;

    if (!key) return;

    // Find the matching desktop sorting header
    const header = document.querySelector(
      `.sort-header[data-sort-table="${tableId}"][data-sort-key="${key}"]`,
    );

    if (!header) return;

    // Reuse the sorting event we already implemented
    header.click();

    // Update mobile sorting arrow
    const state = tableSortState[tableId];

    directionButton.textContent = state.ascending ? "↑" : "↓";
  }

  // Selecting a column sorts by that column
  select.addEventListener("change", () => {
    directionButton.disabled = false;
    sortMobileTable();
  });

  // Pressing the arrow reverses the current sorting
  directionButton.addEventListener("click", sortMobileTable);
});

// ===== Start the application =====

async function startApp() {
  try {
    await loadData();
    initializeApp();
  } catch (error) {
    console.error("App initialization failed:", error);

    alert(
      "Unable to load data from the local server.\n" +
        "Please check that the PC server is running.",
    );
  }
}

startApp();
