const express = require('express');
const { Op } = require('sequelize');
const { Message, User, Block } = require('../models');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/messages/:userId - Get chat history with a specific user
router.get('/:userId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: otherUserId },
          { sender_id: otherUserId, receiver_id: req.user.id },
        ],
      },
      order: [['created_at', 'ASC']],
    });
    res.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/messages/:userId - Send a message to a user
router.post('/:userId', auth, async (req, res) => {
  try {
    const receiverId = req.params.userId;
    const { encrypted_content, encrypted_key, sender_encrypted_key, iv } = req.body;

    if (!encrypted_content || !encrypted_key || !iv) {
      return res.status(400).json({ error: 'Missing encryption parameters' });
    }

    // Check if there's any block relationship
    const blockRelation = await Block.findOne({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id, blocked_id: receiverId },
          { blocker_id: receiverId, blocked_id: req.user.id },
        ]
      }
    });

    if (blockRelation) {
      return res.status(403).json({ error: 'Cannot send message to this user' });
    }

    const message = await Message.create({
      sender_id: req.user.id,
      receiver_id: receiverId,
      encrypted_content,
      encrypted_key,
      sender_encrypted_key,
      iv,
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/public-key - Update user's public key
router.put('/public-key', auth, async (req, res) => {
  try {
    const { public_key } = req.body;
    if (!public_key) return res.status(400).json({ error: 'Missing public key' });

    await User.update({ public_key }, { where: { id: req.user.id } });
    res.json({ success: true });
  } catch (error) {
    console.error('Update public key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
