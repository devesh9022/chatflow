import { io } from "socket.io-client";

const socket = io("https://chatflow-2-xs0g.onrender.com", {
  autoConnect: false,
});

export default socket;