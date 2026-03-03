
const fs = require('fs');
const content = fs.readFileSync('src/features/messages/screens/ChatsScreen.jsx', 'utf8');

const tags = [];
const pattern = /<(/?View|/?Pressable|/?Text)/g;
let match;
const stack = [];

while ((match = pattern.exec(content)) !== null) {
  const tag = match[1];
  if (tag.startsWith('/')) {
    const top = stack.pop();
    if (top !== tag.substring(1)) {
      console.log(`Mismatch: ${top} vs ${tag}`);
    }
  } else {
    stack.push(tag);
  }
}

if (stack.length > 0) {
  console.log(`Remaining on stack: ${stack.join(', ')}`);
} else {
  console.log('Balanced!');
}
