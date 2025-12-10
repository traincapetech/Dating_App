#!/usr/bin/env node

const path = require('path');
const config = require(path.join(process.cwd(), 'react-native.config.js'));

console.log(JSON.stringify(config, null, 2));
