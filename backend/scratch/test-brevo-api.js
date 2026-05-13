import 'dotenv/config';

async function testBrevoAPI() {
  console.log('Testing Brevo API with xkeysib...');
  
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_ADDRESS || 'gomenochalmafwil@gmail.com';
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'GradiaFlow Test', email: fromEmail },
      to: [{ email: process.env.RECEIVER_EMAIL || fromEmail, name: 'User' }],
      subject: 'Brevo API Test (Final)',
      htmlContent: '<html><body><h1>Success!</h1><p>The API is working perfectly.</p></body></html>'
    })
  });

  const data = await response.json();
  if (response.ok) {
    console.log('✅ Brevo API Success!');
    console.log(data);
  } else {
    console.error('❌ Brevo API Failed:');
    console.error(data);
  }
}

testBrevoAPI();
