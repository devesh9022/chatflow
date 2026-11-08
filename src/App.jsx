
import { useEffect, useState } from "react";

import Auth from "./components/Auth.jsx";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/Chatwindow";
import socket from "./socket";

import "./App.css";

const API_URL = "http://localhost:5000";

function App() {
  // ======================================
  // AUTHENTICATION
  // ======================================

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      return savedUser && token
        ? JSON.parse(savedUser)
        : null;
    } catch {
      return null;
    }
  });

  const token = localStorage.getItem("token");

  // ======================================
  // STATES
  // ======================================

  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ======================================
  // SOCKET CONNECTION
  // ======================================

  useEffect(() => {
    if (!user || !token) return;

    socket.auth = { token };
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [user, token]);

  // ======================================
  // LOAD CONTACTS
  // ======================================

  useEffect(() => {
    if (!user || !token) return;

    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load users");
        }

        setContacts(
          data.map((contact) => ({
            ...contact,
            image: contact.profilePicture || null,
            unreadCount: 0,
            online: false,
            messages: [],
          }))
        );

      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [user, token]);

  // ======================================
  // LOAD GROUPS
  // ======================================

  const loadGroups = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load groups");
      }

      setGroups(
        data.map((group) => ({
          ...group,
          id: group._id,
          type: "group",
          messages: [],
        }))
      );

    } catch (error) {
      setError(error.message);
    }
  };

  useEffect(() => {
    if (!user || !token) return;

    loadGroups();
  }, [user, token]);

  // ======================================
  // LOAD PRIVATE CHAT HISTORY
  // ======================================

  useEffect(() => {
    if (!user || !selectedId || !token) return;

    let cancelled = false;

    const loadMessages = async () => {
      try {
        const response = await fetch(
          `${API_URL}/messages/${selectedId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load messages");
        }

        if (cancelled) return;

        setContacts((previous) =>
          previous.map((contact) =>
            contact.id === selectedId
              ? {
                  ...contact,
                  messages: data.map((msg) => ({
                    id: msg.id,
                    text: msg.text,
                    sender:
                      msg.senderId === user.id ? "me" : "other",
                    time: msg.time,
                    deleted: msg.deleted || false,
                  })),
                }
              : contact
          )
        );

      } catch (error) {
        console.error("Private message loading error:", error);
      }
    };

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [user, selectedId, token]);

  // ======================================
  // LOAD GROUP CHAT HISTORY
  // ======================================

  useEffect(() => {
    if (!user || !selectedGroupId || !token) return;

    let cancelled = false;

    const loadGroupMessages = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/groups/${selectedGroupId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load group messages");
        }

        if (cancelled) return;

        setGroups((previous) =>
          previous.map((group) =>
            group.id === selectedGroupId
              ? {
                  ...group,
                  messages: data.map((msg) => ({
                    id: msg.id,
                    text: msg.text,
                    sender:
                      msg.senderId === user.id ? "me" : "other",
                    senderName: msg.senderName,
                    senderPicture: msg.senderPicture,
                    time: msg.time,
                    deleted: msg.deleted || false,
                  })),
                }
              : group
          )
        );

      } catch (error) {
        console.error("Group message loading error:", error);
      }
    };

    loadGroupMessages();

    return () => {
      cancelled = true;
    };
  }, [user, selectedGroupId, token]);

  // ======================================
  // JOIN PRIVATE CHAT
  // ======================================

  useEffect(() => {
    if (!user || !selectedId || !socket.connected) return;

    socket.emit("join_chat", {
      contactId: selectedId,
    });
  }, [user, selectedId]);

  // ======================================
  // JOIN GROUP CHAT
  // ======================================

  useEffect(() => {
    if (!user || !selectedGroupId || !socket.connected) return;

    socket.emit("join_group", {
      groupId: selectedGroupId,
    });
  }, [user, selectedGroupId]);

  // ======================================
  // RECEIVE PRIVATE MESSAGES
  // ======================================

  useEffect(() => {
    if (!user) return;

    const handleReceiveMessage = (serverMessage) => {
      const contactId =
        serverMessage.senderId === user.id
          ? serverMessage.receiverId
          : serverMessage.senderId;

      setContacts((previous) =>
        previous.map((contact) => {
          if (contact.id !== contactId) return contact;

          if (
            contact.messages.some(
              (msg) => msg.id === serverMessage.id
            )
          ) {
            return contact;
          }

          return {
            ...contact,
            messages: [
              ...contact.messages,
              {
                id: serverMessage.id,
                text: serverMessage.text,
                sender:
                  serverMessage.senderId === user.id ? "me" : "other",
                time: serverMessage.time,
                deleted: false,
              },
            ],
          };
        })
      );
    };

    const handleMessageError = (data) => {
      setError(data.message || "Message could not be sent");
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_error", handleMessageError);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_error", handleMessageError);
    };
  }, [user]);

  // ======================================
  // RECEIVE GROUP MESSAGES
  // ======================================

  useEffect(() => {
    if (!user) return;

    const handleReceiveGroupMessage = (serverMessage) => {
      setGroups((previous) =>
        previous.map((group) => {
          if (group.id !== serverMessage.groupId) return group;

          if (
            group.messages.some(
              (msg) => msg.id === serverMessage.id
            )
          ) {
            return group;
          }

          return {
            ...group,
            messages: [
              ...group.messages,
              {
                id: serverMessage.id,
                text: serverMessage.text,
                sender:
                  serverMessage.senderId === user.id ? "me" : "other",
                senderName: serverMessage.senderName,
                senderPicture: serverMessage.senderPicture,
                time: serverMessage.time,
                deleted: false,
              },
            ],
          };
        })
      );
    };

    const handleGroupError = (data) => {
      setError(data.message || "Group message error");
    };

    socket.on("receive_group_message", handleReceiveGroupMessage);
    socket.on("group_error", handleGroupError);

    return () => {
      socket.off("receive_group_message", handleReceiveGroupMessage);
      socket.off("group_error", handleGroupError);
    };
  }, [user]);

  // ======================================
  // HANDLE DELETED MESSAGES
  // ======================================

  useEffect(() => {
    if (!user) return;

    const handleMessageDeleted = ({ messageId, text }) => {
      // Update private conversations
      setContacts((previous) =>
        previous.map((contact) => ({
          ...contact,
          messages: contact.messages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  text,
                  deleted: true,
                }
              : msg
          ),
        }))
      );

      // Update group conversations
      setGroups((previous) =>
        previous.map((group) => ({
          ...group,
          messages: group.messages.map((msg) =>
            msg.id === messageId
              ? {
                  ...msg,
                  text,
                  deleted: true,
                }
              : msg
          ),
        }))
      );
    };

    const handleDeleteError = (data) => {
      setError(data.message || "Could not delete message");
    };

    socket.on("message_deleted", handleMessageDeleted);
    socket.on("delete_message_error", handleDeleteError);

    return () => {
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("delete_message_error", handleDeleteError);
    };
  }, [user]);

  // ======================================
  // SELECT PRIVATE CONTACT
  // ======================================

  const handleSelectContact = (contactId) => {
    setSelectedId(contactId);
    setSelectedGroupId(null);
    setMessage("");
  };

  // ======================================
  // SELECT GROUP
  // ======================================

  const handleSelectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setSelectedId(null);
    setMessage("");
  };

  // ======================================
  // SEND PRIVATE MESSAGE
  // ======================================

  const sendMessage = () => {
    if (!message.trim() || !selectedId || !socket.connected) return;

    socket.emit("send_message", {
      receiverId: selectedId,
      text: message.trim(),
    });

    setMessage("");
  };

  // ======================================
  // SEND GROUP MESSAGE
  // ======================================

  const sendGroupMessage = () => {
    if (
      !message.trim() ||
      !selectedGroupId ||
      !socket.connected
    ) {
      return;
    }

    socket.emit("send_group_message", {
      groupId: selectedGroupId,
      text: message.trim(),
    });

    setMessage("");
  };

  // ======================================
  // DELETE MESSAGE
  // ======================================

  const deleteMessage = (messageId) => {
    if (!messageId || !socket.connected) {
      setError("Socket is not connected");
      return;
    }

    socket.emit("delete_message", {
      messageId,
    });
  };

  // ======================================
  // CREATE GROUP
  // ======================================

  const createGroup = async (name, memberIds) => {
    try {
      const response = await fetch(`${API_URL}/api/groups`, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify({
          name,
          memberIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create group");
      }

      const newGroup = {
        ...data.group,
        id: data.group._id,
        type: "group",
        messages: [],
      };

      setGroups((previous) => [
        newGroup,
        ...previous,
      ]);

      setSelectedId(null);
      setSelectedGroupId(newGroup.id);
      setMessage("");
      setError("");

      return true;

    } catch (error) {
      setError(error.message);
      return false;
    }
  };

  // ======================================
  // UPLOAD PROFILE PICTURE
  // ======================================

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG and WEBP images are allowed");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB");
      event.target.value = "";
      return;
    }

    try {
      const formData = new FormData();

      formData.append("profilePicture", file);

      const response = await fetch(
        `${API_URL}/api/users/profile-picture`,
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setUser(data.user);

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setError("");

    } catch (error) {
      setError(error.message);
    } finally {
      event.target.value = "";
    }
  };

  // ======================================
  // LOGOUT
  // ======================================

  const handleLogout = () => {
    socket.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setContacts([]);
    setGroups([]);
    setSelectedId(null);
    setSelectedGroupId(null);
    setMessage("");
    setError("");
  };

  // ======================================
  // AUTH SUCCESS
  // ======================================

  const handleAuthSuccess = (data) => {
    setUser(data.user);
    setContacts([]);
    setGroups([]);
    setSelectedId(null);
    setSelectedGroupId(null);
  };

  // ======================================
  // SEARCH
  // ======================================

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(search.toLowerCase())
  );

  // ======================================
  // MAIN UI
  // ======================================

  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (loading && contacts.length === 0) {
    return <div className="app-loading">Loading contacts...</div>;
  }

  const selectedContact = contacts.find(
    (contact) => contact.id === selectedId
  );

  const selectedGroup = groups.find(
    (group) => group.id === selectedGroupId
  );

  return (
    <div className="app-container">

      {error && (
        <div className="app-error">
          {error}
          <button onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      <Sidebar
        contacts={filteredContacts}
        groups={filteredGroups}
        selectedId={selectedId}
        selectedGroupId={selectedGroupId}
        onSelectContact={handleSelectContact}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={createGroup}
        search={search}
        setSearch={setSearch}
        currentUser={user}
        onLogout={handleLogout}
        onProfilePictureChange={handleProfilePictureChange}
      />

      {selectedContact ? (
        <ChatWindow
          selectedContact={selectedContact}
          message={message}
          setMessage={setMessage}
          sendMessage={sendMessage}
          deleteMessage={deleteMessage}
        />
      ) : selectedGroup ? (
        <ChatWindow
          selectedContact={{
            ...selectedGroup,
            name: selectedGroup.name,
            messages: selectedGroup.messages || [],
            isGroup: true,
          }}
          message={message}
          setMessage={setMessage}
          sendMessage={sendGroupMessage}
          deleteMessage={deleteMessage}
        />
      ) : (
        <div className="empty-chat">
          <h2>Welcome to ChatFlow</h2>
          <p>Select a contact or group to start a conversation.</p>
        </div>
      )}

    </div>
  );
}

export default App;
