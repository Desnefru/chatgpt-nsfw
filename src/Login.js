import React, { useState } from "react";

function Login({ onLogin, onShowRegister }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const backendUrl = "http://localhost:4000";

    const handleLogin = async () => {
        try {
            const resp = await fetch(`${backendUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!resp.ok) throw new Error("Login fehlgeschlagen");

            const data = await resp.json();
            localStorage.setItem("jwt", data.token);
            localStorage.setItem("username", data.username);
            onLogin(data.token, data.username);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container">
                <h2 className="login-header">Login</h2>

                <div style={{ marginBottom: "16px" }}>
                    <label htmlFor="email" className="login-label">
                        E-Mail
                    </label>
                    <input
                        id="email"
                        className="login-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-Mail"
                    />
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <label htmlFor="password" className="login-label">
                        Passwort
                    </label>
                    <input
                        id="password"
                        type="password"
                        className="login-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Passwort"
                    />
                </div>

                <button style={{ marginBottom: "16px" }} className="login-button" onClick={handleLogin}>
                    Login
                </button>

                <button className="register-button" onClick={onShowRegister}>
                    Neu registrieren
                </button>
            </div>
        </div>
    );
}

export default Login;