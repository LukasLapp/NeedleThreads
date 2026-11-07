import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import Hubs from './components/Hubs';
import CreateEditPost from "./components/CreateEditPost";
import BuildLogDetail from "./components/BuildLogDetail";

// Placeholder route views
const Search = () => <div className="py-5"><h2>Conditional Search</h2><p>Filter build logs by material and tags.</p></div>;
const Profile = () => <div className="py-5"><h2>User Profile</h2><p>Crafter portfolio and created build logs.</p></div>;
const Settings = () => <div className="py-5"><h2>Settings</h2><p>Manage profile options and preferences.</p></div>;

export default function App() {
    return (
        <div className="d-flex flex-column min-vh-100">
            <Header />
            <Container className="flex-grow-1 my-4">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/hubs" element={<Hubs />} />
                    <Route path="/posts/:id" element={<BuildLogDetail />} />
                    <Route path="/create" element={<CreateEditPost />} />
                    <Route path="/edit/:id" element={<CreateEditPost />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </Container>
            <Footer />
        </div>
    );
}