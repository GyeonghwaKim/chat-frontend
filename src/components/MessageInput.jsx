import React, { useState } from 'react';
import './MessageInput.css';

/**
 * 메시지 입력 컴포넌트
 */
const MessageInput = ({ onSendMessage, disabled }) => {
  const [message, setMessage] = useState('');

  /**
   * 메시지 전송 처리
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  /**
   * Enter 키 처리
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? '사용자를 선택해주세요' : '메시지를 입력하세요...'}
        disabled={disabled}
        className="message-input-field"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="send-button"
      >
        전송
      </button>
    </form>
  );
};

export default MessageInput;
