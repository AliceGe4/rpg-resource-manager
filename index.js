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

  dropdown.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select resource...";
  placeholder.disabled = true;
  placeholder.selected = true;

  dropdown.appendChild(placeholder);

  resources.forEach((resource) => {
    const option = document.createElement("option");
    option.value = resource;
    option.textContent = resource;

    dropdown.appendChild(option);
  });
}

document.getElementById("recipe-add-resource").addEventListener("click", () => {
  const resource = document.getElementById("recipe-resource-select").value;

  const quantity = Number(document.getElementById("recipe-quantity").value);

  if (!resource || !Number.isInteger(quantity) || quantity < 1) {
    alert("Please select a resource and a valid quantity.");
    return;
  }

  // Add or update the resource quantity
  recipeIngredients[resource] = quantity;

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
  try {
    const data = collectData();

    const json = JSON.stringify(data);

    localStorage.setItem(STORAGE_KEY, json);

    console.log("Data saved successfully.");
  } catch (error) {
    console.error("Failed to save data:", error);
  }
}

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

function loadData() {
  try {
    const json = localStorage.getItem(STORAGE_KEY);

    // No previous save exists
    if (json === null) {
      console.log("No saved data found.");
      return;
    }

    const data = JSON.parse(json);

    applyData(data);

    console.log("Data loaded successfully.");
  } catch (error) {
    console.error("Failed to load data:", error);
  }
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

    // Restore the Maps
    applyData(data);

    // Save imported data to browser storage
    saveData();

    // Refresh the tables
    buildResTable([...craftingItemMap]);
    buildRecipeTable();

    alert("Data imported successfully!");
  } catch (error) {
    console.error("Import failed:", error);
    alert("Unable to import this JSON file.");
  } finally {
    importFileInput.value = "";
  }
});

// ====  Crafting logic ====

function sameResources(a, b) {
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((resource) => a[resource] === b[resource])
  );
}

function craftableRecipe(ingredients) {
  let tempMap = new Map(structuredClone([...craftingItemMap]));
  let returningObject = {};
  const totalIngredients = Object.values(ingredients).reduce(
    (sum, amount) => sum + amount,
    0,
  ); //sums up amount of ingredients in the parsed ingredient file
  return craftableRecipeHelper(
    ingredients,
    tempMap,
    returningObject,
    0,
    totalIngredients,
  );
}

function craftableRecipeHelper(
  ingredients,
  map,
  returningObject,
  counter,
  totalIngredients,
) {
  // SUCCESS
  if (sameResources(ingredients, returningObject)) {
    return true;
  }

  // FAILURE: No more possibilities to explore
  if (counter >= totalIngredients || map.size === 0) {
    return false;
  }

  // Retrieve the first item from our map
  const firstKey = map.keys().next().value;
  const item = map.get(firstKey);

  // If the item has no remaining quantity, remove it
  if (item.amount === 0) {
    const nextMap = new Map(map);
    nextMap.delete(firstKey);

    return craftableRecipeHelper(
      ingredients,
      nextMap,
      returningObject,
      counter,
      totalIngredients,
    );
  }

  // OPTION 1: Skip this item entirely
  const skippedMap = new Map(map);
  skippedMap.delete(firstKey);

  if (
    craftableRecipeHelper(
      ingredients,
      skippedMap,
      returningObject,
      counter,
      totalIngredients,
    )
  ) {
    return true;
  }

  // OPTION 2: Use one unit of this item
  for (const resource of item.resources) {
    // Skip resources we don't need more of
    if ((returningObject[resource] ?? 0) >= (ingredients[resource] ?? 0)) {
      continue;
    }

    // Create a separate map for this possibility
    const nextMap = new Map(map);

    // Reduce the item's quantity by one
    const nextItem = {
      ...item,
      amount: item.amount - 1,
    };

    if (nextItem.amount === 0) {
      nextMap.delete(firstKey);
    } else {
      nextMap.set(firstKey, nextItem);
    }

    // Create a separate copy of our collected resources
    const nextResources = { ...returningObject };

    // Add one of the selected resource
    nextResources[resource] = (nextResources[resource] ?? 0) + 1;

    // Recursively test this possibility
    if (
      craftableRecipeHelper(
        ingredients,
        nextMap,
        nextResources,
        counter + 1,
        totalIngredients,
      )
    ) {
      return true;
    }
  }

  // Every possibility failed
  return false;
}

// returningObject[resources] = (returningObject[resources] ?? 0) + 1; write this to increment any resource
// ===== Start the application =====

loadData();
initializeApp();
