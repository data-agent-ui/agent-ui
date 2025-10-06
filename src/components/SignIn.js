import React, { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import "./SignIn.css";
import userService from '../services/userService.js';
import { useAuth } from "../context/AuthContext.js";

function SignIn({ onLoginSuccess }) {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { signIn, authFetch } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await userService.userSignIn({ userId, password });
            // Update AuthContext state
            signIn({ token: response.token, user: response.user });

            navigate('/dashboard');
        } catch (error) {
            alert(`Sign-in failed: ${error.message}`);
        }
    };

    return (
        <div className="signIn-container">
            <div className="signIn-card">
                <div className="signIn-head">
                    <h2 className="signIn-title">Sign in to AI-CRM</h2>
                    <p className="signIn-subtitle">Access chat and payment analysis</p>
                </div>
                <form onSubmit={handleSubmit} className="signIn-form">
                    <div className="form-group icon-input">
                        <FaUser className="input-icon" />
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            placeholder="User ID"
                            required
                        />
                    </div>

                    <div className="form-group icon-input">
                        <FaLock className="input-icon" />
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                        />
                        <span
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <FaEye /> : <FaEyeSlash />}
                        </span>
                    </div>

                    <button type="submit" className="signIn-button gradient-button">
                        Sign In
                    </button>
                </form>
            </div>
        </div>
    );
}

export default SignIn;
