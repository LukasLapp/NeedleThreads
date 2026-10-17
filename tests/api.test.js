const request = require('supertest');
const {db} = require('../db/init');
const app = require('../server/server');

describe('NeedleThreads Checkpoint 1 API & DB Integration Tests', () => {
    let userId, hubId, postId;

    beforeAll(() => {
        // Create dummy user and hub for foreign keys
        const userStmt = db.prepare('INSERT OR IGNORE INTO users (username, email, bio) VALUES (?, ?, ?)');
        userStmt.run('LukasMaker', 'lukas@needlethreads.io', 'Cosplay enthusiast');

        const user = db.prepare('SELECT id FROM users WHERE email = ?').get('lukas@needlethreads.io');
        userId = user.id;

        const hub = db.prepare('SELECT id FROM hubs LIMIT 1').get();
        hubId = hub ? hub.id : 1;
    });

    it('GET /api/health should respond with status ok', async () => {
        const res = await request(app).get('/api/health');
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
    });

    it('POST /api/posts should insert post and link normalized materials/tags', async () => {
        const postPayload = {
            title: 'EVA Foam Helmet Build',
            author_id: userId,
            hub_id: hubId,
            content: 'Cut 10mm high density foam templates and heat-shaped with heat gun.',
            completion_pct: 45,
            materials: ['EVA Foam', 'Barge Cement'],
            tags: ['Armor', 'Props']
        };

        const res = await request(app).post('/api/posts').send(postPayload);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('id');
        postId = res.body.id;
    });

    it('GET /api/posts/:id should retrieve post with normalized materials and tags', async () => {
        const res = await request(app).get(`/api/posts/${postId}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.title).toBe('EVA Foam Helmet Build');
        expect(res.body.materials).toContain('EVA Foam');
        expect(res.body.tags).toContain('Armor');
    });

    it('DELETE /api/posts/:id should remove the post', async () => {
        const res = await request(app).delete(`/api/posts/${postId}`);
        expect(res.statusCode).toBe(200);

        const checkRes = await request(app).get(`/api/posts/${postId}`);
        expect(checkRes.statusCode).toBe(404);
    });
});