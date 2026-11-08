
// ==========================================
// IMPORTS
// ==========================================

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { Server } = require("socket.io");

const connectDB = require("./db");

const User = require("./models/User");
const Message = require("./models/Message");
const Group = require("./models/Group");

const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");

// ==========================================
// APP CONFIGURATION
// ==========================================

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Authentication routes
app.use("/api/auth", authRoutes);

// ==========================================
// PROFILE PICTURE UPLOAD CONFIGURATION
// ==========================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Make uploaded images accessible
app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    cb(
      null,
      `${req.userId}-${Date.now()}${extension}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
  },
});

// ==========================================
// GET REGISTERED USERS
// ==========================================

app.get("/api/users", authMiddleware, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.userId },
    }).select("name email profilePicture");

    res.json(
      users.map((user) => ({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || "",
      }))
    );

  } catch (error) {
    console.error("Fetch users error:", error);

    res.status(500).json({
      message: "Could not fetch users",
    });
  }
});

// ==========================================
// UPLOAD PROFILE PICTURE
// ==========================================

app.post(
  "/api/users/profile-picture",
  authMiddleware,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select an image",
        });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      const updatedUser = await User.findByIdAndUpdate(
        req.userId,
        {
          profilePicture: imageUrl,
        },
        {
          new: true,
        }
      ).select("name email profilePicture");

      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      res.json({
        message: "Profile picture updated successfully",

        user: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          profilePicture: updatedUser.profilePicture,
        },
      });

    } catch (error) {
      console.error("Profile picture upload error:", error);

      res.status(500).json({
        message: "Profile picture upload failed",
      });
    }
  }
);

// ==========================================
// GET PRIVATE CHAT MESSAGES
// ==========================================

app.get(
  "/messages/:contactId",
  authMiddleware,
  async (req, res) => {
    try {
      const { contactId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(contactId)) {
        return res.status(400).json({
          message: "Invalid contact ID",
        });
      }

      const contactExists = await User.exists({
        _id: contactId,
      });

      if (!contactExists) {
        return res.status(404).json({
          message: "Contact not found",
        });
      }

      const messages = await Message.find({
        $or: [
          {
            senderId: req.userId,
            receiverId: contactId,
          },
          {
            senderId: contactId,
            receiverId: req.userId,
          },
        ],
      }).sort({ createdAt: 1 });

      res.json(
        messages.map((message) => ({
          id: message._id.toString(),
          senderId: message.senderId.toString(),
          receiverId: message.receiverId.toString(),
          text: message.text,
          deleted: message.deleted,

          time: message.createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
      );

    } catch (error) {
      console.error("Private messages error:", error);

      res.status(500).json({
        message: "Could not fetch messages",
      });
    }
  }
);

// ==========================================
// CREATE GROUP
// ==========================================

app.post("/api/groups", authMiddleware, async (req, res) => {
  try {
    const { name, memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Group name is required",
      });
    }

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({
        message: "Member IDs must be an array",
      });
    }

    const allMemberIds = [
      ...new Set([
        req.userId,
        ...memberIds.map((id) => String(id)),
      ]),
    ];

    if (
      allMemberIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return res.status(400).json({
        message: "Invalid member ID",
      });
    }

    if (allMemberIds.length < 2) {
      return res.status(400).json({
        message: "A group needs at least two members",
      });
    }

    const existingUsers = await User.find({
      _id: { $in: allMemberIds },
    }).select("_id");

    if (existingUsers.length !== allMemberIds.length) {
      return res.status(400).json({
        message: "One or more users do not exist",
      });
    }

    const group = await Group.create({
      name: name.trim(),
      members: allMemberIds,
      admins: [req.userId],
      createdBy: req.userId,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "name email profilePicture")
      .populate("admins", "name");

    res.status(201).json({
      message: "Group created successfully",
      group: populatedGroup,
    });

  } catch (error) {
    console.error("Create group error:", error);

    res.status(500).json({
      message: "Could not create group",
    });
  }
});

// ==========================================
// GET ALL GROUPS OF LOGGED-IN USER
// ==========================================

app.get("/api/groups", authMiddleware, async (req, res) => {
  try {
    const groups = await Group.find({
      members: req.userId,
    })
      .populate("members", "name email profilePicture")
      .populate("admins", "name")
      .sort({ updatedAt: -1 });

    res.json(groups);

  } catch (error) {
    console.error("Fetch groups error:", error);

    res.status(500).json({
      message: "Could not fetch groups",
    });
  }
});

// ==========================================
// GET GROUP MESSAGES
// ==========================================

app.get(
  "/api/groups/:groupId/messages",
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({
          message: "Invalid group ID",
        });
      }

      const group = await Group.findOne({
        _id: groupId,
        members: req.userId,
      });

      if (!group) {
        return res.status(404).json({
          message: "Group not found or access denied",
        });
      }

      const messages = await Message.find({
        groupId,
      })
        .sort({ createdAt: 1 })
        .populate("senderId", "name profilePicture");

      res.json(
        messages.map((message) => ({
          id: message._id.toString(),
          groupId: message.groupId.toString(),
          senderId: message.senderId._id.toString(),
          senderName: message.senderId.name,
          senderPicture: message.senderId.profilePicture || "",
          text: message.text,
          deleted: message.deleted,

          time: message.createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }))
      );

    } catch (error) {
      console.error("Group messages error:", error);

      res.status(500).json({
        message: "Could not fetch group messages",
      });
    }
  }
);

// ==========================================
// ADD GROUP MEMBERS (ADMINS ONLY)
// ==========================================

app.post(
  "/api/groups/:groupId/members",
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId } = req.params;
      const { memberIds } = req.body;

      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({
          message: "Invalid group ID",
        });
      }

      if (
        !Array.isArray(memberIds) ||
        memberIds.length === 0 ||
        memberIds.some(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        )
      ) {
        return res.status(400).json({
          message: "Valid member IDs are required",
        });
      }

      const group = await Group.findOne({
        _id: groupId,
        admins: req.userId,
      });

      if (!group) {
        return res.status(403).json({
          message: "Only group admins can add members",
        });
      }

      const uniqueMemberIds = [...new Set(memberIds)];

      const users = await User.find({
        _id: { $in: uniqueMemberIds },
      }).select("_id");

      if (users.length !== uniqueMemberIds.length) {
        return res.status(400).json({
          message: "One or more users do not exist",
        });
      }

      await Group.updateOne(
        { _id: groupId },
        {
          $addToSet: {
            members: {
              $each: uniqueMemberIds,
            },
          },
        }
      );

      const updatedGroup = await Group.findById(groupId)
        .populate("members", "name email profilePicture")
        .populate("admins", "name");

      res.json({
        message: "Members added successfully",
        group: updatedGroup,
      });

    } catch (error) {
      console.error("Add group members error:", error);

      res.status(500).json({
        message: "Could not add members",
      });
    }
  }
);

// ==========================================
// REMOVE GROUP MEMBER (ADMINS ONLY)
// ==========================================

app.delete(
  "/api/groups/:groupId/members/:memberId",
  authMiddleware,
  async (req, res) => {
    try {
      const { groupId, memberId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(groupId) ||
        !mongoose.Types.ObjectId.isValid(memberId)
      ) {
        return res.status(400).json({
          message: "Invalid group or member ID",
        });
      }

      const group = await Group.findOne({
        _id: groupId,
        admins: req.userId,
      });

      if (!group) {
        return res.status(403).json({
          message: "Only group admins can remove members",
        });
      }

      if (memberId === group.createdBy.toString()) {
        return res.status(400).json({
          message: "The group creator cannot be removed",
        });
      }

      await Group.updateOne(
        { _id: groupId },
        {
          $pull: {
            members: memberId,
            admins: memberId,
          },
        }
      );

      const updatedGroup = await Group.findById(groupId)
        .populate("members", "name email profilePicture")
        .populate("admins", "name");

      res.json({
        message: "Member removed successfully",
        group: updatedGroup,
      });

    } catch (error) {
      console.error("Remove group member error:", error);

      res.status(500).json({
        message: "Could not remove member",
      });
    }
  }
);

// ==========================================
// SOCKET.IO CONFIGURATION
// ==========================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ==========================================
// SOCKET AUTHENTICATION
// ==========================================

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication required"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (
      !decoded.userId ||
      !mongoose.Types.ObjectId.isValid(decoded.userId)
    ) {
      return next(new Error("Invalid user ID"));
    }

    socket.userId = decoded.userId.toString();

    next();

  } catch (error) {
    console.error("Socket authentication error:", error.message);

    next(new Error("Invalid or expired token"));
  }
});

// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on("connection", (socket) => {
  console.log("User connected:", socket.userId);

  // ----------------------------------------
  // JOIN PRIVATE CHAT
  // ----------------------------------------

  socket.on("join_chat", async ({ contactId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(contactId)) {
        return;
      }

      const contactExists = await User.exists({
        _id: contactId,
      });

      if (!contactExists) {
        return;
      }

      const room = [
        socket.userId,
        contactId,
      ].sort().join("-");

      socket.join(room);

      console.log("Joined private chat:", room);

    } catch (error) {
      console.error("Join private chat error:", error);
    }
  });

  // ----------------------------------------
  // SEND PRIVATE MESSAGE
  // ----------------------------------------

  socket.on("send_message", async ({ receiverId, text }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(receiverId) ||
        typeof text !== "string" ||
        !text.trim()
      ) {
        return socket.emit("message_error", {
          message: "Invalid message or receiver",
        });
      }

      const cleanText = text.trim();

      if (cleanText.length > 5000) {
        return socket.emit("message_error", {
          message: "Message is too long",
        });
      }

      const receiverExists = await User.exists({
        _id: receiverId,
      });

      if (!receiverExists) {
        return socket.emit("message_error", {
          message: "Receiver not found",
        });
      }

      const newMessage = await Message.create({
        senderId: socket.userId,
        receiverId,
        text: cleanText,
      });

      const room = [
        socket.userId,
        receiverId,
      ].sort().join("-");

      const messageData = {
        id: newMessage._id.toString(),
        senderId: socket.userId,
        receiverId,
        text: newMessage.text,

        time: newMessage.createdAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      io.to(room).emit("receive_message", messageData);

    } catch (error) {
      console.error("Send private message error:", error);

      socket.emit("message_error", {
        message: "Message could not be sent",
      });
    }
  });

  // ----------------------------------------
  // JOIN GROUP CHAT
  // ----------------------------------------

  socket.on("join_group", async ({ groupId }) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return;
      }

      const group = await Group.findOne({
        _id: groupId,
        members: socket.userId,
      }).select("_id");

      if (!group) {
        return socket.emit("group_error", {
          message: "You are not a member of this group",
        });
      }

      const room = `group-${groupId}`;

      socket.join(room);

      console.log("Joined group:", room);

    } catch (error) {
      console.error("Join group error:", error);
    }
  });

  // ----------------------------------------
  // SEND GROUP MESSAGE
  // ----------------------------------------

  socket.on("send_group_message", async ({ groupId, text }) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(groupId) ||
        typeof text !== "string" ||
        !text.trim()
      ) {
        return socket.emit("group_error", {
          message: "Invalid group message",
        });
      }

      const cleanText = text.trim();

      if (cleanText.length > 5000) {
        return socket.emit("group_error", {
          message: "Message is too long",
        });
      }

      // Verify that sender belongs to the group
      const group = await Group.findOne({
        _id: groupId,
        members: socket.userId,
      }).select("_id");

      if (!group) {
        return socket.emit("group_error", {
          message: "You are not a member of this group",
        });
      }

      // Save group message
      const newMessage = await Message.create({
        senderId: socket.userId,
        groupId,
        text: cleanText,
      });

      const sender = await User.findById(socket.userId)
        .select("name profilePicture");

      const messageData = {
        id: newMessage._id.toString(),
        groupId,
        senderId: socket.userId,
        senderName: sender?.name || "User",
        senderPicture: sender?.profilePicture || "",
        text: newMessage.text,

        time: newMessage.createdAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      // Send message to all connected group members
      io.to(`group-${groupId}`).emit(
        "receive_group_message",
        messageData
      );

    } catch (error) {
      console.error("Send group message error:", error);

      socket.emit("group_error", {
        message: "Group message could not be sent",
      });
    }
  });

  // ========================================
  // DELETE MESSAGE FOR EVERYONE
  // ========================================

  socket.on("delete_message", async ({ messageId }) => {
    try {
      console.log("\n========== DELETE MESSAGE ==========");
      console.log("Message ID:", messageId);
      console.log("Logged-in user ID:", socket.userId);

      // 1. Validate message ID
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        console.log("Invalid message ID");

        return socket.emit("delete_message_error", {
          message: "Invalid message ID",
        });
      }

      // 2. Find message by ID
      const message = await Message.findById(messageId);

      console.log("Found message:", message);

      if (!message) {
        console.log("Message does not exist");

        return socket.emit("delete_message_error", {
          message: "Message not found",
        });
      }

      // 3. Check sender ownership
      console.log(
        "Message sender ID:",
        message.senderId.toString()
      );

      console.log(
        "Logged-in user ID:",
        socket.userId.toString()
      );

      if (
        message.senderId.toString() !==
        socket.userId.toString()
      ) {
        console.log("Sender ID mismatch");

        return socket.emit("delete_message_error", {
          message: "You can only delete your own messages",
        });
      }

      // 4. Check whether already deleted
      if (message.deleted) {
        return socket.emit("delete_message_error", {
          message: "Message is already deleted",
        });
      }

      // 5. Check group membership before deleting
      if (message.groupId) {
        const group = await Group.findOne({
          _id: message.groupId,
          members: socket.userId,
        }).select("_id");

        if (!group) {
          return socket.emit("delete_message_error", {
            message: "Group access denied",
          });
        }
      }

      // 6. Check private conversation receiver
      if (message.receiverId) {
        const receiverExists = await User.exists({
          _id: message.receiverId,
        });

        if (!receiverExists) {
          return socket.emit("delete_message_error", {
            message: "Conversation not found",
          });
        }
      }

      // 7. Mark message as deleted
      message.deleted = true;
      message.text = "This message was deleted";

      await message.save();

      console.log("Message deleted successfully");

      // 8. Find conversation room
      let room;

      if (message.groupId) {
        room = `group-${message.groupId}`;
      } else {
        room = [
          message.senderId.toString(),
          message.receiverId.toString(),
        ].sort().join("-");
      }

      // 9. Notify everyone in the conversation
      io.to(room).emit("message_deleted", {
        messageId: message._id.toString(),
        text: "This message was deleted",
      });

      console.log("Deletion notification sent to room:", room);
      console.log("====================================\n");

    } catch (error) {
      console.error("Delete message error:", error);

      socket.emit("delete_message_error", {
        message: "Could not delete message",
      });
    }
  });

  // ----------------------------------------
  // DISCONNECT
  // ----------------------------------------

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.userId);
  });
});

// ==========================================
// MULTER ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Image must be smaller than 5 MB"
          : "File upload error",
    });
  }

  if (
    error.message ===
    "Only JPG, PNG and WEBP images are allowed"
  ) {
    return res.status(400).json({
      message: error.message,
    });
  }

  console.error("Server error:", error);

  res.status(500).json({
    message: "Internal server error",
  });
});

// ==========================================
// START SERVER
// ==========================================

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from .env file");
    }

    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
};

startServer();
