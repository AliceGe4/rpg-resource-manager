const express = require("express");
const path = require("node:path");
const fs = require("node:fs/promises");
const crypto = require("node:crypto");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

app.disable("x-powered-by");
app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Generate a fingerprint of the current JSON file.
// This lets us detect changes made by another device.
function revisionOf(contents) {
  return crypto.createHash("sha256").update(contents).digest("hex");
}

// ===== Load shared data =====

app.get("/api/data", async (req, res) => {
  try {
    const contents = await fs.readFile(DATA_FILE, "utf8");

    res.set("Cache-Control", "no-store");

    res.json({
      revision: revisionOf(contents),
      data: JSON.parse(contents),
    });
  } catch (error) {
    console.error("Unable to read data:", error);

    res.status(500).json({
      error: "Unable to load shared data",
    });
  }
});

// Queue writes so two saves cannot modify the file simultaneously.
let saveQueue = Promise.resolve();

// ===== Save shared data =====

app.put("/api/data", (req, res) => {
  const operation = saveQueue.then(async () => {
    const { expectedRevision, data } = req.body ?? {};

    if (
      typeof expectedRevision !== "string" ||
      !data ||
      !Array.isArray(data.items) ||
      !Array.isArray(data.recipes)
    ) {
      return res.status(400).json({
        error: "Invalid save format",
      });
    }

    const previous = await fs.readFile(DATA_FILE, "utf8");

    // Someone changed the data since this device loaded it.
    if (revisionOf(previous) !== expectedRevision) {
      return res.status(409).json({
        error: "Another device updated the data",
      });
    }

    const next = JSON.stringify(data, null, 2) + "\n";

    // Save through a temporary file to avoid partial writes.
    const temporaryFile = DATA_FILE + ".tmp";

    await fs.writeFile(temporaryFile, next, "utf8");
    await fs.rename(temporaryFile, DATA_FILE);

    res.json({
      revision: revisionOf(next),
    });
  });

  saveQueue = operation.catch((error) => {
    console.error("Unable to save data:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Unable to save shared data",
      });
    }
  });
});

// Allow devices on the local network to connect.
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Resource Manager: http://localhost:${PORT}`);
});
