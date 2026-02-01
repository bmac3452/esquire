const axios = require('axios');

const API_URL = 'http://localhost:4000';

async function testAPI() {
  try {
    // 1. Sign up a user
    console.log('1. Signing up a user...');
    const signupRes = await axios.post(`${API_URL}/auth/signup`, {
      email: 'testuser@example.com',
      password: 'TestPassword123!',
      state: 'CA',
      educationLevel: 'COLLEGE_PLUS',
    });
    console.log('✅ Signup successful:', signupRes.data);
    const token = signupRes.data.token;

    // 2. Create a client
    console.log('\n2. Creating a client...');
    const clientRes = await axios.post(
      `${API_URL}/clients`,
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('✅ Client created:', clientRes.data);

    // 3. Create a case note
    console.log('\n3. Creating a case note...');
    const caseRes = await axios.post(
      `${API_URL}/cases`,
      {
        content: 'Initial consultation with client. Discussed case details.',
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log('✅ Case note created:', caseRes.data);

    // 4. Get all case notes
    console.log('\n4. Getting all case notes...');
    const notesRes = await axios.get(`${API_URL}/cases`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Case notes:', notesRes.data);

    // 5. Get all clients
    console.log('\n5. Getting all clients...');
    const clientsRes = await axios.get(`${API_URL}/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('✅ Clients:', clientsRes.data);

    console.log('\n🎉 All tests passed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.response?.data || error.message);
  }
}

testAPI();
