const express = require('express');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const auth = require('../middleware/auth');
const { FriendRequest, User, Notification, Block } = require('../models');

const router = express.Router();

// POST /api/friends/request/:userId — send friend request
router.post('/request/:userId', auth, async (req, res) => {
  try {
    const receiverId = parseInt(req.params.userId);

    if (receiverId === req.user.id) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself.' });
    }

    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Check if request already exists (in either direction)
    const existing = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: receiverId },
          { sender_id: receiverId, receiver_id: req.user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends.' });
      }
      if (existing.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending.' });
      }
      // If rejected, allow	re-sending
      if (existing.status === 'rejected') {
        existing.status = 'pending';
        existing.sender_id = req.user.id;
        existing.receiver_id = receiverId;
        await existing.save();

        await Notification.create({
          user_id: receiverId,
          type: 'friend_request',
          reference_id: existing.id,
          from_user_id: req.user.id,
          message: `${req.user.display_name || req.user.username} sent you a friend request.`,
        });

        return res.json({ message: 'Friend request sent.', request: existing });
      }
    }

    const request = await FriendRequest.create({
      sender_id: req.user.id,
      receiver_id: receiverId,
    });

    await Notification.create({
      user_id: receiverId,
      type: 'friend_request',
      reference_id: request.id,
      from_user_id: req.user.id,
      message: `${req.user.display_name || req.user.username} sent you a friend request.`,
    });

    res.status(201).json({ message: 'Friend request sent.', request });
  } catch (error) {
    console.error('Send request error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/friends/accept/:requestId
router.put('/accept/:requestId', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findByPk(req.params.requestId);
        if (!request) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }
    if (request.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed.' });
    }

    request.status = 'accepted';
    await request.save();

    await Notification.create({
      user_id: request.sender_id,
      type: 'friend_accept',
      reference_id: request.id,
      from_user_id: req.user.id,
      message: `${req.user.display_name || req.user.username} accepted your friend request.`,
    });

    res.json({ message: 'Friend request accepted.', request });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/friends/reject/:requestId
router.put('/reject/:requestId', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findByPk(req.params.requestId);
    if (!request) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }
    if (request.receiver_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed.' });
    }

    request.status = 'rejected';
    await request.save();

    res.json({ message: 'Friend request rejected.', request });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/friends — get friends list
router.get('/', auth, async (req, res) => {
  try {
    const friendships = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: req.user.id },
          { receiver_id: req.user.id },
        ],
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'display_name', 'avatar_url', 'bio'] },
      ],
    });

    const friends = friendships.map((f) => {
      return f.sender_id === req.user.id ? f.receiver.toJSON() : f.sender.toJSON();
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/friends/:userId — unfriend a user
router.delete('/:userId', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    const existing = await FriendRequest.findOne({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: targetId },
          { sender_id: targetId, receiver_id: req.user.id },
        ],
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Friendship not found.' });
    }

    await existing.destroy();
    res.json({ message: 'Unfriended successfully.' });
  } catch (error) {
    console.error('Unfriend error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/friends/requests — pending received requests
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.findAll({
      where: {
        receiver_id: req.user.id,
        status: 'pending',
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/friends/status/:userId — friendship status with a specific user
router.get('/status/:userId', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    const request = await FriendRequest.findOne({
      where: {
        [Op.or]: [
          { sender_id: req.user.id, receiver_id: targetId },
          { sender_id: targetId, receiver_id: req.user.id },
        ],
      },
    });

    if (!request) {
      return res.json({ status: 'none', requestId: null });
    }

    res.json({
      status: request.status,
      requestId: request.id,
      isSender: request.sender_id === req.user.id,
    });
  } catch (error) {
    console.error('Friend status error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});
// GET /api/friends/suggestions — people you may know (ranked by mutual friends)
router.get('/suggestions', auth, async (req, res) => {
  try {
    const friendships = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ sender_id: req.user.id }, { receiver_id: req.user.id }],
      },
    });
    const myFriendIds = friendships.map((f) =>
      f.sender_id === req.user.id ? f.receiver_id : f.sender_id
    );

    const pendingRequests = await FriendRequest.findAll({
      where: {
        status: 'pending',
        [Op.or]: [{ sender_id: req.user.id }, { receiver_id: req.user.id }],
      },
    });
    const pendingIds = pendingRequests.map((r) =>
      r.sender_id === req.user.id ? r.receiver_id : r.sender_id
    );

    const blocks = await Block.findAll({
      where: {
        [Op.or]: [
          { blocker_id: req.user.id },
          { blocked_id: req.user.id },
        ],
      },
    });
    const blockedIds = blocks.map((b) =>
      b.blocker_id === req.user.id ? b.blocked_id : b.blocker_id
    );

    const excludeIds = [req.user.id, ...myFriendIds, ...pendingIds, ...blockedIds];
    const suggestionsMap = {};

    for (const friendId of myFriendIds) {
      const fof = await FriendRequest.findAll({
        where: {
          status: 'accepted',
          [Op.or]: [{ sender_id: friendId }, { receiver_id: friendId }],
        },
      });
      fof.forEach((f) => {
        const otherId = f.sender_id === friendId ? f.receiver_id : f.sender_id;
        if (!excludeIds.includes(otherId)) {
          suggestionsMap[otherId] = (suggestionsMap[otherId] || 0) + 1;
        }
      });
    }

    const sorted = Object.entries(suggestionsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    if (sorted.length === 0) {
      const fallback = await User.findAll({
        where: { id: { [Op.notIn]: excludeIds } },
        attributes: ['id', 'username', 'display_name', 'avatar_url'],
        limit: 5,
        order: sequelize.random(),
      });
      return res.json({
        suggestions: fallback.map((u) => ({ ...u.toJSON(), mutualCount: 0 })),
      });
    }

    const userIds = sorted.map(([id]) => parseInt(id));
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'username', 'display_name', 'avatar_url'],
    });

    const suggestions = sorted.map(([id, mutualCount]) => {
      const user = users.find((u) => u.id === parseInt(id));
      return user ? { ...user.toJSON(), mutualCount } : null;
    }).filter(Boolean);

    res.json({ suggestions });
  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/friends/mutual/:userId — mutual friends count
router.get('/mutual/:userId', auth, async (req, res) => {
  try {
    const targetId = parseInt(req.params.userId);
    if (targetId === req.user.id) return res.json({ mutualCount: 0, mutualFriends: [] });

    const myFriendships = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ sender_id: req.user.id }, { receiver_id: req.user.id }],
      },
    });
    const myFriendIds = new Set(myFriendships.map((f) =>
      f.sender_id === req.user.id ? f.receiver_id : f.sender_id
    ));

    const theirFriendships = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [{ sender_id: targetId }, { receiver_id: targetId }],
      },
    });
    const theirFriendIds = new Set(theirFriendships.map((f) =>
      f.sender_id === targetId ? f.receiver_id : f.sender_id
    ));

    const mutualIds = [...myFriendIds].filter((id) => theirFriendIds.has(id));

    let mutualFriends = [];
    if (mutualIds.length > 0) {
      mutualFriends = await User.findAll({
        where: { id: { [Op.in]: mutualIds } },
        attributes: ['id', 'username', 'display_name', 'avatar_url'],
        limit: 6,
      });
    }

    res.json({ mutualCount: mutualIds.length, mutualFriends });
  } catch (error) {
    console.error('Mutual friends error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
