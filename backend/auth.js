// auth.js
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Beispielnutzer (normalerweise aus DB)
const user = {
    id: "1",
    username: "demo",
    passwordHash: bcrypt.hashSync("passwort123", 10),
};

// Login-Route
export const loginRoute = (req, res) => {
    const { username, password } = req.body;
    if (username !== user.username || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: "Ungültige Anmeldedaten" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
};

// Middleware zum Schutz von Routen
export const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: "Token ungültig oder abgelaufen" });
    }
};
