import React, { useState } from "react";

function Login({ onLogin }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const backendUrl = "http://localhost:4000";

    const handleLogin = async () => {
        try {
            const resp = await fetch(`${backendUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            if (!resp.ok) throw new Error("Login fehlgeschlagen");

            const data = await resp.json();
            const token = data.token;
            localStorage.setItem("jwt", token);
            localStorage.setItem("username", data.username);
            onLogin(token, username);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="login-wrapper">
            <div className="login-container">
                <h2 className="login-header">Login</h2>

                <div style={{ marginBottom: "16px" }}>
                    <label htmlFor="username" className="login-label">
                        Benutzername
                    </label>
                    <input
                        id="username"
                        className="login-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Benutzername"
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

                <button className="login-button" onClick={handleLogin}>
                    Login
                </button>
            </div>
        </div>
    );
}

export default Login;