const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { Post, User, Comment, Like, FriendRequest, Report, Block } = require('../models');

const router = express.Router();

// GET /api/posts/feed — paginated feed of friends' + own posts
router.get('/feed', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get accepted friends
    const friendships = await FriendRequest.findAll({
      where: {
        status: 'accepted',
        [Op.or]: [
          { sender_id: req.user.id },
          { receiver_id: req.user.id },
        ],
      },
    });

    const friendIds = friendships.map((f) =>
      f.sender_id === req.user.id ? f.receiver_id : f.sender_id
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

    // Include own posts + friends' posts, but exclude blocked users
    let userIds = [req.user.id, ...friendIds];
    userIds = userIds.filter(id => !blockedIds.includes(id));

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { user_id: { [Op.in]: userIds } },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        {
          model: Comment, as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
          order: [['created_at', 'ASC']],
        },
        { model: Like, as: 'likes' },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    // Attach like status for current user
    const postsData = posts.map((post) => {
      const postJSON = post.toJSON();
      postJSON.likeCount = postJSON.likes.length;
      postJSON.isLiked = postJSON.likes.some((l) => l.user_id === req.user.id);
      postJSON.commentCount = postJSON.comments.length;
      delete postJSON.likes;
      return postJSON;
    });

    res.json({
      posts: postsData,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Feed error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/posts — create post (text + optional image)
router.post(
  '/',
  auth,
  upload.single('image'),
  [body('content').optional({ nullable: true }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      if (!req.body.content && !req.file) {
        return res.status(400).json({ error: 'Post must contain either text or an image.' });
      }

      const postData = {
        user_id: req.user.id,
        content: req.body.content || null,
      };

      if (req.file) {
        postData.image_url = `/uploads/${req.file.filename}`;
      }

      const post = await Post.create(postData);

      const fullPost = await Post.findByPk(post.id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        ],
      });

      res.status(201).json({
        post: {
          ...fullPost.toJSON(),
          likeCount: 0,
          isLiked: false,
          commentCount: 0,
          comments: [],
        },
      });
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// GET /api/posts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id, {
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        {
          model: Comment, as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
          order: [['created_at', 'ASC']],
        },
        { model: Like, as: 'likes' },
      ],
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const postJSON = post.toJSON();
    postJSON.likeCount = postJSON.likes.length;
    postJSON.isLiked = postJSON.likes.some((l) => l.user_id === req.user.id);
    postJSON.commentCount = postJSON.comments.length;
    delete postJSON.likes;

    res.json({ post: postJSON });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this post.' });
    }

    await post.destroy();
    res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/posts/user/:userId — get posts by a specific user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { user_id: req.params.userId },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        {
          model: Comment, as: 'comments',
          include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
        },
        { model: Like, as: 'likes' },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
      distinct: true,
    });

    const postsData = posts.map((post) => {
      const postJSON = post.toJSON();
      postJSON.likeCount = postJSON.likes.length;
      postJSON.isLiked = postJSON.likes.some((l) => l.user_id === req.user.id);
      postJSON.commentCount = postJSON.comments.length;
      delete postJSON.likes;
      return postJSON;
    });

    res.json({
      posts: postsData,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('User posts error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/posts/:id — edit post (owner only)
router.put(
  '/:id',
  auth,
  [body('content').optional({ nullable: true }).trim()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await Post.findByPk(req.params.id);
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      if (post.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized to edit this post.' });

      if (!req.body.content && !post.image_url) {
        return res.status(400).json({ error: 'Post must contain either text or an image.' });
      }

      const filtered = req.body.content ? filterProfanity(req.body.content) : null;
      await post.update({ content: filtered });

      const fullPost = await Post.findByPk(post.id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
          {
            model: Comment, as: 'comments',
            include: [{ model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] }],
          },
          { model: Like, as: 'likes' },
        ],
      });

      const postJSON = fullPost.toJSON();
      postJSON.likeCount = postJSON.likes.length;
      postJSON.isLiked = postJSON.likes.some((l) => l.user_id === req.user.id);
      postJSON.commentCount = postJSON.comments.length;
      delete postJSON.likes;

      res.json({ post: postJSON });
    } catch (error) {
      console.error('Edit post error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// POST /api/posts/:id/report — report a post
router.post('/:id/report', auth, async (req, res) => {
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    if (post.user_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot report your own post.' });
    }

    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'Report reason is required.' });

    const existing = await Report.findOne({
      where: { post_id: post.id, reporter_id: req.user.id },
    });
    if (existing) {
      return res.status(400).json({ error: 'You have already reported this post.' });
    }

    await Report.create({
      post_id: post.id,
      reporter_id: req.user.id,
      reason,
      description: description || null,
    });

    res.status(201).json({ message: 'Report submitted successfully.' });
  } catch (error) {
    console.error('Report post error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Basic profanity filter
const PROFANITY_LIST = ['badword1', 'badword2']; // extend as needed
function filterProfanity(text) {
  let filtered = text;
  PROFANITY_LIST.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    filtered = filtered.replace(regex, '*'.repeat(word.length));
  });
  return filtered;
}

module.exports = router;
