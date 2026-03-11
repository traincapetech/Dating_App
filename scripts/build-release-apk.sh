#!/bin/bash

# Script to build a release APK with JavaScript bundle included

set -e

echo "🧹 Cleaning previous builds..."
cd android
./gradlew clean
cd ..

echo "📦 Generating JavaScript bundle..."
mkdir -p android/app/src/main/assets
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

echo "🔨 Building release APK..."
cd android
./gradlew assembleRelease
cd ..

echo "✅ APK built successfully!"
echo "📱 APK location: android/app/build/outputs/apk/release/app-release.apk"

