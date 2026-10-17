const express = require('express');
const path = require('path');
const {db, initDb} = require('../db/init');

const app = express();
const PORT = process.env.PORT || 3000;

initDb();

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// --Health Check--
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --Hub API Endpoints--
app.get('/api/hubs', (req, res) => {
    try {
        const hubs = db.prepare('SELECT * FROM hubs ORDER BY name ASC').all();
        res.json(hubs);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// --API Endpoints--
// GET /api/posts
app.get('/api/posts', (req, res) => {
    try {
        const posts = db.prepare('SELECT post.*, user.username as author_name, hub.name as hub_name \n' +
            '      FROM posts post\n' +
            '      JOIN users user ON post.author_id = user.id\n' +
            '      JOIN hubs hub ON post.hub_id = hub.id\n' +
            '      ORDER BY post.created_at DESC').all();
        res.json(posts);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// GET /api/posts/:id - Single item
app.get('/api/posts/:id', (req, res) => {
    try {
        const post = db.prepare('SELECT post.*, user.username as author_name, hub.name as hub_name \n' +
            '      FROM posts post\n' +
            '      JOIN users user ON post.author_id = user.id\n' +
            '      JOIN hubs hub ON post.hub_id = hub.id\n' +
            '      WHERE post.id = ?').get(req.params.id);
        if (!post) return res.status(404).json({error: 'Post not found'});

        //Fetch materials and tags
        const materials = db.prepare('SELECT m.name FROM materials m\n' +
            '      JOIN post_materials pm ON m.id = pm.material_id\n' +
            '      WHERE pm.post_id = ?').all(req.params.id).map(m=> m.name);

        const tags = db.prepare('SELECT t.name FROM tags t\n' +
            '      JOIN post_tags pt ON t.id = pt.tag_id\n' +
            '      WHERE pt.post_id = ?').all(req.params.id).map(t => t.name);

        res.json({...post, materials, tags});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

// POST /api/posts
app.post('/api/posts', (req, res) => {
    const {title, author_id, hub_id, content, completion_pct, materials = [], tags = []} = req.body;

    if (!title || !author_id || !hub_id || !content) {
        return res.status(400).json({ error: 'Missing required fields: title, author_id, hub_id, content' });
    }

    const createPost = db.transaction(() => {
        const stmt = db.prepare('INSERT INTO posts (title, author_id, hub_id, content, completion_pct) \n' +
            '      VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(title, author_id, hub_id, content, completion_pct || 0);
        const postId = info.lastInsertRowid;

        // Attach materials
        const insertMat = db.prepare('INSERT OR IGNORE INTO materials (name) VALUES (?)');
        const getMat = db.prepare('SELECT id FROM materials WHERE name = ?');
        const linkMat = db.prepare('INSERT INTO post_materials (post_id, material_id) VALUES (?, ?)');

        for (const matName of materials) {
            insertMat.run(matName.trim());
            const mat = getMat.get(matName.trim());
            linkMat.run(postId, mat.id);
        }

        // Attach tags
        const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
        const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
        const linkTag = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)');

        for (const tagName of tags) {
            insertTag.run(tagName.trim());
            const tag = getTag.get(tagName.trim());
            linkTag.run(postId, tag.id);
        }

        return postId;
    });

    try {
        const postId = createPost();
        res.status(201).json({ id: postId, message: 'Build log created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', (req, res) => {
    try {
        const info = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'Post not found' });
        res.status(200).json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --Fallback catch-all for SPA routes--
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

if (require.main === module){
    app.listen(PORT, () => {
        console.log('NeedleThreads running on port ${PORT}');
    });
}

module.exports = app;