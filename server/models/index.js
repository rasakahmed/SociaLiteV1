const User = require('./User');
const Post = require('./Post');
const Comment = require('./Comment');
const CommentLike = require('./CommentLike');
const Like = require('./Like');
const FriendRequest = require('./FriendRequest');
const Notification = require('./Notification');
const Report = require('./Report');
const Block = require('./Block');
const PostMedia = require('./PostMedia');
const Message = require('./Message');

// User <-> Message
User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages', onDelete: 'CASCADE' });
User.hasMany(Message, { foreignKey: 'receiver_id', as: 'receivedMessages', onDelete: 'CASCADE' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// User <-> Post
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts', onDelete: 'CASCADE' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Post <-> PostMedia
Post.hasMany(PostMedia, { foreignKey: 'post_id', as: 'media', onDelete: 'CASCADE' });
PostMedia.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

// Post <-> Comment
Post.hasMany(Comment, { foreignKey: 'post_id', as: 'comments', onDelete: 'CASCADE' });
Comment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Comment Threading
Comment.hasMany(Comment, { foreignKey: 'parent_id', as: 'replies', onDelete: 'CASCADE' });
Comment.belongsTo(Comment, { foreignKey: 'parent_id', as: 'parent' });

// Comment <-> CommentLike
Comment.hasMany(CommentLike, { foreignKey: 'comment_id', as: 'likes', onDelete: 'CASCADE' });
CommentLike.belongsTo(Comment, { foreignKey: 'comment_id', as: 'comment' });
User.hasMany(CommentLike, { foreignKey: 'user_id', as: 'commentLikes', onDelete: 'CASCADE' });
CommentLike.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Post <-> Like
Post.hasMany(Like, { foreignKey: 'post_id', as: 'likes', onDelete: 'CASCADE' });
Like.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });
Like.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User <-> FriendRequest
User.hasMany(FriendRequest, { foreignKey: 'sender_id', as: 'sentRequests', onDelete: 'CASCADE' });
User.hasMany(FriendRequest, { foreignKey: 'receiver_id', as: 'receivedRequests', onDelete: 'CASCADE' });
FriendRequest.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
FriendRequest.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// User <-> Notification
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Notification.belongsTo(User, { foreignKey: 'from_user_id', as: 'fromUser' });

// Post <-> Report
Post.hasMany(Report, { foreignKey: 'post_id', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });
Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

// User <-> Block
User.hasMany(Block, { foreignKey: 'blocker_id', as: 'blocks', onDelete: 'CASCADE' });
User.hasMany(Block, { foreignKey: 'blocked_id', as: 'blockedBy', onDelete: 'CASCADE' });
Block.belongsTo(User, { foreignKey: 'blocker_id', as: 'blocker' });
Block.belongsTo(User, { foreignKey: 'blocked_id', as: 'blocked' });

module.exports = {
  User,
  Post,
  PostMedia,
  Comment,
  CommentLike,
  Like,
  FriendRequest,
  Notification,
  Report,
  Block,
  Message,
};
