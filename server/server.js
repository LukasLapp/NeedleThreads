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

// Helper Function for material and tag insertions
function syncMaterialsAndTags(postId, materials = [], tags = []) {
    // Sync Materials
    db.prepare('DELETE FROM post_materials WHERE post_id = ?').run(postId);
    const insertMat = db.prepare('INSERT OR IGNORE INTO materials (name) VALUES (?)');
    const getMat = db.prepare('SELECT id FROM materials WHERE name = ?');
    const linkMat = db.prepare('INSERT INTO post_materials (post_id, material_id) VALUES (?, ?)');

    for (const matName of materials) {
        const cleanName = matName.trim();
        if (cleanName) {
            insertMat.run(cleanName);
            const mat = getMat.get(cleanName);
            linkMat.run(postId, mat.id);
        }
    }

    // Sync Tags
    db.prepare('DELETE FROM post_tags WHERE post_id = ?').run(postId);
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
    const linkTag = db.prepare('INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)');

    for (const tagName of tags) {
        const cleanTag = tagName.trim();
        if (cleanTag) {
            insertTag.run(cleanTag);
            const tag = getTag.get(cleanTag);
            linkTag.run(postId, tag.id);
        }
    }
}

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
    const { title, author_id, hub_id, content, completion_pct, materials, tags } = req.body;

    if (!title || !title.trim() || !author_id || !hub_id || !content || !content.trim()) {
        return res.status(400).json({ error: 'Missing required fields: title, author_id, hub_id, content' });
    }

    const pct = parseInt(completion_pct, 10) || 0;
    if (pct < 0 || pct > 100) {
        return res.status(400).json({ error: 'Completion percentage must be between 0 and 100' });
    }

    const createPost = db.transaction(() => {
        const stmt = db.prepare('INSERT INTO posts (title, author_id, hub_id, content, completion_pct) \n' +
            'VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(title.trim(), author_id, hub_id, content.trim(), pct);
        const postId = info.lastInsertRowid;

        syncMaterialsAndTags(postId, materials, tags);
        return postId;
    });

    try {
        const postId = createPost();
        res.status(201).json({ id: postId, message: 'Build log successfully created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/posts/:id
app.put('/api/posts/:id', (req, res) => {
    const postId = req.params.id;
    const { title, hub_id, content, completion_pct, materials, tags } = req.body;

    const existingPost = db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
    }

    if (!title || !title.trim() || !hub_id || !content || !content.trim()) {
        return res.status(400).json({ error: 'Missing required fields: title, hub_id, content' });
    }

    const pct = parseInt(completion_pct, 10) || 0;
    if (pct < 0 || pct > 100) {
        return res.status(400).json({ error: 'Completion percentage must be between 0 and 100' });
    }

    const updatePost = db.transaction(() => {
        db.prepare('UPDATE posts\n' +
            'SET title = ?, hub_id = ?, content = ?, completion_pct = ?, updated_at = CURRENT_TIMESTAMP\n' +
            'WHERE id = ?').run(title.trim(), hub_id, content.trim(), pct, postId);

        syncMaterialsAndTags(postId, materials, tags);
    });

    try {
        updatePost();
        res.status(200).json({ id: postId, message: 'Build log successfully updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/posts/:id
app.delete('/api/posts/:id', (req, res) => {
    try {
        const info = db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
        if (info.changes === 0) return res.status(404).json({ error: 'Post not found' });
        res.status(200).json({ message: 'Post successfully deleted' });
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
        console.log(`NeedleThreads running on port ${PORT}`);
    });
}

module.exports = app;