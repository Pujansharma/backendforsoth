// ==============================
// 📦 IMPORTS & SETUP
// ==============================

const router = require("./routes");
const mongoose = require("mongoose");
const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static("public")); // serve your admin HTML

mongoose
  .connect("mongodb+srv://pujansharma:pujansharma@cluster0.epdy6qd.mongodb.net/southend", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

app.use("/api/hotels", router);
// ==============================
// ✉️ 1️⃣ ENQUIRY EMAIL API (for booking/enquiry forms)
// ==============================
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

// ==============================
// 🚀 SERVER START
// ==============================
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on: http://localhost:${PORT}`)
);
