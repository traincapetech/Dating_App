
const fetch = require('node-fetch');
const FormData = require('form-data');

async function testUpload() {
  const form = new FormData();
  form.append('userId', 'test-user');
  // Just a dummy small buffer
  form.append('image', Buffer.from([0,1,2]), { filename: 'test.jpg', contentType: 'image/jpeg' });

  try {
    const response = await fetch('http://localhost:3000/api/profile/upload-image', {
      method: 'POST',
      body: form
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testUpload();
