import fs from 'fs';
const code = fs.readFileSync('js/event-components.js', 'utf8');
const lines = code.split('\n');
console.log(lines.findIndex(l => l.includes('window.setVotingState')));
