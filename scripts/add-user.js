#!/usr/bin/env node

/**
 * Quick script to add a user to Firestore
 * Run: node scripts/add-user.js
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔥 Add User to Firestore\n');
  
  const uid = await question('Enter user UID (from Firebase Auth): ');
  const name = await question('Enter full name: ');
  const email = await question('Enter email: ');
  const role = await question('Enter role (MEMBER/BOARD/TREASURER/ADMIN): ');
  
  const userData = {
    name: name.trim(),
    email: email.trim(),
    role: role.trim().toUpperCase(),
    status: 'active',
    phoneOptIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('\n📝 User data to add:');
  console.log(JSON.stringify(userData, null, 2));
  
  const confirm = await question('\nAdd this user? (yes/no): ');
  
  if (confirm.toLowerCase() === 'yes') {
    console.log('\n📋 Copy this command and run it:\n');
    console.log(`npx firebase firestore:set users/${uid} '${JSON.stringify(userData)}' --project rotaractnyc-ac453\n`);
    console.log('Or use Firebase Console to add it manually.');
  } else {
    console.log('Cancelled.');
  }
  
  rl.close();
}

main();
