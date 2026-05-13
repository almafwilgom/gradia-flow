import 'dotenv/config';
import nodemailer from 'nodemailer';

async function testSMTP() {
  console.log('Testing SMTP connection...');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection is valid!');
    
    // Attempt to send a test email
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
      to: process.env.RECEIVER_EMAIL || process.env.SMTP_USER,
      subject: 'GradiaFlow SMTP Test',
      text: 'If you are reading this, your Brevo SMTP configuration is working correctly!'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Test Failed:');
    console.error(error);
    
    if (error.code === 'EAUTH') {
      console.log('\nPossible Cause: Invalid SMTP credentials. Please check your Brevo SMTP key.');
    } else if (error.code === 'ESOCKET') {
      console.log('\nPossible Cause: Connection timeout or firewall blocking the port.');
    }
  }
}

testSMTP();
