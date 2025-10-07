import express from "express";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Contact from "../models/Contact.js"; // <-- Import the model

dotenv.config();

const router = express.Router();

router.post("/send-email", async (req, res) => {
  const { name, email, subject, message, priority } = req.body;
  const to = process.env.EMAIL_USER;

  try {
    // 1️⃣ Save form data to DB
    const newContact = new Contact({ name, email, subject, message, priority });
    await newContact.save();

    // 2️⃣ Create transporter
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // 3️⃣ Email body
    const emailBody = `
Name: ${name}
Email: ${email}
Priority: ${priority}
Subject: ${subject}

Message:
${message}
    `;

    // 4️⃣ Send email
    let info = await transporter.sendMail({
      from: `"${name}" <${email}>`,
      to,
      subject: `Contact Form: ${subject} [Priority: ${priority}]`,
      text: emailBody,
      replyTo: email,
    });

    console.log("✅ Email sent successfully:", info.messageId);
    res.status(200).json({ message: "Email sent & data saved", info });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ message: "Failed to send email", error: error.message });
  }
});

export default router;
