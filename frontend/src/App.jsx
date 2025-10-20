import { SignIn, SignInButton } from '@clerk/clerk-react';
import React from 'react';


import HomePage from "./pages/HomePage.jsx";
import SignUpPage from './pages/SignUpPage.jsx';
import LoginPage from "./pages/LoginPage.jsx";

function App() {
  return (
  <div>

    <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to ="/login" />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to ="/" />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to ="/" />} />
      </Routes>

  </div>
)
};

export default App;