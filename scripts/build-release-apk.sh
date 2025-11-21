#!/bin/bash

# Script to build release APK with proper JavaScript bundle

set -e

echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean

echo "📦 Building JavaScript bundle..."
cd ..
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

echo "🔨 Building release APK..."
cd android
./gradlew assembleRelease

echo "✅ Build complete! APK location:"
echo "   android/app/build/outputs/apk/release/app-release.apk"

