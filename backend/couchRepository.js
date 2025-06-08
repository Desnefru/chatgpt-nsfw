import nano from "nano";

const couch = nano('http://admin:38678Osterwieck@127.0.0.1:5984');

const chatsDbName = "chats";
const messagesDbName = "messages";
const usersDbName = "users"; 

async function initDbs() {
    const dbList = await couch.db.list();

    if (!dbList.includes(chatsDbName)) {
        await couch.db.create(chatsDbName);
        console.log(`DB ${chatsDbName} erstellt`);
    }

    await couch.use(chatsDbName).createIndex({
        index: { fields: ["userId", "createdAt"] },
        name: "userId-createdAt-index",
        type: "json"
      });

    if (!dbList.includes(messagesDbName)) {
        await couch.db.create(messagesDbName);
        console.log(`DB ${messagesDbName} erstellt`);
    }

    await couch.use(messagesDbName).createIndex({
        index: { fields: ["chatId", "createdAt"] },
        name: "chatId-createdAt-index",
        type: "json"
    });

    if (!dbList.includes(usersDbName)) {
        await couch.db.create(usersDbName);
        console.log(`DB ${usersDbName} erstellt`);
    }

    await couch.use(usersDbName).createIndex({
        index: { fields: ["username"] },
        name: "username-index",
        type: "json"
    });
}

const chatsDb = couch.use(chatsDbName);
const messagesDb = couch.use(messagesDbName);
const usersDb = couch.use(usersDbName);

// Chats
export async function getChats(userId) {
    const response = await chatsDb.find({
        selector: { userId },
        sort: [{ createdAt: "desc" }],
    });
    return response.docs.map(doc => ({ id: doc._id, ...doc }));
}

export async function createChat(title, model, userId) {
    const doc = {
        title,
        model,
        userId,
        createdAt: new Date().toISOString(),
    };
    const response = await chatsDb.insert(doc);
    return { id: response.id, ...doc };
}

export async function getChatById(id, userId) {
    try {
        const doc = await chatsDb.get(id);
        if (doc.userId !== userId) return null;
        return { id: doc._id, ...doc };
    } catch {
        return null;
    }
}

export async function updateChatTitle(id, title) {
    try {
        const doc = await chatsDb.get(id);
        doc.title = title;
        await chatsDb.insert(doc);
        return { id: doc._id, ...doc };
    } catch {
        return null;
    }
}

export async function updateChatModel(id, model) {
    try {
        const doc = await chatsDb.get(id);
        doc.model = model;
        await chatsDb.insert(doc);
        return { id: doc._id, ...doc };
    } catch {
        return null;
    }
}

export async function deleteChat(id) {
    try {
        const doc = await chatsDb.get(id);
        await chatsDb.destroy(id, doc._rev);

        // Alle Nachrichten zum Chat löschen
        const messages = await getMessages(id);
        for (const msg of messages) {
            await deleteMessage(msg.id);
        }
        return true;
    } catch {
        return false;
    }
}

export async function getChatModel(id) {
    try {
        const doc = await chatsDb.get(id);
        return doc.model;
    } catch {
        return "gpt-4o-mini";
    }
}

// Messages
export async function getMessages(chatId) {
    // Filtere Nachrichten mit chatId
    const response = await messagesDb.find({
        selector: { chatId },
        sort: [{ createdAt: "asc" }],
    });
    return response.docs.map(doc => ({ id: doc._id, ...doc }));
}

export async function createMessage(chatId, role, content) {
    const doc = {
        chatId,
        role,
        content,
        createdAt: new Date().toISOString(),
    };
    const response = await messagesDb.insert(doc);
    return { id: response.id, ...doc };
}

export async function deleteMessage(id) {
    try {
        const doc = await messagesDb.get(id);
        await messagesDb.destroy(id, doc._rev);
        return true;
    } catch {
        return false;
    }
}

// Nutzer anlegen
export async function createUser({ username, passwordHash }) {
    const user = {
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
        type: "user",
    };
    const response = await usersDb.insert(user);
    return { id: response.id, ...user };
}

// Nutzer anhand des Benutzernamens abrufen
export async function getUserByUsername(username) {
    const result = await usersDb.find({
        selector: { username }
    });
    return result.docs[0] || null;
}

// Nutzer anhand ID abrufen
export async function getUserById(id) {
    try {
        const doc = await usersDb.get(id);
        return { id: doc._id, ...doc };
    } catch {
        return null;
    }
}

// Nutzer aktualisieren
export async function updateUser(id, updates) {
    try {
        const doc = await usersDb.get(id);
        const updatedDoc = { ...doc, ...updates };
        await usersDb.insert(updatedDoc);
        return { id: updatedDoc._id, ...updatedDoc };
    } catch {
        return null;
    }
}

// Nutzer löschen
export async function deleteUser(id) {
    try {
        const doc = await usersDb.get(id);
        await usersDb.destroy(id, doc._rev);
        return true;
    } catch {
        return false;
    }
}

export { initDbs };