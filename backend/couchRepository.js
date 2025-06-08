import nano from "nano";

const couch = nano('http://admin:38678Osterwieck@127.0.0.1:5984');

const chatsDbName = "chats";
const messagesDbName = "messages";

async function initDbs() {
    const dbList = await couch.db.list();

    if (!dbList.includes(chatsDbName)) {
        await couch.db.create(chatsDbName);
        console.log(`DB ${chatsDbName} erstellt`);
    }
    if (!dbList.includes(messagesDbName)) {
        await couch.db.create(messagesDbName);
        console.log(`DB ${messagesDbName} erstellt`);
    }
}

const chatsDb = couch.use(chatsDbName);
const messagesDb = couch.use(messagesDbName);

// Chats
export async function getChats() {
    const response = await chatsDb.list({ include_docs: true });
    return response.rows.map(row => ({ id: row.id, ...row.doc }));
}

export async function createChat(title, model) {
    const doc = {
        title,
        model,
        createdAt: new Date().toISOString(),
    };
    const response = await chatsDb.insert(doc);
    return { id: response.id, ...doc };
}

export async function getChatById(id) {
    try {
        const doc = await chatsDb.get(id);
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

export { initDbs };
