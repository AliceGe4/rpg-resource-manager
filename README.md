# Growth Resource Organizer

A responsive, browser-based crafting and inventory manager built for a homebrew tabletop RPG. It helps players track magical materials, discover which recipes can be crafted, and explore the closest possible combinations when ingredients are missing.

Built with **HTML, CSS, vanilla JavaScript, Node.js, and Express**. Designed to run on a trusted local network so players can use the same shared inventory from a computer, tablet, or phone.

## Features

### Resource and inventory management
- Create, edit, and remove ingredient items.
- Assign multiple magical resource attributes to an item (for example, Strength, Dexterity, and Aeromancy).
- Track quantities for each item, including items with zero stock.
- Record unidentified (`???`) attributes.
- Sort the resource table by name or quantity.

### Recipe management
- Create, edit, and delete recipes, including descriptions and per-resource quantities.
- Use alternative requirements such as `Strength/Dexterity` when either resource is acceptable.
- Track completed recipes as **Yes / No**, or as **Yes x1, Yes x2, ...** for repeatable recipes.
- Sort recipes by name, crafted count, or current craftability.

### Crafting and combination search
- Check craftability using **recursive backtracking** that respects available item quantities.
- Each unit of an ingredient can fulfill only **one** resource requirement per craft, even if that ingredient offers several resource attributes.
- Click **Yes** to explore valid ingredient combinations, select one, and craft the recipe.
- See a confirmation showing which materials and quantities will be consumed before committing a craft.
- Automatically deduct consumed items, update the crafted count, and save the result after confirmation.
- Click **No** to view the **closest partial combinations**, including their missing resource requirements. Only combinations satisfying the maximum achievable number of requirements are shown.
- Remove duplicate combinations that consume the same items in the same quantities.

### Shared data and backups
- Store the shared inventory and recipes in a local `data.json` file served by Node.js/Express.
- Access the same application and data from other devices on the same home network using the host PC's local IP address.
- **Export JSON** to download a backup, and **Import JSON** to restore or replace the shared data.
- Check data revisions when saving to avoid silently overwriting another device's newer changes.

### Interface
- Desktop and mobile-friendly layouts, including mobile table views and sorting controls.
- Dark-blue and gold theme, interactive status buttons, and scrollable modals.
- Nested dialogs for editing items and recipes without losing the parent table.

## Tech stack

| Technology | Purpose |
| --- | --- |
| HTML5 / CSS3 | Responsive interface and styling |
| Vanilla JavaScript | Inventory, recipes, crafting search, and DOM interactions |
| Node.js + Express | Local web server and JSON read/write API |
| JSON | Shared data format and manual backups |

No external database or cloud account is required.

## Getting started

### Requirements

- Node.js and npm
- A computer to host the server

### Install and run

1. Clone this repository (or download its source code).
2. In the project root, install dependencies:

   ```bash
   npm install
   ```

3. Create a `data.json` file in the project root. You can copy `data.example.json` to `data.json`, or start with:

   ```json
   {
     "version": 2,
     "items": [],
     "recipes": []
   }
   ```

4. Start the local server:

   ```bash
   node server.js
   ```

5. Open **http://localhost:3000** on the hosting computer.

To use the app on another device, connect that device to the same trusted local network and open:

```text
http://YOUR-PC-LOCAL-IP:3000
```

On Windows, find your PC's local IPv4 address with `ipconfig`. The hosting PC must remain on and the server must be running. Your firewall may need to permit local-network access to Node.js.

## How the crafting algorithm works

Recipes are expanded into individual requirement slots. For each slot, the recursive search explores eligible inventory items and resource assignments while tracking the number of unused copies. A unit used for one requirement cannot also satisfy another requirement.

The **Yes** view enumerates distinct complete combinations. The **No** view searches partial assignments and keeps only those with the highest number of satisfied requirements, listing the missing requirements for each result.

For example, if two Bat Wings each offer Strength or Dexterity, a recipe requiring `2 Strength + 1 Dexterity` is **not** craftable using only those two wings: it requires three item units.

> **Performance note:** Enumerating *all* combinations is combinatorial and may be slow for especially large inventories or recipes.

## Save format and backups

Items and recipes use versioned JSON. For example:

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
      "name": "Example Enchantment",
      "ingredients": { "Strength": 1, "Dexterity": 1 },
      "description": "An illustrative recipe.",
      "repeatable": true,
      "craftedCount": 0
    }
  ]
}
```

Use **Export JSON** before significant changes or updates, and **Import JSON** to restore a backup. The real `data.json` is intentionally excluded from Git; it is not stored in this repository.

## Local-network and security notes

- This project is intended for use on a **trusted LAN**, not for public internet hosting.
- The basic server does **not** authenticate users. Anyone able to reach it on your local network may be able to edit its data.
- Do **not** forward the server port to the public internet.
- Other devices may need to refresh to see recently saved changes. Concurrent edits are protected by revision checks rather than automatically merged.

## Project status

**Completed for the current project scope.** The app supports inventory tracking, recipe management, valid and closest combination searches, crafting with confirmation, shared local storage, and manual JSON backup/restore.

Created as a practical tool for a custom tabletop RPG and as a personal JavaScript project exploring recursion, backtracking, state management, responsive UI design, and lightweight local-server development.
