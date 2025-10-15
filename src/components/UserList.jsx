import React from 'react';
import './UserList.css';

/**
 * 온라인 사용자 목록 컴포넌트
 */
const UserList = ({ users, currentUserId, selectedUser, onUserSelect, unreadCounts = {} }) => {
  return (
    <div className="user-list">
      <h3>온라인 사용자</h3>
      <div className="users">
        {Object.entries(users).map(([userId, username]) => {
          // 현재 사용자는 목록에서 제외
          if (userId === currentUserId) return null;

          const unreadCount = unreadCounts[userId] || 0;

          return (
            <div
              key={userId}
              className={`user-item ${selectedUser === userId ? 'selected' : ''}`}
              onClick={() => onUserSelect(userId)}
            >
              <div className="user-status-indicator"></div>
              <span className="username">{username}</span>
              {unreadCount > 0 && (
                <span className="unread-badge">{unreadCount}</span>
              )}
            </div>
          );
        })}
      </div>
      {Object.keys(users).length <= 1 && (
        <div className="no-users">다른 사용자가 없습니다</div>
      )}
    </div>
  );
};

export default UserList;
