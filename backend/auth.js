// auth.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getUserByUsername, createUser, getUserByEmail } from "./couchRepository.js";

// Login-Route
export const loginRoute = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "E-Mail und Passwort erforderlich" });

    const user = await getUserByEmail(email);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });

    res.json({ token, username: user.username });
};

// Middleware zum Schutz von Routen
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // enthält userId & username
        next();
    } catch (err) {
        res.status(403).json({ error: "Token ungültig oder abgelaufen" });
    }
};

// Registrierung neuer Nutzer
export const registerRoute = async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password)
        return res.status(400).json({ error: "E-Mail, Benutzername und Passwort erforderlich" });

    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Benutzer existiert bereits" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, username, passwordHash });
    
    res.status(201).json({ id: user.id, username: user.username });
};
