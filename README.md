# RPG Crafting Organizer

A browser-based resource and crafting manager for a custom tabletop RPG. Built with **HTML, CSS, and vanilla JavaScript**, the app helps players organize magical ingredients, track inventory, manage recipes, and check which recipes they can currently craft.

## Features

### Ingredient and inventory management

- Create, edit, and delete ingredient items.
- Assign multiple resource attributes to an ingredient (for example, Strength, Dexterity, or Aeromancy).
- Support unknown (`???`) attributes when an ingredient has not been fully identified.
- Track how many units of each ingredient are available, including zero stock.
- Edit quantities directly from the resource table.

### Recipe management

- Create, edit, and delete recipes.
- Specify the quantity of each resource required by a recipe (for example, `2 Strength` and `1 Dexterity`).
- Add and update recipe descriptions.
- Track whether a recipe has been crafted.
- Mark recipes as **repeatable** and track multiple completed crafts (`Yes x1`, `Yes x2`, etc.); non-repeatable recipes show `Yes` or `No`.
- View recipe requirements, crafted status, and current craftability in one table.

### Craftability calculation

- Uses a **recursive backtracking algorithm** to determine whether a recipe can be made from the available inventory.
- An ingredient may offer multiple resource attributes, but each available unit can contribute to **only one** requirement for that craft.
- Respects the quantity of each inventory item, so resources are not double-counted.
- Explores alternative assignments of ingredients to resource requirements.
- Displays a `Yes` or `No` craftability indicator for each recipe.
- Recalculates craftability when the recipe table is opened or rebuilt rather than storing potentially outdated results.

**Example:** If you have two Bat Wings and each wing can provide either Strength or Dexterity, you cannot fulfill a recipe needing `2 Strength` **and** `1 Dexterity` at the same time: that would require three units.

> **Crafted vs. Craftable:** "Crafted" records past completion; "Craftable" checks whether your _current_ ingredient inventory meets the recipe's requirements. Checking craftability does not consume ingredients automatically.

### Save, load, and backups

- Automatically saves confirmed inventory and recipe changes in browser `localStorage`.
- Loads previously saved data when the application starts.
- Exports items and recipes to a downloadable `rpg-crafting-data.json` backup.
- Imports compatible JSON backups, with a confirmation before replacing the currently loaded data.
- Stores recipe descriptions, repeatable settings, crafted counts, item amounts, and unknown attribute counts.

> **Important:** Browser `localStorage` is specific to the browser/profile and site origin. It is **not** a file in the GitHub repository, and pushing code to GitHub does not upload your saved inventory. Use JSON export to back up or transfer your data.

### Interface and mobile support

- Redesigned main menu with blue-and-gold styling and animated yellow buttons.
- Improved modal styling, layout, and scrolling for long forms and tables.
- Nested modal navigation for creating and editing items and recipes without losing the parent view.
- Responsive layout for phones, including mobile-friendly menu buttons and resource/recipe tables that switch to labeled cards.
- Visual `Yes`/`No` craftability indicators with hover and pressed-button animations.

## Technologies

- **HTML5** — page structure and forms
- **CSS3** — themes, responsiveness, modal layouts, and animations
- **JavaScript (vanilla)** — data management, UI interactions, JSON persistence, and crafting logic
- **Browser APIs** — `localStorage`, file input, and JSON import/export

No backend, database server, or Node.js installation is required for the current version.

## Getting started

1. Clone or download the repository.
2. Open the project folder in **VS Code**.
3. Open `index.html` with **Live Server** (recommended), or use another static local web server.
4. Add your ingredients and the resource attributes they can provide.
5. Set ingredient amounts in the resource table.
6. Create recipes, adding each required resource and its quantity.
7. Open the recipe table to view automatically calculated **Craftable** results.
8. Use **Export** periodically to create a JSON backup.

## How craftability works

The `craftableRecipe()` function works on a copy of the current inventory and uses `craftableRecipeHelper()` to explore possible allocations:

1. Check whether the selected contributions meet the recipe requirements.
2. Skip exhausted items and stop branches that cannot succeed.
3. Try skipping an ingredient or assigning one available unit to a required resource it supports.
4. Reduce the remaining quantity in that branch only.
5. Return `true` if any allocation satisfies the recipe; otherwise return `false`.

This prevents a single item unit from supplying multiple resources at once. The current implementation prioritizes correctness over advanced optimizations; the search may become expensive for very large inventories.

## Data format

The app uses versioned JSON data containing separate `items` and `recipes` arrays. A simplified example:

```json
{
  "version": 2,
  "items": [
    {
      "name": "Bat Wing",
      "resources": ["Strength", "Dexterity", "Aeromancy"],
      "amount": 2,
      "unknownCount": 0
    }
  ],
  "recipes": [
    {
      "name": "Example Recipe",
      "ingredients": { "Strength": 2, "Dexterity": 1 },
      "description": "Example recipe for demonstration.",
      "repeatable": true,
      "craftedCount": 2
    }
  ]
}
```

The example above is illustrative and is **not** a record of your actual saved inventory.

## Development progress

### October 29, 2026 — Crafting logic, persistence, and responsive UI

- Implemented recursive inventory-aware craftability checks.
- Added `Yes`/`No` craftability indicators and recalculation on recipe-table refresh.
- Added repeatable recipes and crafted-count tracking.
- Added automatic browser storage and JSON import/export.
- Improved ingredient quantity handling and preserved item properties during editing.
- Expanded recipe forms and recipe detail/edit workflows.
- Redesigned the main menu, buttons, colors, and interaction states.
- Added phone-friendly layouts, table cards, and better modal sizing and scrolling.
- Fixed modal refresh/navigation and main-menu interaction issues discovered during development.

### Earlier development — Core organizer

- Created ingredient/resource selection and management.
- Built recipe creation, editing, and deletion flows.
- Added resource quantities to recipes and inventory amounts to items.
- Built dynamic resource and recipe tables.
- Added a reusable modal-stack system for nested dialogs.

## Project status

**Active development:** Core resource management, recipe management, local persistence, responsive layouts, and craftability checking are implemented.

The current app checks crafting availability but does **not** automatically perform a craft or deduct the required ingredients. Those actions would require additional workflow and allocation logic.

## Project goal

Make managing a custom RPG's magical crafting system easier by showing what players own, what recipes require, and what can be crafted **without accidentally assigning the same ingredient to multiple requirements**.

Allow access through website rather than local host only.
