import React, { useState } from "react";

function Register({ onRegister }) {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const backendUrl = "http://localhost:4000";

    const handleRegister = async () => {
        if (password !== confirmPassword) {
            alert("Passwörter stimmen nicht überein");
            return;
        }

        try {
            const resp = await fetch(`${backendUrl}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, username, password }),
            });

            if (!resp.ok) {
                const errorData = await resp.json();
                throw new Error(errorData.message || "Registrierung fehlgeschlagen");
            }

            alert("Registrierung erfolgreich! Du kannst dich jetzt einloggen.");
            onRegister();  // z.B. um zur Login-Seite zu wechseln
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCancel = () => {
        setEmail("");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        onRegister();  // z.B. um zur Login-Seite zu wechseln
    }

    return (
        <div className="register-wrapper">
            <div className="register-container">
                <h2 className="register-header">Registrieren</h2>

                <div style={{ marginBottom: "16px" }}>
                    <label htmlFor="E-Mail" className="register-label">E-Mail</label>
                    <input
                        id="email"
                        className="register-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-Mail"
                    />
                </div>

                <div style={{ marginBottom: "16px" }}>
                    <label htmlFor="username" className="register-label">Benutzername</label>
                    <input
                        id="username"
                        className="register-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Benutzername"
                    />
                </div>

                <div style={{ marginBottom: "16px" }}>
                    <label htmlFor="password" className="register-label">Passwort</label>
                    <input
                        id="password"
                        type="password"
                        className="register-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Passwort"
                    />
                </div>

                <div style={{ marginBottom: "24px" }}>
                    <label htmlFor="confirmPassword" className="register-label">Passwort bestätigen</label>
                    <input
                        id="confirmPassword"
                        type="password"
                        className="register-input"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Passwort bestätigen"
                    />
                </div>

                <button style={{ marginBottom: "16px" }} className="register-button" onClick={handleRegister}>
                    Registrieren
                </button>

                <button className="abbrechen-button" onClick={handleCancel}>
                    Abbrechen
                </button>
            </div>
        </div>
    );
}

export default Register;
