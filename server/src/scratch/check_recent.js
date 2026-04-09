import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({path: path.join(__dirname, '../../.env')});

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI).then(async () => {
    const db = mongoose.connection.db;
    const profiles = await db.collection('profiles').find({}).sort({updatedAt: -1}).limit(5).toArray();
    const users = await db.collection('users').find({}).toArray();

    console.log('--- RECENTLY UPDATED PROFILES ---');
    for (const p of profiles) {
        const u = users.find(user => user._id.toString() === p.userId.toString());
        console.log(`User: ${p.basicInfo?.firstName || u?.fullName} (${p.userId})`);
        console.log(`  - UpdatedAt: ${p.updatedAt}`);
        console.log(`  - Location: ${JSON.stringify(p.location?.coordinates)}`);
        console.log(`  - WhoToDate: ${p.datingPreferences?.whoToDate}`);
        console.log(`  - Gender: ${p.basicInfo?.gender}`);
        console.log('---------------------------');
    }
    await mongoose.disconnect();
});
