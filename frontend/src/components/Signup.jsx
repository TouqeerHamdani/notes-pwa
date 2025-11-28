import React, { useState } from "react";
import supabase from "../lib/supabaseClient";
import { Navigate, useNavigate } from "react-router-dom";

function Signup() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleOAuth = async (e) => {
    e.preventDefault();
    const { token, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: '/',
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error.message);
    }
    if (token) {
      console.log(token);
    }
  };

  const handleOnSubmit = async (evt) => {
    evt.preventDefault();

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error("Error signing up:", error.message);
    } else {
      console.log("Sign up successful! Please check your email to confirm your account.");
    }
    
    setEmail("");
    setPassword("");
    navigate("/");
  };

  return (
    <div className="form-container sign-up-container">
      <form onSubmit={handleOnSubmit}>
        <h1>Create Account</h1>
        <div className="social-container">
          <a href="#" className="social" onClick={handleOAuth}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
                <path
                    d="M564 325.8C564 467.3 467.1 568 324 568C186.8 568 76 457.2 76 320C76 182.8 186.8 72 324 72C390.8 72 447 96.5 490.3 136.9L422.8 201.8C334.5 116.6 170.3 180.6 170.3 320C170.3 406.5 239.4 476.6 324 476.6C422.2 476.6 459 406.2 464.8 369.7L324 369.7L324 284.4L560.1 284.4C562.4 297.1 564 309.3 564 325.8z" />
            </svg>
          </a>
        </div>
        <span>or use your email for registration</span>
        <input
          type="email"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          type="password"
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
        />
        <button>Sign Up</button>
      </form>
    </div>
  );
}

export default Signup;
