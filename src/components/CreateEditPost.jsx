import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Row, Col } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';

export default function CreateEditPost() {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();

    const [hubs, setHubs] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        hub_id: '',
        content: '',
        completion_pct: 0,
        materialsStr: '',
        tagsStr: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch available craft hubs
        fetch('/api/hubs')
            .then(res => res.json())
            .then(data => {
                setHubs(data);
                if (data.length > 0 && !formData.hub_id) {
                    setFormData(prev => ({ ...prev, hub_id: data[0].id }));
                }
            })
            .catch(() => setError('Failed to load craft hubs'));

        // Fetch existing post data if in edit mode
        if (isEdit) {
            fetch(`/api/posts/${id}`)
                .then(res => res.json())
                .then(post => {
                    setFormData({
                        title: post.title,
                        hub_id: post.hub_id,
                        content: post.content,
                        completion_pct: post.completion_pct,
                        materialsStr: post.materials ? post.materials.join(', ') : '',
                        tagsStr: post.tags ? post.tags.join(', ') : ''
                    });
                })
                .catch(() => setError('Failed to load post details'));
        }
    }, [id, isEdit]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!formData.title.trim()) return setError('Title is required');
        if (!formData.content.trim()) return setError('Build log content is required');
        if (!formData.hub_id) return setError('Please select a Craft Hub');

        const materials = formData.materialsStr.split(',').map(m => m.trim()).filter(Boolean);
        const tags = formData.tagsStr.split(',').map(t => t.trim()).filter(Boolean);

        const payload = {
            title: formData.title,
            author_id: 1, // Default seed user
            hub_id: parseInt(formData.hub_id, 10),
            content: formData.content,
            completion_pct: parseInt(formData.completion_pct, 10),
            materials,
            tags
        };

        setLoading(true);
        try {
            const url = isEdit ? `/api/posts/${id}` : '/api/posts';
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save build log');

            navigate('/hubs');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="shadow-sm border-0">
            <Card.Header className="bg-primary text-white">
                <h3 className="mb-0">{isEdit ? 'Edit Build Log' : 'Create New Build Log'}</h3>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Project Title</Form.Label>
                        <Form.Control
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g., EVA Foam Gauntlets"
                            required
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Craft Hub Category</Form.Label>
                                <Form.Select
                                    name="hub_id"
                                    value={formData.hub_id}
                                    onChange={handleChange}
                                    required
                                >
                                    {hubs.map(hub => (
                                        <option key={hub.id} value={hub.id}>{hub.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Completion Percentage: {formData.completion_pct}%</Form.Label>
                                <Form.Range
                                    name="completion_pct"
                                    min="0"
                                    max="100"
                                    value={formData.completion_pct}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Build Log Details & Process Steps</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={5}
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            placeholder="Explain your construction process, tools used, and steps taken"
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Materials Used (comma-separated)</Form.Label>
                        <Form.Control
                            type="text"
                            name="materialsStr"
                            value={formData.materialsStr}
                            onChange={handleChange}
                            placeholder="e.g., 10mm High Density Foam, Barge Cement, Acrylic Paint"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Tags (comma-separated)</Form.Label>
                        <Form.Control
                            type="text"
                            name="tagsStr"
                            value={formData.tagsStr}
                            onChange={handleChange}
                            placeholder="e.g., Armor, Cosplay, Props"
                        />
                    </Form.Group>

                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : isEdit ? 'Update Build Log' : 'Publish Build Log'}
                    </Button>
                </Form>
            </Card.Body>
        </Card>
    );
}