import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Badge, ProgressBar, Button, Form, Alert, Spinner } from 'react-bootstrap';

export default function BuildLogDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/posts/${id}`).then(r => r.json()),
            fetch(`/api/posts/${id}/comments`).then(r => r.json())
        ])
            .then(([postData, commentData]) => {
                if (postData.error) throw new Error(postData.error);
                setPost(postData);
                setComments(commentData);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    const handlePostComment = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        fetch(`/api/posts/${id}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author_id: 1, // Will fall back gracefully on server if ID 1 isn't present
                content: newComment,
                parent_id: replyTo
            })
        })
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to post comment');
                return data;
            })
            .then(() => fetch(`/api/posts/${id}/comments`).then(r => r.json()))
            .then(refreshedComments => {
                setComments(refreshedComments);
                setNewComment('');
                setReplyTo(null);
            })
            .catch(err => alert(`Comment error: ${err.message}`));
    };

    const handleDeletePost = () => {
        if (window.confirm('Delete this build log?')) {
            fetch(`/api/posts/${id}`, { method: 'DELETE' })
                .then(() => navigate('/hubs'));
        }
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    // Organize nested comment tree
    const rootComments = comments.filter(c => !c.parent_id);
    const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);

    return (
        <div>
            <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <Badge bg="info">{post.hub_name}</Badge>
                        <div>
                            <Button variant="outline-warning" size="sm" className="me-2" onClick={() => navigate(`/edit/${post.id}`)}>Edit</Button>
                            <Button variant="outline-danger" size="sm" onClick={handleDeletePost}>Delete</Button>
                        </div>
                    </div>

                    <h2>{post.title}</h2>
                    <p className="text-muted">Logged by <strong>{post.author_name}</strong> on {new Date(post.created_at).toLocaleDateString()}</p>

                    <div className="my-3">
                        <label className="fw-bold mb-1">Completion Status ({post.completion_pct}%)</label>
                        <ProgressBar now={post.completion_pct} variant={post.completion_pct === 100 ? 'success' : 'primary'} style={{ height: '24px' }} animated />
                    </div>

                    <h5 className="mt-4">Build Process</h5>
                    <p style={{ whiteSpace: 'pre-line' }}>{post.content}</p>

                    <div className="mt-4">
                        <h6>Materials Used:</h6>
                        {post.materials?.map((m, i) => <Badge bg="secondary" key={i} className="me-1 mb-1">{m}</Badge>)}
                    </div>

                    <div className="mt-3">
                        <h6>Tags:</h6>
                        {post.tags?.map((t, i) => <Badge bg="dark" key={i} className="me-1 mb-1">#{t}</Badge>)}
                    </div>
                </Card.Body>
            </Card>

            {/* --- Nested Comments Section --- */}
            <h4 className="mb-3">Community Discussion ({comments.length})</h4>

            <Form onSubmit={handlePostComment} className="mb-4">
                <Form.Group className="mb-2">
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder={replyTo ? 'Writing a reply...' : 'Add a comment or ask a question about this build...'}
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                    />
                </Form.Group>
                <div className="d-flex justify-content-between">
                    {replyTo && <Button variant="link" size="sm" onClick={() => setReplyTo(null)}>Cancel Reply</Button>}
                    <Button variant="primary" size="sm" type="submit">Submit Comment</Button>
                </div>
            </Form>

            {rootComments.map(comment => (
                <Card key={comment.id} className="mb-2 border-0 bg-light">
                    <Card.Body className="py-2">
                        <strong>{comment.author_name}</strong>
                        <p className="mb-1">{comment.content}</p>
                        <Button variant="link" size="sm" className="p-0 text-muted" onClick={() => setReplyTo(comment.id)}>Reply</Button>

                        {/* Render nested level-1 replies */}
                        {getReplies(comment.id).map(reply => (
                            <div key={reply.id} className="ms-4 mt-2 pt-2 border-top">
                                <strong>{reply.author_name}</strong>
                                <p className="mb-0">{reply.content}</p>
                            </div>
                        ))}
                    </Card.Body>
                </Card>
            ))}
        </div>
    );
}