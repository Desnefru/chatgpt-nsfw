import React, { useState, useRef, useEffect, useCallback } from "react";
import Login from "./Login";
import "./App.css";

function App() {
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [popupOpenFor, setPopupOpenFor] = useState(null); // chatId für offenes Popup
  const [searchTerm, setSearchTerm] = useState("");
  const [editingChatId, setEditingChatId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("jwt")); // Token aus localStorage holen
  const [username, setUsername] = useState(localStorage.getItem("username"));
  const chatWindowRef = useRef(null);
  const inputRef = React.useRef(null);

  const backendUrl = "http://localhost:4000";

  // Aktiver Chat
  const activeChat = chats.find((chat) => chat.id === activeChatId);

  const authFetch = useCallback(async (url, options = {}) => {
    if (!token) throw new Error("Nicht authentifiziert");
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    };
    return fetch(url, {
      ...options,
      headers,
    });
  }, [token]);

  // Scrollen wenn neue Nachrichten da sind
  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
    }
  }, [activeChat?.messages, loading]);

  // Chats + Nachrichten vom Backend laden
  useEffect(() => {
    if (!token) return;
    const loadChats = async () => {
      try {
        const resp = await authFetch(`${backendUrl}/chats`);
        if (!resp.ok) throw new Error("Fehler beim Laden der Chats");
        const chatsFromApi = await resp.json();

        if (chatsFromApi.length === 0) {
          // Keine Chats vorhanden -> neuen anlegen
          // Neuen Chat direkt anlegen und im State setzen
          const createResp = await authFetch(`${backendUrl}/chats`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: `Chat 1`, model: `gpt-4o-mini` }),
          });
          if (!createResp.ok) throw new Error("Fehler beim Erstellen eines neuen Chats");
          const newChat = await createResp.json();
          newChat.messages = [];

          setChats([newChat]);
          setActiveChatId(newChat.id);
        } else {
          // Chats mit Nachrichten laden
          const chatsWithMessages = await Promise.all(
            chatsFromApi.map(async (chat) => {
              const msgResp = await authFetch(`${backendUrl}/chats/${chat.id}/messages`);
              if (!msgResp.ok) throw new Error("Fehler beim Laden der Nachrichten");
              const messages = await msgResp.json();
              return { ...chat, messages };
            })
          );

          setChats(chatsWithMessages);
          if (chatsWithMessages.length > 0) setActiveChatId(chatsWithMessages[0].id);
        }
      } catch (e) {
        showError(e.message);
      }
    };

    loadChats();
  }, [token, authFetch]);

  useEffect(() => {
    if (!loading) {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [activeChatId, loading]);

  useEffect(() => {
    function handleClickOutside(event) {
      // Prüfe, ob das Popup geöffnet ist
      if (popupOpenFor !== null) {
        // Das Popup-Element finden wir per querySelector oder per Ref (hier querySelector)
        const popupElement = document.querySelector('.popup-menu');
        if (popupElement && !popupElement.contains(event.target)) {
          setPopupOpenFor(null);
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popupOpenFor]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300 ms Verzögerung

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const logout = () => {
    localStorage.removeItem("jwt");
    localStorage.removeItem("username");
    setToken(null);
  };

  // Nachricht senden (User -> Backend -> OpenAI -> Antwort speichern)
  const sendToOpenAI = async () => {
    if (!userInput.trim() || !activeChatId) return;

    setLoading(true);
    try {
      // Nutzer-Nachricht an Backend senden
      const userResp = await authFetch(`${backendUrl}/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content: userInput }),
      });
      if (!userResp.ok) throw new Error("Fehler beim Senden der Nachricht");
      await userResp.json();

      // Alle Nachrichten neu laden
      const messagesResp = await authFetch(`${backendUrl}/chats/${activeChatId}/messages`);
      if (!messagesResp.ok) throw new Error("Fehler beim Laden der Nachrichten");
      const allMessages = await messagesResp.json();

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChatId ? { ...chat, messages: allMessages } : chat
        )
      );
      setUserInput("");
    } catch (e) {
      showError(e.message);
    }
    setLoading(false);
  };

  // Chat erstellen
  const createNewChat = async () => {
    try {
      const resp = await authFetch(`${backendUrl}/chats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Chat ${chats.length + 1}`, model: `gpt-4o-mini` }),
      });
      if (!resp.ok) throw new Error("Fehler beim Erstellen eines neuen Chats");
      const newChat = await resp.json();
      newChat.messages = [];
      setChats((prev) => [...prev, newChat]);
      setActiveChatId(newChat.id);
    } catch (e) {
      showError(e.message);
    }
  };

  // Chat umbenennen
  const renameChat = async (chatId, newTitle) => {
    try {
      const resp = await authFetch(`${backendUrl}/chats/${chatId}/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!resp.ok) throw new Error("Fehler beim Umbenennen des Chats");

      setChats((prevChats) =>
        prevChats.map((chat) => (chat.id === chatId ? { ...chat, title: newTitle } : chat))
      );
      setPopupOpenFor(null);
    } catch (e) {
      showError(e.message);
    }
  };

  // Chat model ändern
  const changeModel = async (chatId, newModel) => {
    try {
      const resp = await authFetch(`${backendUrl}/chats/${chatId}/model`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: newModel }),
      });
      if (!resp.ok) throw new Error("Fehler beim Ändern des Models für den Chat");

      setChats((prevChats) =>
        prevChats.map((chat) => (chat.id === chatId ? { ...chat, model: newModel } : chat))
      );
      setPopupOpenFor(null);
    } catch (e) {
      showError(e.message);
    }
  };

  // Chat löschen
  const deleteChat = async (chatId) => {
    try {
      const resp = await authFetch(`${backendUrl}/chats/${chatId}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Fehler beim Löschen des Chats");

      // Aktuelle Chats im State
      const remainingChats = chats.filter((chat) => chat.id !== chatId);

      if (remainingChats.length === 0) {
        // Wenn keine Chats mehr da sind, neuen Chat anlegen
        const newResp = await authFetch(`${backendUrl}/chats`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Chat 1", model: "gpt-4o-mini" }),
        });
        if (!newResp.ok) throw new Error("Fehler beim Erstellen eines neuen Chats");
        const newChat = await newResp.json();
        newChat.messages = [];

        setChats([newChat]);
        setActiveChatId(newChat.id);
      } else {
        // Wenn noch Chats da sind, aktiven Chat ggf. wechseln
        setChats(remainingChats);
        if (activeChatId === chatId) {
          setActiveChatId(remainingChats[0].id);
        }
      }
      setPopupOpenFor(null);
    } catch (e) {
      showError(e.message);
    }
  };

  const handleRenameClick = (chat) => {
    setEditingChatId(chat.id);
    setEditedTitle(chat.title);
    setPopupOpenFor(null);
  };

  // Chats filtern nach Suchbegriff
  const filteredChats = React.useMemo(() => {
    if (!chats || !debouncedSearchTerm) {
      // Wenn keine Chats oder kein Suchbegriff vorhanden ist, gib alle Chats zurück
      return chats;
    }

    const term = debouncedSearchTerm.toLowerCase();
    return chats.filter(chat =>
      chat.title.toLowerCase().includes(term) ||
      chat.messages.some(msg => msg.content.toLowerCase().includes(term))
    );
  }, [chats, debouncedSearchTerm]);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 3000);
  };

  // Wenn kein Token vorhanden ist, zeige die Login-Seite
  if (!token) {
    return <Login onLogin={(newToken, username) => { setToken(newToken); setUsername(username) }} />;
  }

  return (
    <div className={`app-wrapper ${sidebarVisible ? "" : "sidebar-hidden"}`}>
      {errorMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#ff4d4f",
            color: "white",
            padding: "10px 20px",
            borderRadius: "5px",
            zIndex: 9999,
            boxShadow: "0 0 10px rgba(255, 77, 79, 0.7)",
          }}
          role="alert"
          aria-live="assertive"
        >
          {errorMessage}
        </div>
      )}
      {sidebarVisible && (
        <div className="sidebar">
          <div className="sidebar-header">
            Chats
            <button
              className="sidebar-toggle-button"
              onClick={() => setSidebarVisible(false)}
              aria-label="Sidebar verstecken"
              title="Sidebar verstecken"
            >
              &times;
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <input
              type="text"
              placeholder="Chats suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "80%",
                margin: "8px 4px 8px 8px",
                padding: "6px",
                borderRadius: "4px",
                border: "1px solid #444",
                backgroundColor: "#222",
                color: "white",
              }}
            />
            <button
              onClick={() => setSearchTerm("")}
              aria-label="Suche löschen"
              title="Suche löschen"
              style={{
                width: "15%",
                margin: "8px 8px 8px 0",
                padding: "6px",
                borderRadius: "4px",
                border: "1px solid #444",
                backgroundColor: "#444",
                color: "white",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
          {activeChat && (
            <select
              value={activeChat.model || "gpt-4o-mini"}
              onChange={async (e) => {
                const newModel = e.target.value;
                // Chat model updaten
                try {
                  await changeModel(activeChat.id, newModel);
                  // State updaten
                  setChats((prevChats) =>
                    prevChats.map((chat) =>
                      chat.id === activeChat.id ? { ...chat, model: newModel } : chat
                    )
                  );
                } catch {
                  showError("Fehler beim Ändern des Modells")
                }
              }}
              style={{
                width: "90%",
                margin: "8px",
                padding: "6px",
                borderRadius: "4px",
                backgroundColor: "#222",
                color: "white",
                border: "1px solid #444",
                userSelect: "none",
              }}
            >
              <option value="gpt-4o-mini">gpt-4o-mini</option>
              <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
              <option value="gpt-4">gpt-4</option>
            </select>
          )}

          <div className="chat-list">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className={`chat-item ${chat.id === activeChatId ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", position: "relative" }}
              >
                {editingChatId === chat.id ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={() => {
                      if (editedTitle.trim()) {
                        renameChat(chat.id, editedTitle.trim());
                      } else {
                        // Option: Fehlermeldung anzeigen oder altes Title behalten
                        setEditedTitle(chat.title); // altes Title zurücksetzen
                      }
                      setEditingChatId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (editedTitle.trim()) {
                          renameChat(chat.id, editedTitle.trim());
                        } else {
                          // Option: Fehlermeldung anzeigen oder altes Title behalten
                          setEditedTitle(chat.title); // altes Title zurücksetzen
                        }
                        setEditingChatId(null);
                      } else if (e.key === "Escape") {
                        setEditingChatId(null);
                      }
                    }}
                    autoFocus
                    style={{
                      flexGrow: 1,
                      fontSize: "1rem",
                      padding: "4px",
                      borderRadius: "4px",
                      border: "1px solid #444",
                      backgroundColor: "#222",
                      color: "white",
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setActiveChatId(chat.id)}
                    style={{ cursor: "pointer", flexGrow: 1, userSelect: "none" }}
                  >
                    {chat.title}
                  </span>
                )}
                <button
                  onClick={() =>
                    setPopupOpenFor(popupOpenFor === chat.id ? null : chat.id)
                  }
                  title="Optionen öffnen"
                  aria-label="Optionen öffnen"
                  style={{
                    marginLeft: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "inherit",
                    fontSize: "1.2rem",
                    userSelect: "none",
                  }}
                >
                  ⋮
                </button>

                {popupOpenFor === chat.id && (
                  <div
                    className="popup-menu"
                    style={{
                      position: "absolute",
                      top: "30px",
                      right: "0",
                      backgroundColor: "#222",
                      border: "1px solid #444",
                      borderRadius: "4px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      zIndex: 100,
                      display: "flex",
                      flexDirection: "column",
                      minWidth: "120px",
                    }}
                  >
                    <button
                      role="menuitem"
                      onClick={() => handleRenameClick(chat)}
                      style={{
                        padding: "8px",
                        background: "none",
                        border: "none",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Umbenennen
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        if (window.confirm(`Chat "${chat.title}" wirklich löschen?`)) {
                          deleteChat(chat.id);
                        }
                      }}
                      style={{
                        padding: "8px",
                        background: "none",
                        border: "none",
                        color: "red",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      Löschen
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="new-chat-button" onClick={createNewChat}>
            + Neuer Chat
          </div>
        </div>
      )}

      <div className={`app-container ${sidebarVisible ? "" : "sidebar-hidden"}`}>
        {!sidebarVisible && (
          <button
            className="sidebar-toggle-button"
            onClick={() => setSidebarVisible(true)}
            aria-label="Sidebar anzeigen"
            title="Sidebar anzeigen"
            style={{ marginBottom: "8px" }}
          >
            ☰ Chats
          </button>
        )}

        <div className="header">
          <span className="header-title">ChatGPT NSFW</span>
          <div className="user-controls">
            <span className="username">Eingeloggt als {username}</span>
            <button className="logout-button" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="chat-window" ref={chatWindowRef}>
          {(!activeChat || activeChat.messages.length === 0) && !loading && (
            <div style={{ color: "#6b7280", fontStyle: "italic" }}>
              Schreibe eine Nachricht, um zu starten...
            </div>
          )}

          {activeChat?.messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.role === "user" ? "user" : "bot"}`}
            >
              {msg.content}
            </div>
          ))}

          {loading && <div className="message bot loading">Warte auf Antwort...</div>}
        </div>

        <div className="input-area">
          <textarea
            ref={inputRef}
            placeholder="Schreibe hier deine Frage..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendToOpenAI();
              }
            }}
            disabled={loading}
          />
          <button onClick={sendToOpenAI} disabled={loading || !userInput.trim()}>
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;