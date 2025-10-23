import {
  Route,
  Routes,
} from 'react-router-dom';

import LoginPage from './pages/LoginPage.jsx';
import HomePage from './pages/HomePage.jsx';
import Navbar from './components/Navbar.jsx';
import logo from './assets/react.svg';


import { RedirectToSignIn, SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import React from "react";

function App() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return (

      <div>
        {/* <Navbar
          logo={logo}
          logoAlt="Company Logo"
          items={[
            { label: 'Home', href: '/home' },
            { label: 'Login', href: '/' },
            { label: 'Services', href: '/services' },
            { label: 'Contact', href: '/contact' }
          ]}
          activeHref="/"
          className="custom-nav"
          ease="power2.easeOut"
          baseColor="#000000"
          pillColor="#ffffff"
          hoveredPillTextColor="#ffffff"
          pillTextColor="#000000"
        /> */}

        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={<HomePage />} />
        </Routes>

      </div>
  );
  }

  return (
    <div>

      {/* <Navbar
        logo={logo}
        logoAlt="Company Logo"
        items={[
          { label: 'Home', href: '/' },
          { label: 'Login', href: '/login' },
          { label: 'Services', href: '/services' },
          { label: 'Contact', href: '/contact' }
        ]}
        activeHref="/"
        className="custom-nav"
        ease="power2.easeOut"
        baseColor="#000000"
        pillColor="#ffffff"
        hoveredPillTextColor="#ffffff"
        pillTextColor="#000000"
      /> */}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>

      </div>
  );
}

export default App;