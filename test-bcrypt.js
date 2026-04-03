const bcrypt = require('bcryptjs');

async function testBcrypt() {
  try {
    const password = 'test123';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('✅ Bcrypt working!');
    console.log('Password:', password);
    console.log('Hash:', hash);
    
    const isValid = await bcrypt.compare(password, hash);
    console.log('Compare result:', isValid);
  } catch (error) {
    console.error('❌ Bcrypt error:', error);
  }
}

testBcrypt();