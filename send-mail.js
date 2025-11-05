import nodemailer from 'nodemailer'

const sendMail = async () => {
  const transporter = nodemailer.createTransport({
    host: 'mail.somacharnews.com',
    port: 587, // or 465 if you configured SSL
    secure: false, // true for port 465
    auth: {
      user: 'test@somacharnews.com', // change to your real mailbox
      pass: 'your_password_here',    // password for that mailbox
    },
    tls: {
      rejectUnauthorized: false,
    },
  })

  const info = await transporter.sendMail({
    from: 'test@somacharnews.com',
    to: 'someone@gmail.com',
    subject: 'Test Email from somacharnews.com',
    text: 'This is a test email sent from my Node.js mail server.',
  })

  console.log('Message sent: %s', info.messageId)
}

sendMail().catch(console.error)
