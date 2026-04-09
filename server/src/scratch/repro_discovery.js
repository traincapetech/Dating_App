import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({path: path.join(__dirname, '../../.env')});

const MONGO_URI = process.env.MONGO_URI;

// Mock gender maps from matchingService.js
const genderMap = {
  Man: 'Men',
  Woman: 'Women',
  'Non Binary': 'Nonbinary People',
};
const reverseGenderMap = {
  Men: 'Man',
  Women: 'Woman',
  'Nonbinary People': 'Non Binary',
};

async function getMatchedProfilesMock(db, userId) {
  const currentUserProfile = await db.collection('profiles').findOne({userId});
  if (!currentUserProfile) return [];

  const viewerCoords = currentUserProfile.location?.coordinates;
  const hasViewerLocation =
    viewerCoords && 
    Array.isArray(viewerCoords) && 
    viewerCoords.length === 2 && 
    !(viewerCoords[0] === 0 && viewerCoords[1] === 0);

  if (!hasViewerLocation) return [];

  const radiusInMeters = 50 * 1000; // Default 50km from HomeScreen

  const pipeline = [
    {
      $geoNear: {
        near: currentUserProfile.location,
        distanceField: 'dist.calculated',
        maxDistance: radiusInMeters,
        distanceMultiplier: 0.001,
        spherical: true,
        query: {
          userId: {$ne: userId},
          isPaused: {$ne: true},
          isHidden: {$ne: true},
          'location.coordinates': {$exists: true, $ne: [0, 0]},
        },
      },
    }
  ];

  const userGender = currentUserProfile.basicInfo?.gender;
  const userWhoToDate = currentUserProfile.datingPreferences?.whoToDate || ['Everyone'];
  const genderQueries = [];

  if (!userWhoToDate.includes('Everyone')) {
    const preferredGenders = userWhoToDate.map(g => reverseGenderMap[g] || g);
    genderQueries.push({'basicInfo.gender': {$in: preferredGenders}});
  }

  const myGenderMapped = genderMap[userGender];
  if (myGenderMapped) {
    genderQueries.push({
      $or: [
        {'datingPreferences.whoToDate': 'Everyone'},
        {'datingPreferences.whoToDate': myGenderMapped},
      ],
    });
  }

  if (genderQueries.length > 0) {
    pipeline.push({$match: {$and: genderQueries}});
  }

  return await db.collection('profiles').aggregate(pipeline).toArray();
}

mongoose.connect(MONGO_URI).then(async () => {
  const db = mongoose.connection.db;
  const profiles = await db.collection('profiles').find({}).toArray();

  for (const p of profiles) {
    const matches = await getMatchedProfilesMock(db, p.userId);
    const photoMatches = matches.filter(m => m.media?.media?.some(item => item.url));
    if (matches.length > 0) {
        console.log(`User: ${p.basicInfo?.firstName || 'Unknown'} (${p.userId}) | Matches: ${matches.length} | With Photos: ${photoMatches.length}`);
        if (matches.length === 1 || photoMatches.length === 1) {
            console.log(`  -> ONLY 1 MATCH! Match name: ${matches[0].basicInfo?.firstName}`);
        }
    }
  }

  await mongoose.disconnect();
});
