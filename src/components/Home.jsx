import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Button, Spinner } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export default function Home() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/posts')
            .then(res => res.json())
            .then(data => { setPosts(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;

    return (
        <div>
            <h2 className="mb-4">Recent Build Logs</h2>
            <Row xs={1} md={2} className="g-4">
                {posts.map(post => (
                    <Col key={post.id}>
                        <Card className="h-100 shadow-sm border-0">
                            <Card.Body className="d-flex flex-column">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <Badge bg="secondary">{post.hub_name}</Badge>
                                    <small className="text-muted">By {post.author_name}</small>
                                </div>
                                <Card.Title>{post.title}</Card.Title>
                                <Card.Text className="text-truncate flex-grow-1">{post.content}</Card.Text>

                                <div className="mt-3">
                                    <div className="d-flex justify-content-between small text-muted mb-1">
                                        <span>Progress</span>
                                        <span>{post.completion_pct}%</span>
                                    </div>
                                    <ProgressBar now={post.completion_pct} variant={post.completion_pct === 100 ? 'success' : 'primary'} />
                                </div>

                                <LinkContainer to={`/posts/${post.id}`} className="mt-3">
                                    <Button variant="outline-primary" size="sm">View Build Log</Button>
                                </LinkContainer>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>
        </div>
    );
}