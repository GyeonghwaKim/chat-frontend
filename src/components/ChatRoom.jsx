import React, { useState, useEffect } from 'react';
import UserList from './UserList';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import WebSocketService from '../services/WebSocketService';
import NotificationService from '../services/NotificationService';
import './ChatRoom.css';

/**
 * 채팅방 메인 컴포넌트
 */
const ChatRoom = () => {
  /** 현재 사용자 ID */
  const [currentUserId, setCurrentUserId] = useState('');

  /** 온라인 사용자 목록 */
  const [users, setUsers] = useState({});

  /** 선택된 대화 상대 */
  const [selectedUser, setSelectedUser] = useState(null);

  /** 메시지 목록 */
  const [messages, setMessages] = useState([]);

  /** 연결 상태 */
  const [connected, setConnected] = useState(false);

  /** 로그인 여부 */
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  /** 창 포커스 상태 */
  const [isWindowFocused, setIsWindowFocused] = useState(true);

  /** 알림 설정 상태 */
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotificationEnabled, setDesktopNotificationEnabled] = useState(true);

  /** 사용자별 읽지 않은 메시지 수 */
  const [unreadCounts, setUnreadCounts] = useState({});

  // 창 포커스 이벤트 리스너
  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true);
      NotificationService.onWindowFocus();
    };

    const handleBlur = () => {
      setIsWindowFocused(false);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    // 컴포넌트 언마운트 시 연결 해제 및 알람 정리
    return () => {
      if (connected && currentUserId) {
        WebSocketService.disconnect(currentUserId);
      }
      NotificationService.cleanup();
    };
  }, [connected, currentUserId]);

  /**
   * 로그인 처리
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    const userId = e.target.userId.value.trim();

    if (userId) {
      setCurrentUserId(userId);

      // 알림 권한 요청
      await NotificationService.requestPermission();

      // WebSocket 연결
      WebSocketService.connect(
        userId,
        () => {
          setConnected(true);
          setIsLoggedIn(true);
          console.log('채팅 서버에 연결되었습니다.');
        },
        (error) => {
          console.error('연결 실패:', error);
          alert('서버 연결에 실패했습니다. 서버가 실행 중인지 확인해주세요.');
        }
      );

      // 메시지 수신 콜백 등록
      WebSocketService.setOnMessageReceived((message) => {
        setMessages((prev) => [...prev, message]);

        // 자신이 보낸 메시지가 아닐 경우 알람 처리
        if (message.sender !== userId) {
          const senderName = users[message.sender] || message.sender;
          const isCurrentChatActive = selectedUser === message.sender && isWindowFocused;

          // 현재 대화 중인 사용자가 아니거나 창이 포커스 상태가 아니면 알림
          if (!isCurrentChatActive) {
            NotificationService.notifyNewMessage(
              senderName,
              message.sender,
              message.content,
              isCurrentChatActive
            );

            // 읽지 않은 메시지 카운트 업데이트
            setUnreadCounts((prev) => ({
              ...prev,
              [message.sender]: (prev[message.sender] || 0) + 1,
            }));
          }
        }
      });

      // 사용자 목록 업데이트 콜백 등록
      WebSocketService.setOnUsersUpdated((updatedUsers) => {
        setUsers(updatedUsers);
      });
    }
  };

  /**
   * 사용자 선택
   */
  const handleUserSelect = (userId) => {
    setSelectedUser(userId);

    // 읽지 않은 메시지 초기화
    NotificationService.clearUnreadForUser(userId);
    setUnreadCounts((prev) => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });

    // 선택된 사용자와의 대화 필터링
    filterMessagesForUser(userId);
  };

  /**
   * 특정 사용자와의 메시지만 필터링
   */
  const filterMessagesForUser = (userId) => {
    // 실제로는 서버에서 히스토리를 가져와야 하지만,
    // 메모리 기반이므로 현재 세션의 메시지만 필터링
    setMessages((prev) =>
      prev.filter(
        (msg) =>
          (msg.sender === currentUserId && msg.receiver === userId) ||
          (msg.sender === userId && msg.receiver === currentUserId)
      )
    );
  };

  /**
   * 메시지 전송
   */
  const handleSendMessage = (content) => {
    if (selectedUser && content.trim()) {
      const message = {
        content: content,
        sender: currentUserId,
        receiver: selectedUser,
      };

      WebSocketService.sendMessage(message);
    }
  };

  /**
   * 현재 선택된 사용자와의 메시지만 표시
   */
  const getFilteredMessages = () => {
    if (!selectedUser) return [];

    return messages.filter(
      (msg) =>
        (msg.sender === currentUserId && msg.receiver === selectedUser) ||
        (msg.sender === selectedUser && msg.receiver === currentUserId)
    );
  };

  // 로그인 화면
  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2>채팅 로그인</h2>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              name="userId"
              placeholder="사용자 ID를 입력하세요"
              className="login-input"
              required
            />
            <button type="submit" className="login-button">
              입장하기
            </button>
          </form>
        </div>
      </div>
    );
  }

  /**
   * 알림 설정 토글 핸들러
   */
  const handleToggleSound = () => {
    const newState = NotificationService.toggleSound();
    setSoundEnabled(newState);
  };

  const handleToggleDesktopNotification = () => {
    const newState = NotificationService.toggleDesktopNotification();
    setDesktopNotificationEnabled(newState);
  };

  /**
   * 채팅방 나가기
   */
  const handleLeaveRoom = () => {
    if (window.confirm('채팅방을 나가시겠습니까?')) {
      // WebSocket 연결 해제
      if (connected && currentUserId) {
        WebSocketService.disconnect(currentUserId);
      }

      // 알림 정리
      NotificationService.cleanup();

      // 상태 초기화
      setConnected(false);
      setIsLoggedIn(false);
      setCurrentUserId('');
      setUsers({});
      setSelectedUser(null);
      setMessages([]);
      setUnreadCounts({});
    }
  };

  // 채팅 화면
  return (
    <div className="chat-room">
      <div className="chat-header">
        <h2>1:1 채팅</h2>
        <div className="header-controls">
          <div className="user-info">
            <span>현재 사용자: <strong>{currentUserId}</strong></span>
          </div>
          <div className="notification-controls">
            <button
              className={`control-btn ${soundEnabled ? 'active' : ''}`}
              onClick={handleToggleSound}
              title={soundEnabled ? '알림음 끄기' : '알림음 켜기'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
            <button
              className={`control-btn ${desktopNotificationEnabled ? 'active' : ''}`}
              onClick={handleToggleDesktopNotification}
              title={desktopNotificationEnabled ? '데스크톱 알림 끄기' : '데스크톱 알림 켜기'}
            >
              {desktopNotificationEnabled ? '🔔' : '🔕'}
            </button>
          </div>
          <button
            className="leave-btn"
            onClick={handleLeaveRoom}
            title="채팅방 나가기"
          >
            나가기
          </button>
        </div>
      </div>
      <div className="chat-body">
        <UserList
          users={users}
          currentUserId={currentUserId}
          selectedUser={selectedUser}
          onUserSelect={handleUserSelect}
          unreadCounts={unreadCounts}
        />
        <div className="chat-main">
          {selectedUser ? (
            <>
              <div className="chat-with-header">
                <h3>{users[selectedUser]}님과의 대화</h3>
              </div>
              <MessageList
                messages={getFilteredMessages()}
                currentUserId={currentUserId}
              />
              <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!selectedUser}
              />
            </>
          ) : (
            <div className="no-chat-selected">
              왼쪽에서 대화할 사용자를 선택해주세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;
