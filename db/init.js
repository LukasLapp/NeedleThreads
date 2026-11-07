const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/needlethreads.db');

//Ensure that the data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, {recursive: true});
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDb() {
    db.exec('CREATE TABLE IF NOT EXISTS users (\n' +
        '      id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
        '      username TEXT UNIQUE NOT NULL,\n' +
        '      email TEXT UNIQUE NOT NULL,\n' +
        '      bio TEXT,\n' +
        '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS hubs (\n' +
        '      id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
        '      name TEXT UNIQUE NOT NULL,\n' +
        '      description TEXT\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS posts (\n' +
        '      id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
        '      title TEXT NOT NULL,\n' +
        '      author_id INTEGER NOT NULL,\n' +
        '      hub_id INTEGER NOT NULL,\n' +
        '      content TEXT NOT NULL,\n' +
        '      completion_pct INTEGER DEFAULT 0 CHECK(completion_pct BETWEEN 0 AND 100),\n' +
        '      upvotes INTEGER DEFAULT 0,\n' +
        '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n' +
        '      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n' +
        '      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,\n' +
        '      FOREIGN KEY (hub_id) REFERENCES hubs(id) ON DELETE CASCADE\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS materials (\n' +
        '      id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
        '      name TEXT UNIQUE NOT NULL\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS post_materials (\n' +
        '      post_id INTEGER NOT NULL,\n' +
        '      material_id INTEGER NOT NULL,\n' +
        '      PRIMARY KEY (post_id, material_id),\n' +
        '      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,\n' +
        '      FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS tags (\n' +
        '      id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
        '      name TEXT UNIQUE NOT NULL\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS post_tags (\n' +
        '      post_id INTEGER NOT NULL,\n' +
        '      tag_id INTEGER NOT NULL,\n' +
        '      PRIMARY KEY (post_id, tag_id),\n' +
        '      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,\n' +
        '      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE\n' +
        '    );\n' +
        '\n' +
        '    CREATE TABLE IF NOT EXISTS comments (\n' +
        '      id INTEGER PRIMARY KEY AUTOINCREMENT,\n' +
        '      post_id INTEGER NOT NULL,\n' +
        '      author_id INTEGER NOT NULL,\n' +
        '      parent_id INTEGER DEFAULT NULL,\n' +
        '      content TEXT NOT NULL,\n' +
        '      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n' +
        '      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,\n' +
        '      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE\n' +
        '      FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE\n' +
        '    );');

    // Ensure parent_id column exists if updating an existing database file
    const commentCols = db.prepare("PRAGMA table_info(comments)").all();
    if (!commentCols.some(col => col.name === 'parent_id')) {
        db.exec("ALTER TABLE comments ADD COLUMN parent_id INTEGER DEFAULT NULL;");
    }

    // Seed default user if empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        db.prepare(`
            INSERT INTO users (id, username, email, bio) 
            VALUES (1, 'MakerOne', 'maker@needlethreads.io', 'Default crafter portfolio')
        `).run();
    }

    // Seed default craft hubs if empty
    const count = db.prepare('SELECT COUNT(*) as count FROM hubs').get();
    if (count.count === 0) {
        const insertHub = db.prepare('INSERT INTO hubs (name, description) VALUES (?, ?)');
        insertHub.run('Cosplay', 'Costume creation, EVA foam armor, and wig styling');
        insertHub.run('Sewing', 'Garment construction, tailoring, and embroidery');
        insertHub.run('3D Printing', 'FDM/Resin props, slicing, and post-processing');
    }

    console.log(`Database initialized at ${dbPath}`);
    return db;
}

if(require.main === module) {
    initDb();
}

module.exports = {db, initDb};