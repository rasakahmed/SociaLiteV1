import './Skeleton.css';

export function SkeletonBox({ width, height, borderRadius = '8px', style = {} }) {
  return (
    <div
      className="skeleton-box"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SkeletonText({ lines = 3, lastWidth = '60%' }) {
  return (
    <div className="skeleton-text">
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            width: i === lines - 1 ? lastWidth : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function PostCardSkeleton() {
  return (
    <div className="skeleton-post-card">
      <div className="skeleton-post-header">
        <SkeletonBox width="42px" height="42px" borderRadius="50%" />
        <div className="skeleton-author-info">
          <SkeletonBox width="120px" height="14px" />
          <SkeletonBox width="80px" height="12px" />
        </div>
      </div>
      <div className="skeleton-post-body">
        <SkeletonText lines={2} lastWidth="75%" />
      </div>
      <div className="skeleton-post-actions">
        <SkeletonBox width="60px" height="32px" borderRadius="10px" />
        <SkeletonBox width="60px" height="32px" borderRadius="10px" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="skeleton-profile">
      <div className="skeleton-cover">
        <SkeletonBox width="100%" height="160px" borderRadius="0" />
      </div>
      <div className="skeleton-profile-info">
        <SkeletonBox width="100px" height="100px" borderRadius="50%" />
        <div className="skeleton-profile-details">
          <SkeletonBox width="180px" height="20px" />
          <SkeletonBox width="120px" height="14px" />
          <SkeletonBox width="240px" height="14px" />
        </div>
      </div>
    </div>
  );
}

export function FriendCardSkeleton() {
  return (
    <div className="skeleton-friend-card">
      <SkeletonBox width="60px" height="60px" borderRadius="50%" />
      <SkeletonBox width="80px" height="14px" />
      <SkeletonBox width="60px" height="12px" />
    </div>
  );
}

export function SuggestionCardSkeleton() {
  return (
    <div className="skeleton-suggestion-card">
      <SkeletonBox width="48px" height="48px" borderRadius="50%" />
      <div className="skeleton-suggestion-info">
        <SkeletonBox width="100px" height="14px" />
        <SkeletonBox width="70px" height="12px" />
      </div>
    </div>
  );
}
