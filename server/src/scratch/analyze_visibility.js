import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({path: path.join(__dirname, '../../.env')});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dating_app';

mongoose
  .connect(MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;

    const users = await db.collection('users').find({}).toArray();
    const profiles = await db.collection('profiles').find({}).toArray();

    console.log(`Total Users: ${users.length}`);
    console.log(`Total Profiles: ${profiles.length}`);

    console.log('\n--- Analysis of Profiles ---');
    for (const p of profiles) {
      const u = users.find(user => user._id.toString() === p.userId.toString());
      const name = p.basicInfo?.firstName || u?.fullName || 'Unknown';
      const hasPhotos = p.media?.media?.some(m => m.url) || false;
      const coords = p.location?.coordinates;
      const hasValidCoords = coords && Array.isArray(coords) && coords.length === 2 && !(coords[0] === 0 && coords[1] === 0);
      const gender = p.basicInfo?.gender;
      const whoToDate = p.datingPreferences?.whoToDate || [];
      const isPaused = p.isPaused || false;
      const isHidden = p.isHidden || false;

      console.log(`User: ${name} (${p.userId})`);
      console.log(`  - Gender: ${gender}`);
      console.log(`  - WhoToDate: ${whoToDate}`);
      console.log(`  - Has Photos: ${hasPhotos}`);
      console.log(`  - Valid Coords: ${hasValidCoords} ${JSON.stringify(coords)}`);
      console.log(`  - Status: ${isPaused ? 'PAUSED' : 'Active'}, ${isHidden ? 'HIDDEN' : 'Visible'}`);
      console.log('---------------------------');
    }

    await mongoose.disconnect();
  })
  .catch(e => console.error(e));
