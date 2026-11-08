
import ChatItem from "./chatitem.jsx";

function ChatList({ contacts, selectedId, onSelectContact }) {
  return (
    <div className="contact-list">
      {contacts.map((contact) => (
        <ChatItem
          key={contact.id}
          contact={contact}
          selectedId={selectedId}
          onSelectContact={onSelectContact}
        />
      ))}
    </div>
  );
}

export default ChatList;
