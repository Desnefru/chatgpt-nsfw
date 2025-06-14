import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import bodyParser from "body-parser";
import { loginRoute, authenticate, registerRoute } from "./auth.js";

import {
    initDbs,
    getChats,
    createChat,
    getChatById,
    updateChatTitle,
    deleteChat,
    getMessages,
    createMessage,
    updateChatModel,
    getChatModel,
} from "./couchRepository.js";
import { use } from "react";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

if (process.env.OPENAI_API_KEY && process.env.GOOGLE_GEN_AI_API_KEY) {
    console.error("Kein OpenAI oder GoogleGenAI API Key konfiguriert!");
    process.exit(1);
}

let ai = null;
let useGoogleGenAI = false;
if (process.env.GOOGLE_GEN_AI_API_KEY) {
    ai = new GoogleGenAI({
        apiKey: process.env.GOOGLE_GEN_AI_API_KEY
    });
    useGoogleGenAI = true;
} else if (process.env.OPENAI_API_KEY) {
    ai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

// CouchDB initialisieren
initDbs().catch(err => {
    console.error("Fehler beim Initialisieren der DBs:", err);
    process.exit(1);
});

app.post("/auth/register", registerRoute);
app.post("/auth/login", loginRoute);

app.use("/chats", authenticate);

// Chats laden
app.get("/chats", async (req, res) => {
    const chats = await getChats(req.user.userId);
    res.json(chats);
});

// Chat anlegen
app.post("/chats", async (req, res) => {
    const { title, model } = req.body;
    if (!title || !model) return res.status(400).json({ error: "Title und Model erforderlich" });

    const newChat = await createChat(title, model, req.user.userId);
    res.status(201).json(newChat);
});

// Chat umbenennen
app.put("/chats/:id/name", async (req, res) => {
    const chatId = req.params.id;
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: "Title fehlt" });

    const updatedChat = await updateChatTitle(chatId, title);
    if (!updatedChat) return res.status(404).json({ error: "Chat nicht gefunden" });

    res.json(updatedChat);
});

// Chat model ändern
app.put("/chats/:id/model", async (req, res) => {
    const chatId = req.params.id;
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: "Model fehlt" });

    const updatedChat = await updateChatModel(chatId, model);
    if (!updatedChat) return res.status(404).json({ error: "Chat nicht gefunden" });

    res.json(updatedChat);
});

// Chat löschen
app.delete("/chats/:id", async (req, res) => {
    const chatId = req.params.id;
    const success = await deleteChat(chatId);
    if (!success) return res.status(404).json({ error: "Chat nicht gefunden" });
    res.status(204).end();
});

// Nachrichten für Chat laden
app.get("/chats/:id/messages", async (req, res) => {
    const chatId = req.params.id;
    const chatExists = await getChatById(chatId, req.user.userId);
    if (!chatExists) return res.status(404).json({ error: "Chat nicht gefunden" });

    const chatMessages = await getMessages(chatId);
    res.json(chatMessages);
});

// Nachricht hinzufügen und an OpenAI senden
app.post("/chats/:id/messages", async (req, res) => {
    const chatId = req.params.id;
    const { role, content } = req.body;
    if (!role || !content) return res.status(400).json({ error: "role und content sind erforderlich" });

    const chatExists = await getChatById(chatId, req.user.userId);
    if (!chatExists) return res.status(404).json({ error: "Chat nicht gefunden" });

    const model = await chatExists.model;
    // Nutzer-Nachricht speichern
    const userMsg = await createMessage(chatId, role, content);

    if (role === "user") {
        try {
            // Alle Nachrichten des Chats laden
            const chatMessages = await getMessages(chatId);
            // Für OpenAI nur role + content
            const aiMessages = chatMessages.slice(-10).map(({ role, content }) => ({ role, content }));

            let botResponse;
            if (useGoogleGenAI) {
                const geminiMessages = aiMessages.map(msg => ({
                    role: msg.role === "user" ? "user" : "model",
                    parts: [{ text: msg.content }]
                }));

                const completion = await ai.models.generateContent({
                    model: "gemini-2.0-flash",
                    contents: geminiMessages,
                });

                const parts = completion.candidates[0].content.parts;
                const fullText = parts.map(part => part.text || part.value || "").join("");
                botResponse = { role: "model", content: fullText };
            }
            else {
                const completion = await ai.chat.completions.create({
                    model: model,
                    messages: aiMessages,
                });
                botResponse = completion.choices[0].message;
            }

            // Bot-Nachricht speichern
            const botMsg = await createMessage(chatId, botResponse.role, botResponse.content);

            const messages = await getMessages(chatId);
            let generatedTitle = "";
            if (messages.length === 2) {
                const contextMessages = aiMessages.slice(0, 2)  // Beispiel: 2 user + 2 bot Nachrichten

                const summaryPrompt = [
                    {
                        role: "system",
                        content: "Du bist ein hilfreicher Assistent, der aus einem Chatverlauf einen kurzen, passenden Titel erstellt."
                    },
                    {
                        role: "user",
                        content: `Bitte fasse folgenden Chatverlauf kurz in einem prägnanten Titel zusammen:\n\n${contextMessages
                            .map(m => `${m.role}: ${m.content}`)
                            .join("\n")}`
                    }
                ];

                if (useGoogleGenAI) {
                    const geminiSummary = await ai.models.generateContent({
                        model: "gemini-2.0-flash",
                        contents: summaryPrompt.map(msg => ({
                            role: msg.role === "user" ? "user" : "model",
                            parts: [{ text: msg.content }]
                        })),
                    });

                    const summaryParts = geminiSummary.candidates[0].content.parts;
                    generatedTitle = summaryParts.map(part => part.text || part.value || "").join("").trim();
                } else {
                    const summaryCompletion = await openai.chat.completions.create({
                        model: model,
                        messages: summaryPrompt,
                        max_tokens: 15,  // kurz halten
                    });

                    generatedTitle = summaryCompletion.choices[0].message.content.trim();
                }
                // Titel updaten
                await updateChatTitle(chatId, generatedTitle);
            }

            res.status(201).json({usrMsg: userMsg, botMsg: botMsg, newTitle: generatedTitle});
        } catch (error) {
            console.error(error);
            if(useGoogleGenAI)
                res.status(500).json({ error: "Google Gen AI Anfrage fehlgeschlagen" });
            else
                res.status(500).json({ error: "OpenAI Anfrage fehlgeschlagen" });
        }
    } else {
        res.status(201).json({msg: userMsg, botMsg: "", newTitle: generatedTitle});
    }
});

app.listen(port, () => {
    console.log(`Backend läuft auf http://localhost:${port}`);
});
