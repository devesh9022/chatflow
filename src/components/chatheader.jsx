import { MoreVertical } from "lucide-react";

function ChatHeader({ contact }) {
  return (
    <div className="chat-header">
      <div className="chat-user">
      <img
  src={contact.image}
  alt={contact.name}
  className="avatar"
/>
        <div>
          <h4>{contact.name}</h4>
          <p>{contact.online ? "Online" : "Offline"}</p>
        </div>
      </div>

      <MoreVertical size={22} />
    </div>
  );
}

export default ChatHeader;