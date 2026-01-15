#!/usr/bin/env node

/**
 * Seed script for Rotaract NYC Members Portal
 * 
 * This script helps set up initial data for the portal including:
 * - Promoting a user to ADMIN role
 * - Creating sample events, announcements, documents
 * 
 * Usage:
 *   node scripts/seed-portal.js --admin email@example.com
 *   node scripts/seed-portal.js --sample-data
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decoded);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  } else {
    console.error('Error: Firebase credentials not found in environment variables');
    process.exit(1);
  }
} catch (error) {
  console.error('Error initializing Firebase:', error.message);
  process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

async function promoteToAdmin(email) {
  try {
    console.log(`Promoting ${email} to ADMIN...`);
    
    // Get user by email
    const user = await auth.getUserByEmail(email);
    
    // Set custom claims
    await auth.setCustomUserClaims(user.uid, { role: 'ADMIN' });
    
    // Update Firestore
    await db.collection('users').doc(user.uid).set({
      name: user.displayName || 'Admin User',
      email: user.email,
      photoURL: user.photoURL || null,
      role: 'ADMIN',
      status: 'active',
      phoneOptIn: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });
    
    console.log(`✓ Successfully promoted ${email} to ADMIN`);
    console.log(`  UID: ${user.uid}`);
    console.log(`  User must sign out and sign back in for role to take effect`);
  } catch (error) {
    console.error(`✗ Error promoting user:`, error.message);
    throw error;
  }
}

async function createSampleData() {
  try {
    console.log('Creating sample data...\n');
    
    // Sample event
    const eventRef = await db.collection('events').add({
      title: 'Monthly General Meeting',
      description: 'Join us for our monthly general meeting to discuss upcoming projects and initiatives.',
      startAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 1 week from now
      endAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000)), // 2 hours later
      location: 'Virtual (Zoom link will be shared)',
      visibility: 'member',
      createdBy: 'system',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Created sample event: ${eventRef.id}`);
    
    // Sample announcement
    const announcementRef = await db.collection('announcements').add({
      title: 'Welcome to the Members Portal!',
      body: 'We\'re excited to launch our new members portal. Here you can access events, announcements, documents, and more. Please take a moment to update your profile and explore the features.',
      pinned: true,
      visibility: 'member',
      createdBy: 'system',
      createdAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Created sample announcement: ${announcementRef.id}`);
    
    // Sample document
    const documentRef = await db.collection('documents').add({
      title: 'Club Bylaws',
      category: 'Governance',
      url: 'https://example.com/bylaws.pdf',
      visibility: 'member',
      createdBy: 'system',
      createdAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Created sample document: ${documentRef.id}`);
    
    // Sample monthly summary
    const currentDate = new Date();
    const month = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    await db.collection('monthlySummaries').doc(month).set({
      month,
      startingBalance: 1000,
      incomeTotal: 500,
      expenseTotal: 300,
      endingBalance: 1200,
      categoryTotals: {
        'Fundraising': 500,
        'Events': -200,
        'Operations': -100
      },
      notes: 'Sample monthly summary',
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`✓ Created sample monthly summary: ${month}`);
    
    console.log('\n✓ Sample data created successfully!');
  } catch (error) {
    console.error('✗ Error creating sample data:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/seed-portal.js --admin email@example.com');
    console.log('  node scripts/seed-portal.js --sample-data');
    console.log('  node scripts/seed-portal.js --admin email@example.com --sample-data');
    process.exit(0);
  }
  
  try {
    if (args.includes('--admin')) {
      const emailIndex = args.indexOf('--admin') + 1;
      const email = args[emailIndex];
      if (!email || !email.includes('@')) {
        console.error('Error: Invalid email address');
        process.exit(1);
      }
      await promoteToAdmin(email);
    }
    
    if (args.includes('--sample-data')) {
      await createSampleData();
    }
    
    console.log('\n✓ All operations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Script failed:', error.message);
    process.exit(1);
  }
}

main();
