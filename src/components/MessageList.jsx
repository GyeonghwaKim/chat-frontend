import React, { useEffect, useRef } from 'react';
import './MessageList.css';

/**
 * 메시지 목록 컴포넌트
 */
const MessageList = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef(null);

  /**
   * 메시지 목록의 맨 아래로 스크롤
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /**
   * 시간 포맷 (HH:MM)
   */
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="no-messages">메시지가 없습니다. 대화를 시작해보세요!</div>
      ) : (
        messages.map((msg) => {
          const isMine = msg.sender === currentUserId;
          return (
            <div
              key={msg.id}
              className={`message-wrapper ${isMine ? 'mine' : 'other'}`}
            >
              <div className="message-bubble">
                <div className="message-content">{msg.content}</div>
                <div className="message-time">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
