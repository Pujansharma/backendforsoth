const express = require("express");
const router = express.Router();
const { Hotel } = require("./model");

const ALLOWED_HOTELS = [
  "Hotel SouthEnd",
  "Hotel Surf Ride Digha",
  "Hotel Rupsagar",
  "Mahamaya Dham"
];

// ➕ Add or update hotel
router.post("/", async (req, res) => {
  try {
    const { name, location, description, images } = req.body;

    if (!ALLOWED_HOTELS.includes(name)) {
      return res.status(400).json({ error: "Invalid hotel name." });
    }

    const newImages = Array.isArray(images) ? images : [images].filter(Boolean);
    let hotel = await Hotel.findOne({ name });

    if (hotel) {
      // Ensure existing images is an array
      if (!Array.isArray(hotel.images)) {
        hotel.images = [];
      }

      // Update fields
      if (description) hotel.description = description;
      if (location) hotel.location = location;
      if (newImages.length > 0) {
        hotel.images = [...new Set([...hotel.images, ...newImages])];
      }

      await hotel.save();
      return res.json({ message: "Hotel updated successfully", hotel });
    }

    // If not exist, create new
    hotel = new Hotel({ name, location, description, images: newImages });
    await hotel.save();
    res.status(201).json({ message: "Hotel added successfully", hotel });
  } catch (err) {
    console.error("Error saving hotel:", err);
    res.status(500).json({ error: "Error saving hotel" });
  }
});

// 📜 Get all hotels
router.get("/", async (req, res) => {
  try {
    const hotels = await Hotel.find();
    res.json(hotels);
  } catch (err) {
    res.status(500).json({ error: "Error fetching hotels" });
  }
});

// 🧭 Get hotel by name
router.get("/:name", async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ name: req.params.name });
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });
    res.json(hotel);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ✏️ Update hotel by name
router.put("/:name", async (req, res) => {
  try {
    const { description, images, location } = req.body;
    const newImages = Array.isArray(images) ? images : [images].filter(Boolean);

    let hotel = await Hotel.findOne({ name: req.params.name });
    if (!hotel) return res.status(404).json({ message: "Hotel not found" });

    // Ensure it's always an array
    if (!Array.isArray(hotel.images)) {
      hotel.images = [];
    }

    if (description) hotel.description = description;
    if (location) hotel.location = location;
    if (newImages.length > 0) {
      hotel.images = [...new Set([...hotel.images, ...newImages])];
    }

    await hotel.save();
    res.json({ message: "Hotel updated successfully", hotel });
  } catch (error) {
    console.error("Error updating hotel:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// ❌ Delete hotel by name
router.delete("/:name", async (req, res) => {
  try {
    const deleted = await Hotel.findOneAndDelete({ name: req.params.name });
    if (!deleted) return res.status(404).json({ message: "Hotel not found" });
    res.json({ message: "Hotel deleted successfully" });
  } catch (error) {
    console.error("Error deleting hotel:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
