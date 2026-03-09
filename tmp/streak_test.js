import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env
dotenv.config({path: path.join(__dirname, '../server/.env')});

// Mocking required modules for StreakService
import Streak from '../server/src/modules/streak/streak.model.js';
import streakService from '../server/src/modules/streak/streak.service.js';

async function runTests() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pryvo';
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB');

  const userA = 'test_user_a';
  const userB = 'test_user_b';
  const userPairId = streakService.getUserPairId(userA, userB);

  // 1. Cleanup
  await Streak.deleteMany({userPairId});
  console.log('Cleaned up previous test data');

  // 2. Test initial activity (One-sided)
  console.log('\n--- Scenario 1: Initial Activity (One-sided) ---');
  await streakService.handleEngagement(userA, userB, 'message');
  let streak = await streakService.getPairStreak(userA, userB);
  console.log(`Streak count (should be 0): ${streak.streakCount}`);
  console.log(`User A Activity: ${streak.userALastActivity}`);
  console.log(`User B Activity: ${streak.userBLastActivity}`);

  // 3. Test Mutual activity (Day 1)
  console.log('\n--- Scenario 2: Mutual Activity (Day 1) ---');
  await streakService.handleEngagement(userB, userA, 'message');
  streak = await streakService.getPairStreak(userA, userB);
  console.log(`Streak count (should be 1): ${streak.streakCount}`);
  console.log(`User A Activity (should be null): ${streak.userALastActivity}`);
  console.log(`User B Activity (should be null): ${streak.userBLastActivity}`);

  // 4. Test One-sided repeat (Should NOT increment)
  console.log('\n--- Scenario 3: Repeat One-sided (Should NOT increment) ---');
  await streakService.handleEngagement(userA, userB, 'message');
  streak = await streakService.getPairStreak(userA, userB);
  console.log(`Streak count (should still be 1): ${streak.streakCount}`);

  // 5. Test Expiration (Manual simulate)
  console.log('\n--- Scenario 4: Expiration (Logical check) ---');
  streak = await Streak.findOne({userPairId});
  streak.lastActivityDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
  await streak.save();

  const logicalStreak = await streakService.getPairStreak(userA, userB);
  console.log(
    `Logical Streak count (should be 0 because of age): ${logicalStreak.streakCount}`,
  );

  // 6. Test Interaction after reset
  console.log('\n--- Scenario 5: Interaction after 24h reset ---');
  await streakService.handleEngagement(userA, userB, 'message');
  streak = await streakService.getPairStreak(userA, userB);
  console.log(
    `Streak count (should be 0, new cycle started): ${streak.streakCount}`,
  );
  console.log(`User A Activity (should be set): ${streak.userALastActivity}`);

  console.log('\nTests completed.');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
