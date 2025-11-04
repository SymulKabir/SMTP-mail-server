const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com", // Hostinger SMTP host
  port: 587,
  secure: false,
  auth: {
    user: "symul@somacharnews.com",
    pass: "your-email-password",
  },
});

const mailOptions = {
  from: "symul@somacharnews.com",
  to: "saimonpranta@gmail.com",
  subject: "Test Email",
  text: "Hello! This is a test email from production.",
};

transporter.sendMail(mailOptions, (err, info) => {
  if (err) console.error("Error sending email:", err);
  else console.log("Email sent:", info.response);
});
