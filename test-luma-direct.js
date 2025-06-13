const axios = require('axios');

async function testLumaIntegration() {
  console.log('🔍 Testing Luma Integration Directly...\n');
  
  try {
    // Step 1: Login
    console.log('1️⃣ Logging in with wallet...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/wallet-login', {
      walletAddress: '14Ddt2zkptrVVFGCx69MofrWKVRsRLJPCsqUKAbDCswoTqzq'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful! Token received.\n');
    
    // Step 2: Test Luma Connection
    console.log('2️⃣ Testing Luma connection...');
    console.log('📝 Please enter your Luma API key when prompted.');
    console.log('📝 Please enter your organization: samuelarogbonlo\n');
    
    // You'll need to add your real API key here
    const LUMA_API_KEY = 'secret-fOp0jjjitrQFXoYg15j8gEAHf'; // Replace with your actual API key
    const ORGANIZATION = 'samuelarogbonlo';
    
    if (LUMA_API_KEY === 'YOUR_LUMA_API_KEY_HERE') {
      console.log('❌ Please edit test-luma-direct.js and add your real Luma API key on line 20');
      return;
    }
    
    const lumaResponse = await axios.post('http://localhost:3001/api/users/luma/connect', {
      lumaApiKey: LUMA_API_KEY,
      lumaOrganization: ORGANIZATION
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Luma connection successful!');
    console.log('📊 Response:', lumaResponse.data);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔐 Authentication failed - check wallet address');
    } else if (error.response?.status === 400) {
      console.log('🔑 Luma API credentials issue - check API key and organization');
    } else {
      console.log('🔧 Other error - check backend logs');
    }
  }
}

testLumaIntegration();