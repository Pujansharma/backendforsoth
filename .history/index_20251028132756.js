// app.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs");
const helmet = require("helmet");

const app = express();

// Basic security headers
app.use(helmet());

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * CORS setup
 * - If FRONTEND_ORIGINS is set (comma-separated), use it as whitelist.
 * - Otherwise allow all (for quick dev). In production set FRONTEND_ORIGINS.
 */
const FRONTEND_ORIGINS = process.env.FRONTEND_ORIGINS; // e.g. "http://127.0.0.1:5500,https://yourdomain.com"
let corsOptions = {};
if (FRONTEND_ORIGINS) {
  const allowed = FRONTEND_ORIGINS.split(",").map(s => s.trim());
  corsOptions = {
    origin: function (origin, callback) {
      // allow requests with no origin (like curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowed.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  };
} else {
  corsOptions = {
    origin: true, // allow all origins (dev). Set FRONTEND_ORIGINS in production.
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // enable preflight for all routes

// ---------------------
// MongoDB connection
// ---------------------
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/southend";
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ---------------------
// Schemas & Models
// ---------------------
const hotelSchema = new mongoose.Schema({
  name: String,
  description: String,
  images: [String],
});
const Hotel = mongoose.model("Hotel", hotelSchema);

const testimonialSchema = new mongoose.Schema({
  author: String,
  text: String,
  avatar: {
    type: String,
    default: "./images/testimonial.jpg",
  },
  date: { type: Date, default: Date.now },
});
const Testimonial = mongoose.model("Testimonial", testimonialSchema);

// ---------------------
// Nodemailer transporter (use env vars)
// ---------------------
const Adminmail = process.env.ADMIN_EMAIL;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!Adminmail || !EMAIL_PASS) {
  console.warn(
    "⚠️ ADMIN_EMAIL or EMAIL_PASS not set. Email routes will fail until you set them in environment variables."
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: Adminmail,
    pass: EMAIL_PASS,
  },
});

// verify transporter at startup (will log error if auth fails)
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ Nodemailer transporter verify failed:", err);
  } else {
    console.log("✅ Nodemailer transporter ready");
  }
});

// ---------------------
// Routes
// ---------------------

// GET all hotels
app.get("/api/hotels", async (req, res) => {
  try {
    const hotels = await Hotel.find();
    res.json(hotels);
  } catch (err) {
    console.error("Error fetching hotels:", err);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

// GET single hotel by name
app.get("/api/hotels/:name", async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ name: req.params.name });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    res.json(hotel);
  } catch (err) {
    console.error("Error fetching hotel:", err);
    res.status(500).json({ error: "Failed to fetch hotel" });
  }
});

// Create or update hotel
app.post("/api/hotels", async (req, res) => {
  try {
    const { name, description, images } = req.body;
    if (!name) return res.status(400).json({ error: "Hotel name is required" });
    const validImages = Array.isArray(images) ? images.filter(i => typeof i === "string" && i.trim() !== "") : [];
    let hotel = await Hotel.findOne({ name });
    if (hotel) {
      hotel.description = description;
      if (validImages.length > 0) {
        const existing = hotel.images || [];
        const newImages = validImages.filter(i => !existing.includes(i));
        hotel.images = [...existing, ...newImages];
      }
      await hotel.save();
      return res.json({ message: "Hotel updated successfully!", hotel });
    }
    hotel = await Hotel.create({ name, description, images: validImages });
    res.json({ message: "Hotel added successfully!", hotel });
  } catch (err) {
    console.error("Error saving hotel:", err);
    res.status(500).json({ error: "Failed to save hotel" });
  }
});

// Delete specific image from a hotel
app.delete("/api/hotels/:name/images", async (req, res) => {
  try {
    const { name } = req.params;
    const { imageUrl } = req.body;
    const hotel = await Hotel.findOne({ name });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    hotel.images = (hotel.images || []).filter(img => img !== imageUrl);
    await hotel.save();
    res.json({ message: "Image deleted successfully!", hotel });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Update hotel description only
app.put("/api/hotels/:name/description", async (req, res) => {
  try {
    const { name } = req.params;
    const { description } = req.body;
    const hotel = await Hotel.findOne({ name });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    hotel.description = description;
    await hotel.save();
    res.json({ message: "Description updated successfully!", hotel });
  } catch (err) {
    console.error("Error updating description:", err);
    res.status(500).json({ error: "Failed to update description" });
  }
});

// Add images to hotel
app.post("/api/hotels/:name/images", async (req, res) => {
  try {
    const { name } = req.params;
    const { images } = req.body;
    if (!images || !Array.isArray(images)) return res.status(400).json({ error: "Images array is required" });
    const hotel = await Hotel.findOne({ name });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    const validImages = images.filter(img => typeof img === "string" && img.trim() !== "");
    if (validImages.length === 0) return res.status(400).json({ error: "No valid image URLs provided" });
    const existing = hotel.images || [];
    const newImages = validImages.filter(img => !existing.includes(img));
    if (newImages.length === 0) return res.status(400).json({ error: "All images already exist for this hotel" });
    hotel.images = [...existing, ...newImages];
    await hotel.save();
    res.json({ message: `${newImages.length} image(s) added successfully!`, hotel, addedImages: newImages });
  } catch (err) {
    console.error("Error adding images:", err);
    res.status(500).json({ error: "Failed to add images" });
  }
});

// Delete entire hotel
app.delete("/api/hotels/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const hotel = await Hotel.findOneAndDelete({ name });
    if (!hotel) return res.status(404).json({ error: "Hotel not found" });
    res.json({ message: "Hotel deleted successfully!" });
  } catch (err) {
    console.error("Error deleting hotel:", err);
    res.status(500).json({ error: "Failed to delete hotel" });
  }
});

// Testimonials
app.post("/api/testimonials", async (req, res) => {
  try {
    const { author, text } = req.body;
    if (!author || !text) return res.status(400).json({ message: "Name and message are required" });
    const newTestimonial = new Testimonial({ author, text });
    await newTestimonial.save();
    res.json({ message: "Testimonial added successfully!" });
  } catch (err) {
    console.error("Error adding testimonial:", err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/testimonials", async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ date: -1 });
    res.json(testimonials);
  } catch (err) {
    console.error("Error fetching testimonials:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/testimonials/:id", async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: "Testimonial not found" });
    res.json({ message: "Testimonial deleted successfully!" });
  } catch (err) {
    console.error("Error deleting testimonial:", err);
    res.status(500).json({ message: err.message });
  }
});

// ---------------------
// Enquiry / Contact / Reservation Email routes
// ---------------------

// Helper to safely send mail and log errors
async function safeSendMail(mailOptions) {
  try {
    return await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("Mail send failed:", err);
    throw err;
  }
}

// send-enquiry
app.post("/send-enquiry", async (req, res) => {
  const { checkIn, checkOut, adults, children, phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: "User email is required" });

  try {
    const adminMail = {
      from: Adminmail,
      to: Adminmail,
      subject: "New Enquiry Received from Website",
      html: `
        <h2>New Enquiry Received</h2>
        <p>Here are the details:</p>
        <ul>
          <li><b>Check-In:</b> ${checkIn}</li>
          <li><b>Check-Out:</b> ${checkOut}</li>
          <li><b>Adults:</b> ${adults}</li>
          <li><b>Children:</b> ${children}</li>
          <li><b>User Email:</b> ${phone}</li>
        </ul>
        <p>— This enquiry was submitted via your website form.</p>
      `,
    };

    const userMail = {
      from: Adminmail,
      to: phone,
      subject: "Thank You for Your Enquiry",
      html: `
        <h2>Thank you for reaching out!</h2>
        <p>We’ve received your enquiry with the following details:</p>
        <ul>
          <li><b>Check-In:</b> ${checkIn}</li>
          <li><b>Check-Out:</b> ${checkOut}</li>
          <li><b>Adults:</b> ${adults}</li>
          <li><b>Children:</b> ${children}</li>
        </ul>
        <p>Our team will contact you shortly.</p>
        <p>— Team Southend Group</p>
      `,
    };

    await safeSendMail(adminMail);
    await safeSendMail(userMail);

    res.json({ success: true, message: "Emails sent to admin and user successfully!" });
  } catch (error) {
    console.error("❌ Error sending enquiry email:", error);
    res.status(500).json({ success: false, message: "Email sending failed." });
  }
});

// send-mail (general contact)
app.post("/send-mail", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ success: false, message: "All fields are required" });

  try {
    const adminMail = {
      from: email,
      to: Adminmail,
      subject: `New Message from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    };

    await safeSendMail(adminMail);
    res.status(200).json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending contact email:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/send-contact-message", async (req, res) => {
  const { firstName, lastName, email, phone, message } = req.body;
  if (!firstName || !lastName || !email || !message) {
    return res.status(400).json({ success: false, message: "Please fill all required fields." });
  }

  try {
    const adminMail = {
      from: email,
      to: Adminmail,
      subject: `New Contact Message from ${firstName} ${lastName}`,
      html: `
        <h2>New Contact Form Message</h2>
        <ul>
          <li><b>Name:</b> ${firstName} ${lastName}</li>
          <li><b>Email:</b> ${email}</li>
          <li><b>Phone:</b> ${phone || "Not provided"}</li>
        </ul>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    };

    const userMail = {
      from: Adminmail,
      to: email,
      subject: "Thank You for Contacting Us!",
      html: `
        <h2>Hello ${firstName},</h2>
        <p>Thank you for reaching out! We’ve received your message</p>
        <p>Our team will contact you shortly.</p>
        <p>— Team Southend Group</p>
      `,
    };

    await safeSendMail(adminMail);
    await safeSendMail(userMail);

    res.status(200).json({ success: true, message: "Emails sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending contact email:", error);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

// reservation
app.post("/api/reservation", async (req, res) => {
  try {
    const { name, email, phone, hotel, checkIn, checkOut, nights, guests, adults } = req.body;

    const adminMail = {
      from: Adminmail,
      to: Adminmail,
      subject: `New Reservation - ${hotel}`,
      html: `
        <h2>New Reservation Request</h2>
        <ul>
          <li><b>Name:</b> ${name}</li>
          <li><b>Email:</b> ${email}</li>
          <li><b>Phone:</b> ${phone}</li>
          <li><b>Hotel:</b> ${hotel}</li>
          <li><b>Check-In:</b> ${checkIn}</li>
          <li><b>Check-Out:</b> ${checkOut}</li>
          <li><b>Nights:</b> ${nights}</li>
          <li><b>Guests:</b> ${guests} (Adults: ${adults})</li>
        </ul>
      `,
    };

    const userMail = {
      from: Adminmail,
      to: email,
      subject: `Your Reservation at ${hotel} is Confirmed`,
      html: `
        <h2>Reservation Confirmed!</h2>
        <p>Dear ${name},</p>
        <p>Thank you for booking with us. Here are your details:</p>
        <ul>
          <li><b>Hotel:</b> ${hotel}</li>
          <li><b>Check-In:</b> ${checkIn}</li>
          <li><b>Check-Out:</b> ${checkOut}</li>
          <li><b>Nights:</b> ${nights}</li>
          <li><b>Guests:</b> ${guests} (Adults: ${adults})</li>
        </ul>
      `,
    };

    await safeSendMail(adminMail);
    await safeSendMail(userMail);

    res.json({ success: true, message: "Emails sent successfully" });
  } catch (error) {
    console.error("Mail Error:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

// popup endpoints
app.get("/api/popup", (req, res) => {
  try {
    if (fs.existsSync("popup.json")) {
      const popupData = JSON.parse(fs.readFileSync("popup.json", "utf8"));
      return res.json(popupData);
    }
    res.json({ active: false });
  } catch (err) {
    console.error("Error reading popup:", err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/popup", (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ message: "Image URL is required" });
    const popupData = { active: true, imageUrl };
    fs.writeFileSync("popup.json", JSON.stringify(popupData, null, 2));
    res.json({ message: "Popup image added successfully!", ...popupData });
  } catch (err) {
    console.error("Error writing popup:", err);
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/popup", (req, res) => {
  try {
    if (fs.existsSync("popup.json")) fs.unlinkSync("popup.json");
    res.json({ message: "Popup removed successfully!" });
  } catch (err) {
    console.error("Error removing popup:", err);
    res.status(500).json({ message: err.message });
  }
});

// ---------------------
// Global Error Handler
// ---------------------
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({ error: "Something went wrong!" });
});

// ---------------------
// Unhandled Rejection / Exception logging
// ---------------------
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// ---------------------
// Start Server (uses Render's PORT)
// ---------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
