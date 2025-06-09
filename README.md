# ChatGPT-NSFW

## Beschreibung
ChatGPT-NSFW ist eine Chat-Anwendung, die mit React und einem Backend arbeitet. Sie unterstützt JWT-Authentifizierung und ermöglicht die Verwaltung von Chats und Nachrichten. Das Projekt ist modular aufgebaut und bietet eine einfache Möglichkeit, mit einem Backend zu kommunizieren.

## Features
- JWT-Authentifizierung
- Dynamisches Laden von Chats und Nachrichten
- Suchfunktion für Chats und Nachrichten
- Sortierung der Chats von neu nach alt
- Benutzerregistrierung und Login

## Installation

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn
- Ein laufendes Backend (siehe Backend-Konfiguration)

### Schritte
1. **Repository klonen**:
    ```bash
    git clone <URL_deines_GitHub_Repositories>
    cd chatgpt-nsfw

2. **Abhängigkeiten insta:**
    npm install

3. **Backend konfigurieren:** 
    Stelle sicher, dass das Backend läuft und die Umgebungsvariablen korrekt gesetzt sind. Erstelle eine .env-Datei im Projektverzeichnis:
    REACT_APP_BACKEND_URL=http://localhost:4000

4. **Anwendung starten:**
    npm start

## Backend
Das Backend sollte eine REST-API bereitstellen, die folgende Endpunkte unterstützt:

- POST /auth/login: Authentifizierung und  JWT-Token-Generierung
- GET /chats: Abrufen der verfügbaren Chats
- POST /chats: Erstellen eines neuen Chats
- GET /chats/:id/messages: Abrufen der Nachrichten eines Chats

### Schritte
1. **Backend-Abhängigkeiten installieren**
    cd backend
    npm install

2. **Backend konfigurieren:** 
    Stelle sicher, dass das Backend läuft und die Umgebungsvariablen korrekt gesetzt sind. Erstelle eine .env-Datei im Projektverzeichnis:

3. **Backend starten:**
    npm start