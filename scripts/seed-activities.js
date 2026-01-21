/**
 * Seed script to add sample activities to Firestore
 * Run with: node scripts/seed-activities.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : require('../service-account-key.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const sampleActivities = [
  {
    type: 'member',
    action: 'created',
    title: 'New member joined',
    description: 'Sarah Johnson joined the club',
    userName: 'Admin',
    userEmail: 'admin@rotaractnyc.org',
    metadata: { memberId: 'sample-1', memberEmail: 'sarah@example.com' },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
  },
  {
    type: 'event',
    action: 'created',
    title: 'Event published',
    description: 'Annual Gala 2026 is now live',
    userName: 'Admin',
    userEmail: 'admin@rotaractnyc.org',
    metadata: { eventId: 'sample-event-1', eventTitle: 'Annual Gala 2026' },
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) // 5 hours ago
  },
  {
    type: 'post',
    action: 'created',
    title: 'New blog post',
    description: 'Community Service Initiative 2026 was published',
    userName: 'Editor',
    userEmail: 'editor@rotaractnyc.org',
    metadata: { postSlug: 'community-service-2026', published: true },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
  },
  {
    type: 'gallery',
    action: 'created',
    title: 'Photos uploaded',
    description: 'Holiday Event Gallery was added to the gallery',
    userName: 'Admin',
    userEmail: 'admin@rotaractnyc.org',
    metadata: { galleryId: 'sample-gallery-1', imageTitle: 'Holiday Event Gallery' },
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
  },
  {
    type: 'member',
    action: 'updated',
    title: 'Member updated',
    description: "Michael Chen's information was updated",
    userName: 'Admin',
    userEmail: 'admin@rotaractnyc.org',
    metadata: { memberId: 'sample-2', memberEmail: 'michael@example.com' },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
  },
  {
    type: 'event',
    action: 'updated',
    title: 'Event updated',
    description: 'Monthly Meeting is now published',
    userName: 'Admin',
    userEmail: 'admin@rotaractnyc.org',
    metadata: { eventId: 'sample-event-2', eventTitle: 'Monthly Meeting' },
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
  }
];

async function seedActivities() {
  console.log('🌱 Seeding sample activities...');
  
  try {
    const batch = db.batch();
    const activitiesRef = db.collection('activities');
    
    for (const activity of sampleActivities) {
      const docRef = activitiesRef.doc();
      batch.set(docRef, {
        ...activity,
        createdAt: admin.firestore.Timestamp.fromDate(activity.createdAt)
      });
    }
    
    await batch.commit();
    console.log(`✅ Successfully added ${sampleActivities.length} sample activities!`);
    console.log('📊 You can now view them in the admin dashboard.');
  } catch (error) {
    console.error('❌ Error seeding activities:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedActivities();
