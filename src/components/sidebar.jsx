
import { useRef, useState } from "react";
import {
  Plus,
  MoreVertical,
  Search,
  Camera,
  Users,
  X,
} from "lucide-react";

import ChatList from "./chatlist.jsx";

function Sidebar({
  contacts,
  groups,
  selectedId,
  selectedGroupId,
  onSelectContact,
  onSelectGroup,
  onCreateGroup,
  search,
  setSearch,
  currentUser,
  onLogout,
  onProfilePictureChange,
}) {
  const fileInputRef = useRef(null);

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Select or deselect group members
  const handleMemberChange = (memberId) => {
    setSelectedMembers((previous) =>
      previous.includes(memberId)
        ? previous.filter((id) => id !== memberId)
        : [...previous, memberId]
    );
  };

  // Create group
  const handleCreateGroup = async (event) => {
    event.preventDefault();

    if (!groupName.trim()) {
      return;
    }

    if (selectedMembers.length === 0) {
      return;
    }

    setCreatingGroup(true);

    const success = await onCreateGroup(
      groupName.trim(),
      selectedMembers
    );

    setCreatingGroup(false);

    if (success) {
      setGroupName("");
      setSelectedMembers([]);
      setShowGroupForm(false);
    }
  };

  return (
    <div className="sidebar">

      {/* SIDEBAR HEADER */}

      <div className="sidebar-header">
        <div className="profile">

          <div
            className="profile-picture-wrapper"
            onClick={() => fileInputRef.current?.click()}
            title="Change profile picture"
          >
           {currentUser?.profilePicture ? (
  <img
    src={`https://chatflow-2-xs0g.onrender.com${currentUser.profilePicture}`}
    alt="Profile"
    className="avatar my-avatar"
  />
) : (
              <div className="avatar my-avatar">
                {currentUser?.name?.charAt(0).toUpperCase() || "U"}
              </div>
            )}

            <div className="profile-camera">
              <Camera size={14} />
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            onChange={onProfilePictureChange}
          />

          <span>{currentUser?.name || "User"}</span>
        </div>

        <div className="header-icons">
          <button
            type="button"
            title="Create group"
            onClick={() => setShowGroupForm(true)}
          >
            <Plus size={21} />
          </button>

          <MoreVertical size={21} />
        </div>
      </div>

      {/* SEARCH */}

      <div className="search-container">
        <Search size={18} />

        <input
          type="text"
          placeholder="Search contacts and groups..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* GROUP LIST */}

      <div className="sidebar-section">
        <h4>Groups</h4>

        {groups?.length === 0 ? (
          <p className="no-groups">No groups yet</p>
        ) : (
          groups?.map((group) => (
            <div
              key={group.id}
              className={`contact ${
                selectedGroupId === group.id ? "active" : ""
              }`}
              onClick={() => onSelectGroup(group.id)}
            >
              <div className="avatar group-avatar">
                <Users size={20} />
              </div>

              <div className="contact-info">
                <div className="contact-top">
                  <h4>{group.name}</h4>
                </div>

                <div className="contact-bottom">
                  <p>
                    {group.messages?.length > 0
                      ? group.messages[group.messages.length - 1].text
                      : `${group.members?.length || 0} members`}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CONTACT LIST */}

      <div className="sidebar-section">
        <h4>Contacts</h4>

        <ChatList
          contacts={contacts}
          selectedId={selectedId}
          onSelectContact={onSelectContact}
        />
      </div>

      {/* LOGOUT */}

      <button onClick={onLogout} className="logout-button">
        Logout
      </button>

      {/* CREATE GROUP MODAL */}

      {showGroupForm && (
        <div className="group-modal-overlay">

          <div className="group-modal">

            <div className="group-modal-header">
              <h3>Create New Group</h3>

              <button
                type="button"
                onClick={() => setShowGroupForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateGroup}>

              <input
                type="text"
                placeholder="Enter group name"
                value={groupName}
                onChange={(event) =>
                  setGroupName(event.target.value)
                }
                maxLength={50}
                required
              />

              <h4>Select Members</h4>

              <div className="group-member-list">
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className="group-member-option"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(contact.id)}
                      onChange={() =>
                        handleMemberChange(contact.id)
                      }
                    />

                    <span>{contact.name}</span>
                  </label>
                ))}
              </div>

              <p className="selected-member-count">
                {selectedMembers.length} member(s) selected
              </p>

              <button
                type="submit"
                disabled={
                  creatingGroup ||
                  !groupName.trim() ||
                  selectedMembers.length === 0
                }
                className="create-group-button"
              >
                {creatingGroup ? "Creating..." : "Create Group"}
              </button>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Sidebar;
