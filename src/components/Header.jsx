import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';

export default function Header() {
    return (
        <Navbar bg="dark" variant="dark" expand="lg" sticky="top">
            <Container>
                <LinkContainer to="/">
                    <Navbar.Brand className="fw-bold fs-4">NeedleThreads</Navbar.Brand>
                </LinkContainer>
                <Navbar.Toggle aria-controls="navbar-nav" />
                <Navbar.Collapse id="navbar-nav">
                    <Nav className="me-auto">
                        <LinkContainer to="/">
                            <Nav.Link>Home</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/hubs">
                            <Nav.Link>Craft Hubs</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/search">
                            <Nav.Link>Search</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/create">
                            <Nav.Link>New Build Log</Nav.Link>
                        </LinkContainer>
                    </Nav>
                    <Nav>
                        <LinkContainer to="/profile">
                            <Nav.Link>Profile</Nav.Link>
                        </LinkContainer>
                        <LinkContainer to="/settings">
                            <Nav.Link>Settings</Nav.Link>
                        </LinkContainer>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}