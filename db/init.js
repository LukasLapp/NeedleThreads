const fs = require('fs');

// Creates a dummy database file on first run
fs.writeFileSync('needlethreads.db', '');
console.log('Database initialized successfully.');