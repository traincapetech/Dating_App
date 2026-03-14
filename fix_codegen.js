const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(
  '/Users/a/Desktop/Pryvo/node_modules/react-native-screens/src',
  function (filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let original = content;

      // Replace the import
      content = content.replace(
        /CodegenTypes\s*as\s*CT/g,
        'WithDefault, Int32, Float, Double, DirectEventHandler, BubblingEventHandler',
      );
      // Replace usages
      content = content.replace(/CT\./g, '');

      if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed:', filePath);
      }
    }
  },
);
