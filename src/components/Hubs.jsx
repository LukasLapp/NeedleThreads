import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Button, Nav, Spinner, Alert } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export default function Hubs() {
    const [hubs, setHubs] = useState([]);
    const [posts, setPosts] = useState([]);
    const [selectedHubId, setSelectedHubId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch all craft hubs on initial mount
    useEffect(() => {
        fetch('/api/hubs')
            .then(res => res.json())
            .then(data => setHubs(data))
            .catch(() => setError('Failed to load craft hubs'));
    }, []);

    // Fetch posts whenever the selected hub filter changes
    useEffect(() => {
        setLoading(true);
        const url = selectedHubId === 'all'
            ? '/api/posts'
            : `/api/posts?hub_id=${selectedHubId}`;

        fetch(url)
            .then(res => res.json())
            .then(data => {
                setPosts(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Failed to load posts for this hub');
                setLoading(false);
            });
    }, [selectedHubId]);

    return (
        <div>
            <div className="mb-4">
                <h2>Craft Hubs</h2>
                <p className="text-muted">Explore build logs categorized by craft medium and techniques.</p>

                {/* Hub Filter Pills */}
                <Nav variant="pills" activeKey={selectedHubId} onSelect={(k) => setSelectedHubId(k)} className="mb-4">
                    <Nav.Item>
                        <Nav.Link eventKey="all">All Hubs</Nav.Link>
                    </Nav.Item>
                    {hubs.map(hub => (
                        <Nav.Item key={hub.id}>
                            <Nav.Link eventKey={String(hub.id)}>{hub.name}</Nav.Link>
                        </Nav.Item>
                    ))}
                </Nav>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {loading ? (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                </div>
            ) : posts.length === 0 ? (
                <Alert variant="info" className="text-center">
                    No build logs found for this craft hub yet. Be the first to create one!
                </Alert>
            ) : (
                <Row xs={1} md={2} lg={3} className="g-4">
                    {posts.map(post => (
                        <Col key={post.id}>
                            <Card className="h-100 shadow-sm border-0">
                                <Card.Body className="d-flex flex-column">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <Badge bg="secondary">{post.hub_name}</Badge>
                                        <small className="text-muted">By {post.author_name}</small>
                                    </div>

                                    <Card.Title className="fs-5 fw-bold">{post.title}</Card.Title>

                                    <Card.Text className="text-secondary text-truncate flex-grow-1">
                                        {post.content}
                                    </Card.Text>

                                    <div className="mt-3">
                                        <div className="d-flex justify-content-between small text-muted mb-1">
                                            <span>Completion</span>
                                            <span>{post.completion_pct}%</span>
                                        </div>
                                        <ProgressBar
                                            now={post.completion_pct}
                                            variant={post.completion_pct === 100 ? 'success' : 'primary'}
                                        />
                                    </div>

                                    <LinkContainer to={`/posts/${post.id}`} className="mt-3">
                                        <Button variant="outline-primary" size="sm" className="w-100">
                                            View Build Log
                                        </Button>
                                    </LinkContainer>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}