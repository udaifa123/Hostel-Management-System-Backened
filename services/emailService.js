import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

export const sendFeeReminder = async (student, fee) => {
  const html = `
    <h2>Fee Reminder</h2>
    <p>Dear ${student.user.name},</p>
    <p>This is a reminder that your fee of ₹${fee.amount} is due on ${new Date(fee.dueDate).toLocaleDateString()}.</p>
    <p>Please pay at the earliest to avoid late fees.</p>
    <a href="${process.env.FRONTEND_URL}/fees">Pay Now</a>
  `;
  
  return sendEmail(student.user.email, 'Fee Payment Reminder', html);
};