import 'dotenv/config';
import nodemailer from 'nodemailer';

async function testSMTP() {
  console.log('Testing SMTP connection (Port 465 SSL)...');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP Connection is valid (SSL)!');
    
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: process.env.RECEIVER_EMAIL,
      subject: 'GradiaFlow SMTP Test (SSL)',
      text: 'Working on Port 465!'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error) {
    console.error('❌ SMTP Test Failed:');
    console.error(error);
  }
}

testSMTP();
