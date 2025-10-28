const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs");
const app = express();
app.use(express.json());
app.use(cors());

// ✅ MongoDB connection
mongoose.connect("mongodb+srv://pujansharma:pujansharma@cluster0.epdy6qd.mongodb.net/southend")
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

const hotelSchema = new mongoose.Schema({
  name: String,
  description: String,
  images: [String], // This will store image URLs only
});

const Hotel = mongoose.model("Hotel", hotelSchema);

// ✅ Get all hotels
app.get("/api/hotels", async (req, res) => {
  try {
    const hotels = await Hotel.find();
    res.json(hotels);
  } catch (err) {
    console.error("Error fetching hotels:", err);
    res.status(500).json({ error: "Failed to fetch hotels" });
  }
});

// ✅ Get single hotel
app.get("/api/hotels/:name", async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ name: req.params.name });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    res.json(hotel);
  } catch (err) {
    console.error("Error fetching hotel:", err);
    res.status(500).json({ error: "Failed to fetch hotel" });
  }
});

// ✅ Add / Update hotel description and images - FIXED
app.post("/api/hotels", async (req, res) => {
  try {
    const { name, description, images } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Hotel name is required" });
    }

    // Validate image URLs
    const validImages = images ? images.filter(img => {
      return typeof img === 'string' && img.trim() !== '';
    }) : [];

    let hotel = await Hotel.findOne({ name });

    if (hotel) {
      // Update existing hotel - ALWAYS update description
      hotel.description = description;
      
      // If new images are provided, add them without duplicates
      if (validImages.length > 0) {
        const existingImages = hotel.images || [];
        const newImages = validImages.filter(img => !existingImages.includes(img));
        hotel.images = [...existingImages, ...newImages];
      }
      // If no new images provided, keep existing images
      
      await hotel.save();
      res.json({ message: "Hotel updated successfully!", hotel });
    } else {
      // Create new hotel
      hotel = await Hotel.create({ 
        name, 
        description, 
        images: validImages 
      });
      res.json({ message: "Hotel added successfully!", hotel });
    }
  } catch (err) {
    console.error("Error saving hotel:", err);
    res.status(500).json({ error: "Failed to save hotel" });
  }
});

// ✅ Delete specific image from hotel
app.delete("/api/hotels/:name/images", async (req, res) => {
  try {
    const { name } = req.params;
    const { imageUrl } = req.body;
    
    const hotel = await Hotel.findOne({ name });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Remove the specific image URL
    hotel.images = hotel.images.filter(img => img !== imageUrl);
    await hotel.save();
    
    res.json({ message: "Image deleted successfully!", hotel });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// ✅ Update hotel description only
app.put("/api/hotels/:name/description", async (req, res) => {
  try {
    const { name } = req.params;
    const { description } = req.body;
    
    const hotel = await Hotel.findOne({ name });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    hotel.description = description;
    await hotel.save();
    
    res.json({ message: "Description updated successfully!", hotel });
  } catch (err) {
    console.error("Error updating description:", err);
    res.status(500).json({ error: "Failed to update description" });
  }
});

// ✅ Add images to hotel - FIXED
app.post("/api/hotels/:name/images", async (req, res) => {
  try {
    const { name } = req.params;
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ error: "Images array is required" });
    }

    const hotel = await Hotel.findOne({ name });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Validate and filter images
    const validImages = images.filter(img => {
      return typeof img === 'string' && img.trim() !== '';
    });

    if (validImages.length === 0) {
      return res.status(400).json({ error: "No valid image URLs provided" });
    }

    // Add new images without duplicates
    const existingImages = hotel.images || [];
    const newImages = validImages.filter(img => !existingImages.includes(img));
    
    if (newImages.length === 0) {
      return res.status(400).json({ error: "All images already exist for this hotel" });
    }

    hotel.images = [...existingImages, ...newImages];
    await hotel.save();
    
    res.json({ 
      message: `${newImages.length} image(s) added successfully!`, 
      hotel,
      addedImages: newImages 
    });
  } catch (err) {
    console.error("Error adding images:", err);
    res.status(500).json({ error: "Failed to add images" });
  }
});

// ✅ Delete entire hotel
app.delete("/api/hotels/:name", async (req, res) => {
  try {
    const { name } = req.params;
    
    const hotel = await Hotel.findOneAndDelete({ name });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }
    
    res.json({ message: "Hotel deleted successfully!" });
  } catch (err) {
    console.error("Error deleting hotel:", err);
    res.status(500).json({ error: "Failed to delete hotel" });
  }
});
const testimonialSchema = new mongoose.Schema({
  author: String,
  text: String,
  avatar: {
    type: String,
    default: "./images/testimonial.jpg", // Default avatar remains same
  },
  date: { type: Date, default: Date.now },
});

const Testimonial = mongoose.model("Testimonial", testimonialSchema);

// ✅ Add new testimonial (for admin panel)
app.post("/api/testimonials", async (req, res) => {
  try {
    const { author, text } = req.body;
    if (!author || !text)
      return res.status(400).json({ message: "Name and message are required" });

    const newTestimonial = new Testimonial({ author, text });
    await newTestimonial.save();
    res.json({ message: "Testimonial added successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get all testimonials
app.get("/api/testimonials", async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ date: -1 });
    res.json(testimonials);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete a testimonial by ID
app.delete("/api/testimonials/:id", async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial)
      return res.status(404).json({ message: "Testimonial not found" });
    res.json({ message: "Testimonial deleted successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


const Adminmail = "sharmapujan209@gmail.com";
const transporter = nodemailer.createTransport({
service: "gmail",
      auth: {
        user: Adminmail, // Your Gmail
        pass: "hwsajsrubfergxyp", // App Password (from Google)
      },
    });
app.post("/send-enquiry", async (req, res) => {
  const { checkIn, checkOut, adults, children, phone } = req.body;

  if (!phone) {
    return res
      .status(400)
      .json({ success: false, message: "User email is required" });
  }

  try {
    // Transporter for Gmail
    // const transporter = nodemailer.createTransport({
    //   service: "gmail",
    //   auth: {
    //     user: Adminmail, // Your Gmail
    //     pass: "hwsajsrubfergxyp", // App Password (from Google)
    //   },
    // });

    // Email to Admin
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

    // Confirmation Email to User
    const userMail = {
      from: Adminmail,
      to: phone, // user’s email address
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
        <br>
        <p>— Team Southend Group</p>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    res.json({
      success: true,
      message: "Emails sent to admin and user successfully!",
    });
  } catch (error) {
    console.error("❌ Error sending enquiry email:", error);
    res.status(500).json({ success: false, message: "Email sending failed." });
  }
});

// ==============================
// 💌 2️⃣ CONTACT FORM EMAIL API (for general contact form)
// ==============================
app.post("/send-mail", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  try {
    // Mail content for Admin
    const adminMail = {
      from: email,
      to: Adminmail, // Admin email
      subject: `New Message from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    };

    await transporter.sendMail(adminMail);
    res
      .status(200)
      .json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending contact email:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.post("/send-contact-message", async (req, res) => {
  const { firstName, lastName, email, phone, message } = req.body;

  if (!firstName || !lastName || !email || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill all required fields." });
  }

  try {
    
    // Email to Admin
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
        <br>
        <p>— Sent via Website Contact Form</p>
      `,
    };

    // Confirmation email to user
    const userMail = {
      from: Adminmail,
      to: email,
      subject: "Thank You for Contacting Us!",
      html: `
        <h2>Hello ${firstName},</h2>
        <p>Thank you for reaching out! We’ve received your message</p>
        <p>Our team will contact you shortly.</p>
        <br>
        <p>— Team Southend Group</p>
      `,
    };

    // Send both emails
    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    res.status(200).json({ success: true, message: "Emails sent successfully!" });
  } catch (error) {
    console.error("❌ Error sending contact email:", error);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});
app.post("/api/reservation", async (req, res) => {
  try {
    const { name, email, phone, hotel, checkIn, checkOut, nights, guests, adults } = req.body;

    // 📨 1. Send mail to Admin
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

    // 📨 2. Send mail to User
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
        <p>We look forward to welcoming you!</p>
      `,
    };

    await transporter.sendMail(adminMail);
    await transporter.sendMail(userMail);

    res.json({ success: true, message: "Emails sent successfully" });
  } catch (error) {
    console.error("Mail Error:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

app.get("/api/popup", (req, res) => {
  try {
    if (fs.existsSync("popup.json")) {
      const popupData = JSON.parse(fs.readFileSync("popup.json"));
      return res.json(popupData);
    }
    res.json({ active: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Add / update popup image URL
app.post("/api/popup", (req, res) => {
  const { imageUrl } = req.body;
  if (!imageUrl)
    return res.status(400).json({ message: "Image URL is required" });

  const popupData = { active: true, imageUrl };
  fs.writeFileSync("popup.json", JSON.stringify(popupData, null, 2));
  res.json({ message: "Popup image added successfully!", ...popupData });
});

// ✅ Remove popup
app.delete("/api/popup", (req, res) => {
  try {
    if (fs.existsSync("popup.json")) fs.unlinkSync("popup.json");
    res.json({ message: "Popup removed successfully!" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(5000, () => console.log("✅ Server running on port 5000"));