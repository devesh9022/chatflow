
function ChatItem({ contact, selectedId, onSelectContact }) {
  const lastMessage =
    contact.messages?.[contact.messages.length - 1];

  return (
    <div
      className={`contact ${
        selectedId === contact.id ? "active" : ""
      }`}
      onClick={() => onSelectContact(contact.id)}
    >
      {contact.image ? (
        <img
          src={contact.image}
          alt={contact.name}
          className="avatar"
        />
      ) : (
        <div className="avatar">
          {contact.name?.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="contact-info">
        <div className="contact-top">
          <h4>{contact.name}</h4>
          <span className="last-time">
            {lastMessage?.time || ""}
          </span>
        </div>

        <div className="contact-bottom">
          <p>{lastMessage?.text || "No messages yet"}</p>

          {contact.unreadCount > 0 && (
            <span className="unread-badge">
              {contact.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatItem;
