
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.pre("validate", function () {
  const hasReceiver = Boolean(this.receiverId);
  const hasGroup = Boolean(this.groupId);

  if (hasReceiver === hasGroup) {
    throw new Error(
      "Message must have either receiverId or groupId"
    );
  }
});

messageSchema.index({
  senderId: 1,
  receiverId: 1,
  createdAt: 1,
});

messageSchema.index({
  groupId: 1,
  createdAt: 1,
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
