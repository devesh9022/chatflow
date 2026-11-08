
import { useEffect, useRef } from "react";

import ChatHeader from "./Chatheader";
import Message from "./message.jsx";
import MessageInput from "./messageinput.jsx";

function ChatWindow({
  selectedContact,
  message,
  setMessage,
  sendMessage,
  deleteMessage,
}) {
  const messagesEndRef = useRef(null);

  const isGroup = selectedContact?.isGroup === true;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    selectedContact?.id,
    selectedContact?.messages,
  ]);

  if (!selectedContact) {
    return (
      <div className="chat-window">
        Select a conversation
      </div>
    );
  }

  return (
    <div className="chat-window">
      <ChatHeader contact={selectedContact} />

      <div className="messages-container">
        {selectedContact.messages?.map((msg) => (
          <Message
            key={msg.id}
            msg={msg}
            isGroup={isGroup}
            deleteMessage={deleteMessage}
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        message={message}
        setMessage={setMessage}
        sendMessage={sendMessage}
      />
    </div>
  );
}

export default ChatWindow;
