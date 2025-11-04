const nodemailer = require("nodemailer");

// const transporter = nodemailer.createTransport({
//   host: "smtp.somacharnews.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: "symul@somacharnews.com",
//     pass: "ysadfswe3r",
//   },
// });
const transporter = nodemailer.createTransport({
  host: "smtp.somacharnews.com",
  port: 587,      // or 25 if 587 fails
  secure: false,  // STARTTLS
  auth: {
    user: "symul@somacharnews.com",
    pass: "ysadfswe3r",
  },
});

const mailOptions = {
  from: "symul@somacharnews.com",
  to: "someone@gmail.com",
  subject: "Test Email",
  text: "Hello! This is a test mail.",
};

transporter.sendMail(mailOptions, (err, info) => {
  if (err) console.error(err);
  else console.log("Mail sent:", info.response);
});
