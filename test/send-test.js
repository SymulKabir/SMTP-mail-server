const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "mail.micple.com",
  port: 465,
  secure: true,
  auth: {
    user: "symul@micple.com",
    pass: "YOUR_PASSWORD",
  },
});

transporter.sendMail(
  {
    from: '"Symul Mail Test" <symul@micple.com>',
    to: "saimonpranta@gmail.com",
    subject: "Testing Secure SMTP (465)",
    text: "Hello! This is a test mail from my custom SMTP server.",
  },
  (err, info) => {
    if (err) return console.error("❌ Error:", err);
    console.log("✅ Sent:", info.response);
  }
);
