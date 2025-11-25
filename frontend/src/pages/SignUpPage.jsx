import React, { useState } from "react";
import supabase from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import { UserSignUp } from "../lib/api";

function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const data = await UserSignUp(email, password);
      setMessage("Registration successful! Please check your email to verify your account.");
    } catch (error) {
      setMessage("Registration failed: " + (error.response?.data?.message || error.message));
    }

    setEmail("");
    setPassword("");
  };

  return (
    <div>
      <h2>Register</h2>
      <br></br>
      {message && <span>{message}</span>}
      <form onSubmit={handleSubmit}>
        <input
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          type="email"
          placeholder="Email"
          required
        />
        <input
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          type="password"
          placeholder="Password"
          required
        />
        <button type="submit">Create Account</button>
      </form>
      <span>Already have an account?</span>
      <Link to="/login">Log in.</Link>
    </div>
  );
}

export default SignUpPage;