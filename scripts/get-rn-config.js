#!/usr/bin/env node

const config = require('../react-native.config.js');

const output = {
  project: {
    android: {
      packageName: config.project.android.packageName,
    },
  },
};

console.log(JSON.stringify(output, null, 2));





















