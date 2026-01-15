#!/usr/bin/env node

/**
 * Add user document to Firestore using REST API
 * Usage: node scripts/add-user-direct.js <uid> <name> <email> <role>
 */

const https = require('https');

const [,, uid, name, email, role = 'MEMBER'] = process.argv;

if (!uid || !name || !email) {
  console.log('Usage: node scripts/add-user-direct.js <uid> <name> <email> <role>');
  console.log('Example: node scripts/add-user-direct.js abc123 "John Doe" john@example.com ADMIN');
  process.exit(1);
}

const projectId = 'rotaractnyc-ac453';
const userData = {
  fields: {
    name: { stringValue: name },
    email: { stringValue: email },
    role: { stringValue: role.toUpperCase() },
    status: { stringValue: 'active' },
    phoneOptIn: { booleanValue: false },
    createdAt: { timestampValue: new Date().toISOString() },
    updatedAt: { timestampValue: new Date().toISOString() }
  }
};

console.log('\n🔥 Adding user to Firestore...\n');
console.log(`UID: ${uid}`);
console.log(`Name: ${name}`);
console.log(`Email: ${email}`);
console.log(`Role: ${role.toUpperCase()}\n`);

// Note: This requires authentication. Use Firebase Console instead.
console.log('❌ Direct REST API requires authentication token.');
console.log('\n✅ Please use Firebase Console instead:');
console.log(`https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2Fusers~2F${uid}\n`);
console.log('Or run: npm run seed:portal -- --admin ' + email);

