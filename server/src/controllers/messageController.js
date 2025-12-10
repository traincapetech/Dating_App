import Message from "../models/Message.js";

export const getMessages = async (req, res) => {
  try {
    const { matchId } = req.params;
    const messages = await Message.find({ matchId }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching messages", error });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { matchId, senderId, receiverId, text, mediaUrl } = req.body;
    const message = await Message.create({
      matchId, senderId, receiverId, text, mediaUrl
    });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Error sending message", error });
  }
};
