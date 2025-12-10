import Match from "../models/Match.js";

export const getUserMatches = async (req, res) => {
  try {
    const { userId } = req.params;

    const matches = await Match.find({ users: userId });

    res.json({ success: true, matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching matches" });
  }
};
