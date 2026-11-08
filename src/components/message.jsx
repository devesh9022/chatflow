
import { Trash2 } from "lucide-react";

function Message({ msg, isGroup, deleteMessage }) {
  console.log("MESSAGE COMPONENT IS RUNNING");
  const isMe = msg.sender === "me";
  console.log("Message:", msg.text, "Sender:", msg.sender, "Is mine:", isMe);
  const isDeleted = msg.deleted === true;

  const handleDelete = () => {
    if (window.confirm("Delete this message for everyone?")) {
      deleteMessage(msg.id);
    }
  };

  return (
    <div
      className={`message-row ${
        isMe ? "my-message-row" : "other-message-row"
      }`}
    >
      <div
        className={`message ${
          isMe ? "my-message" : "other-message"
        }`}
      >
        {isGroup && !isMe && !isDeleted && (
          <div className="message-sender-name">
            {msg.senderName || "User"}
          </div>
        )}

        <p className={isDeleted ? "deleted-message" : ""}>
          {msg.text}
        </p>

        <div className="message-footer">
          <span className="message-time">
            {msg.time}
          </span>

          {isMe && !isDeleted && (
            <button
              type="button"
              className="delete-message-button"
              title="Delete message for everyone"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Message;
