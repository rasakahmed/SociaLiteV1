const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const { Comment, CommentLike, Post, User, Notification } = require('../models');

const router = express.Router();

// GET /api/posts/:postId/comments
router.get('/:postId/comments', auth, async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { post_id: req.params.postId, parent_id: null },
      include: [
        { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
        { model: CommentLike, as: 'likes' },
        {
          model: Comment,
          as: 'replies',
          include: [
            { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
            { model: CommentLike, as: 'likes' },
          ],
          order: [['created_at', 'ASC']],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    // Formatting counts and isLiked
    const formatComment = (c) => {
      const cJson = typeof c.toJSON === 'function' ? c.toJSON() : c;
      cJson.likeCount = cJson.likes ? cJson.likes.length : 0;
      cJson.isLiked = cJson.likes ? cJson.likes.some(l => l.user_id === req.user.id) : false;
      delete cJson.likes;
      if (cJson.replies) {
        cJson.replies = cJson.replies.map(formatComment);
      }
      return cJson;
    };

    res.json({ comments: comments.map(formatComment) });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/posts/:postId/comments
router.post(
  '/:postId/comments',
  auth,
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const post = await Post.findByPk(req.params.postId);
      if (!post) {
        return res.status(404).json({ error: 'Post not found.' });
      }

      const comment = await Comment.create({
        post_id: post.id,
        user_id: req.user.id,
        content: req.body.content,
        parent_id: req.body.parent_id || null,
      });

      // Notification to post author (if not self)
      if (post.user_id !== req.user.id && !req.body.parent_id) {
        await Notification.create({
          user_id: post.user_id,
          type: 'comment',
          reference_id: post.id,
          from_user_id: req.user.id,
          message: `${req.user.display_name || req.user.username} commented on your post.`,
        });
      }

      // Notification to parent comment author if it's a reply
      if (req.body.parent_id) {
        const parentComment = await Comment.findByPk(req.body.parent_id);
        if (parentComment && parentComment.user_id !== req.user.id) {
          await Notification.create({
            user_id: parentComment.user_id,
            type: 'comment',
            reference_id: post.id,
            from_user_id: req.user.id,
            message: `${req.user.display_name || req.user.username} replied to your comment.`,
          });
        }
      }

      // Handle mentions
      const mentionRegex = /@([a-zA-Z0-9_]+)/g;
      const mentions = [...req.body.content.matchAll(mentionRegex)].map(m => m[1]);
      if (mentions.length > 0) {
        const mentionedUsers = await User.findAll({ where: { username: mentions } });
        for (const mUser of mentionedUsers) {
          if (mUser.id !== req.user.id) {
            await Notification.create({
              user_id: mUser.id,
              type: 'mention',
              reference_id: post.id,
              from_user_id: req.user.id,
              message: `${req.user.display_name || req.user.username} mentioned you in a comment.`,
            });
          }
        }
      }

      const fullComment = await Comment.findByPk(comment.id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
          { model: CommentLike, as: 'likes' },
          { model: Comment, as: 'replies' },
        ],
      });
      
      const cJson = fullComment.toJSON();
      cJson.likeCount = 0;
      cJson.isLiked = false;
      cJson.replies = [];
      delete cJson.likes;

      res.status(201).json({ comment: cJson });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// PUT /api/comments/:id
router.put(
  '/:id',
  auth,
  [body('content').trim().notEmpty().withMessage('Comment content is required')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const comment = await Comment.findByPk(req.params.id);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found.' });
      }
      if (comment.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to edit this comment.' });
      }

      await comment.update({ content: req.body.content });

      const fullComment = await Comment.findByPk(comment.id, {
        include: [
          { model: User, as: 'author', attributes: ['id', 'username', 'display_name', 'avatar_url'] },
          { model: CommentLike, as: 'likes' },
        ],
      });
      
      const cJson = fullComment.toJSON();
      cJson.likeCount = cJson.likes ? cJson.likes.length : 0;
      cJson.isLiked = cJson.likes ? cJson.likes.some(l => l.user_id === req.user.id) : false;
      delete cJson.likes;

      res.json({ comment: cJson });
    } catch (error) {
      console.error('Edit comment error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  }
);

// DELETE /api/comments/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findByPk(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this comment.' });
    }

    await comment.destroy();
    res.json({ message: 'Comment deleted successfully.' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
