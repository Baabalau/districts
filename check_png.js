const fs = require('fs');
const buffer = fs.readFileSync('assets/link.png');
// Very basic check of the first few bytes to see if we can guess anything, or use a tool.
// Actually, let's just base64 encode a tiny version or use an existing tool.
