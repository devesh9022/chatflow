import { Smile, Paperclip, Send } from "lucide-react";

function MessageInput({ message, setMessage, sendMessage }) {
  return (
    <div className="message-input-container">
      <Smile size={23} />
      <Paperclip size={22} />

      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            sendMessage();
          }
        }}
      />

      <button onClick={sendMessage}>
        <Send size={20} />
      </button>
    </div>
  );
}

export default MessageInput;