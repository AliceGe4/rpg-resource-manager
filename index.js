//console.log('Hello');

//window.alert('This is an alert')
//window.alert('I like pizza')

// ===== Shared data and element references =====

const resources = [
    "Strength", "Dexterity", "Endurance", "Charisma", "Manipulation", "Tranquility", "Willpower", "Instinct", "Knowledge",
    "Pyromancy", "Terramancy","Hydromancy", "Aeromancy", "Arcanamancy", "Luxmancy", "Umbramancy", "Floramancy", "Faunamancy", "Necromancy", "Deusmancy", "Melodemancy"

]

const recipeIngredients = {};

const modalStack = []; //used to track modals in stack.

const selectedResources = [];
const craftingItemMap = new Map();
let editingItemName = null; //used to track if user is editing a new item or doing it through table.
const craftingRecipeMap = new Map();
let selectedRecipeName = null; //used to track if user is editing a recipe or doing it through table.
let editingRecipeName = null;

const resourceSelect = document.getElementById("resourceSelect");
const addButton = document.getElementById("addResource"); //button for adding a resource to an item
const selectedContainer = document.getElementById("selectedResources") //Contains resources assigned to current item
const resourceSubmitButton = document.getElementById("resource-submit") //Button for submit within item

//data-modal-target is the attribute we call in html for all modal opening buttons which we will have 2-3 in this program
const openModalButtons = document.querySelectorAll('[data-modal-target]')
const closeModalButtons = document.querySelectorAll('[data-close-button]')
const overlay = document.getElementById('overlay')

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

    resources.forEach(resource => {
        const option = document.createElement("option");
        option.value = resource;
        option.textContent = resource;

        dropdown.appendChild(option);
    });
}

document.getElementById("recipe-add-resource")
    .addEventListener("click", () => {

        const resource = document.getElementById(
            "recipe-resource-select"
        ).value;

        const quantity = Number(
            document.getElementById("recipe-quantity").value
        );

        if (!resource || !Number.isInteger(quantity) || quantity < 1) {
            alert("Please select a resource and a valid quantity.");
            return;
        }

        // Add or update the resource quantity
        recipeIngredients[resource] = quantity;

        updateRecipeSelectedIngredients();
    });

function updateRecipeSelectedIngredients() {
    const container = document.getElementById(
        "recipe-selected-ingredients"
    );

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
    document.getElementById("recipe-quantity").value = 1;

    // Clear our temporary ingredients
    for (const resource of Object.keys(recipeIngredients)) {
        delete recipeIngredients[resource];
    }

    updateRecipeSelectedIngredients();
    updateRecipeDropdown();
}

document.getElementById("recipe-edit-button")
    .addEventListener("click", () => {

        if (selectedRecipeName === null) return;

        editRecipe(selectedRecipeName);
    });

document.getElementById("recipe-submit")
    .addEventListener("click", () => {

        const recipeName = document.getElementById(
            "recipe-name"
        ).value.trim();

        const description = document.getElementById(
            "recipe-description"
        ).value.trim();

        const crafted = document.getElementById(
            "recipe-crafted"
        ).checked;

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
            if (
                recipeName !== editingRecipeName &&
                craftingRecipeMap.has(recipeName)
            ) {
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
                `${recipeName} already exists. Overwrite it?`
            );

            if (!shouldUpdate) return;
        }

        // Save the recipe
        craftingRecipeMap.set(recipeName, {
            ingredients: { ...recipeIngredients },
            description: description,
            crafted: crafted,
        });

        // Refresh the Recipe Table
        buildRecipeTable();

        // If editing through Info modal, update its contents
        if (editingRecipeName !== null) {

            selectedRecipeName = recipeName;

            document.getElementById("recipe-info-title")
                .textContent = recipeName;

            document.getElementById("recipe-info-description")
                .textContent = description || "No description added yet.";
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
    document.getElementById("recipe-description").value =
        recipe.description;

    // Load crafted status
    document.getElementById("recipe-crafted").checked =
        recipe.crafted;

    // Load ingredients
    Object.assign(recipeIngredients, recipe.ingredients);

    // Update visible ingredient buttons
    updateRecipeSelectedIngredients();
    updateRecipeDropdown();

    // Change modal title and submit button
    document.querySelector("#new-recipe-modal .title").textContent =
        "Edit Recipe";

    document.getElementById("recipe-submit").textContent =
        "Save Changes";

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
    resources.forEach(resource => {
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

        // Remove old item (necessary if the name changed)
        craftingItemMap.delete(editingItemName);

        // Save updated item
        craftingItemMap.set(temp_name, [...selectedResources]);

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
            `${temp_name} already exists, would you like to update its resources?`
        );

        if (!shouldUpdate) {
            return;
        }
    }

    // Save new item (or update existing one if confirmed)
    craftingItemMap.set(temp_name, [...selectedResources]);

    // Show success message
    document.getElementById("resource-success").classList.add("show");

    // Clear inputs for next item
    clearResourceSelection();
    updateDropdown();
});

const successMessage = document.getElementById("resource-success");

document.addEventListener("click", () => {
        successMessage.classList.remove("show");
    }, true);

document.addEventListener("input", () => {
        successMessage.classList.remove("show");
});

//End of general location for buttons
function updateSelectedResources() {

    selectedContainer.innerHTML = "";

    selectedResources.forEach(resource => {

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
}

// button=> and ()=> is the same way as writing function function(button){ something here} or function(){something here}
//it is a shortcut to make a function that this program declares to receive

// ===== General handling: modal stack and open/close events =====

openModalButtons.forEach(button =>{
    button.addEventListener('click', ()=>{
        const modal = document.querySelector(button.dataset.modalTarget)
        openModal(modal)
    })
})

overlay.addEventListener('click', () => {
    if (modalStack.length > 0) {
        const topModal = modalStack[modalStack.length - 1];
        closeModal(topModal);
    }
});

closeModalButtons.forEach(button =>{
    button.addEventListener('click', ()=>{
        const modal = button.closest('.modal') /* This checks for the closest parent, so we can retrieve the modal to close through this */
        closeModal(modal)
    })
})

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

function closeModal(modal){
    if(modal==null) return

    // Only allow closing the topmost modal
    if (modalStack[modalStack.length - 1] !== modal) return;

    switch (modal.id) {
        case "new-item-modal":
            if(!document.getElementById("item-name").value == ""  || !(selectedResources.length == 0)){
                const shouldUpdate = window.confirm("You have unsaved changes, are you sure you want to close?")
                if (shouldUpdate == false){
                    return
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
                document.getElementById("recipe-crafted").checked;

            if (hasUnsavedRecipe) {
                const shouldClose = window.confirm(
                    "You have unsaved recipe changes. Close anyway?"
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

            document.getElementById("recipe-submit").textContent =
                "Submit Recipe";

            break;
        }

        default:
            // Other modals warning
            break;
    }

    modal.classList.remove('active');
    modalStack.pop();

    // Only remove overlay when ALL modals are closed
    if (modalStack.length === 0) {
        overlay.classList.remove('active');
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
    document.getElementById("item-name").value = "";
    updateDropdown();
    updateSelectedResources();
}

// ===== Resource item table: display, editing, and deletion =====

function buildResTable(arr){
    var table = document.getElementById('resTable')

    table.innerHTML = "";
    for (const [itemName, resources] of arr) {
        const row = table.insertRow();

        // Item name
        row.insertCell(0).textContent = itemName;

        // Resources
        row.insertCell(1).textContent = resources.join(", ");

        // Edit button
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editItem(itemName);
        });

        row.insertCell(2).appendChild(editButton);

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            if (window.confirm(`Delete ${itemName}?`)) {
                craftingItemMap.delete(itemName);
                buildResTable([...craftingItemMap]);
            }
        });

        row.insertCell(3).appendChild(deleteButton);
    }

    // for(var i = 0; i < arr.length; i++){
    //     var row = `<tr>
    //         <td>${arr[i][0]}</td>
    //         <td>${arr[i][1].join(", ")}</td>
    //         <td></td>
    //         <td></td>
    //     </tr>`
    //     table.innerHTML += row
    // }
}

function editItem(itemName) {
    editingItemName = itemName;

    // Fill the name input
    document.getElementById("item-name").value = itemName;

    // Load previously selected resources
    selectedResources.length = 0;
    selectedResources.push(...craftingItemMap.get(itemName));

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
        row.insertCell(3).textContent =
            recipe.crafted ? "Yes" : "No";

        //to do add logic to check if something is craftable

        // Column 5: Craftable
        row.insertCell(4).textContent =
            recipe.craftable === true ? "✓" : "";
    }
}

function openRecipeInfo(recipeName) {
    const recipe = craftingRecipeMap.get(recipeName);

    if (!recipe) return;

    // Remember which recipe we're viewing
    selectedRecipeName = recipeName;

    // Set the title
    document.getElementById("recipe-info-title").textContent =
        recipeName;

    // Set the description
    document.getElementById("recipe-info-description").textContent =
        recipe.description || "No description added yet.";

    // Open the modal
    openModal(document.getElementById("recipe-info-modal"));
}

document.getElementById("recipe-delete-button")
    .addEventListener("click", () => {

        if (selectedRecipeName === null) return;

        const shouldDelete = window.confirm(
            `Are you sure you want to delete ${selectedRecipeName}?`
        );

        if (!shouldDelete) return;

        // Delete the recipe
        craftingRecipeMap.delete(selectedRecipeName);

        // Refresh the table
        buildRecipeTable();

        // Close the Info modal
        closeModal(document.getElementById("recipe-info-modal"));
    });


// ===== Data: Json manipulation =====

const STORAGE_KEY = "rpgCraftingData_v1";


function collectData() {
    return {
        version: 1,

        items: [...craftingItemMap].map(([name, resources]) => ({
            name: name,
            resources: [...resources]
        })),

        recipes: [...craftingRecipeMap].map(([name, recipe]) => ({
            name: name,
            ingredients: { ...recipe.ingredients },
            description: recipe.description,
            crafted: recipe.crafted,
        }))
    };
}

function saveData() {
    const data = collectData();

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}


// ===== Start the application =====

initializeApp();
