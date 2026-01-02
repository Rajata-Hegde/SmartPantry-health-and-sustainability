const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

async function sendResetEmail(to, resetLink) {
  await transporter.sendMail({
    from: `"SmartPantry Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Reset your SmartPantry password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>This link expires in 15 minutes.</p>
    `
  })
}

module.exports = { sendResetEmail }
