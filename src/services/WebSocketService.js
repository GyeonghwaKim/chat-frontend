import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * WebSocket 연결 및 메시지 통신을 관리하는 서비스 클래스
 */
class WebSocketService {
  constructor() {
    /** STOMP 클라이언트 */
    this.stompClient = null;

    /** 연결 상태 */
    this.connected = false;

    /** 메시지 수신 콜백 함수 */
    this.onMessageReceived = null;

    /** 사용자 목록 업데이트 콜백 함수 */
    this.onUsersUpdated = null;
  }

  /**
   * WebSocket 연결
   * @param {string} userId - 사용자 ID
   * @param {function} onConnected - 연결 성공 콜백
   * @param {function} onError - 연결 실패 콜백
   */
  connect(userId, onConnected, onError) {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws`),
      debug: (str) => {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: (frame) => {
        this.connected = true;
        console.log('Connected: ' + frame);

        // 개인 메시지 구독
        this.stompClient.subscribe(`/queue/messages/${userId}`, (message) => {
          if (this.onMessageReceived) {
            this.onMessageReceived(JSON.parse(message.body));
          }
        });

        // 온라인 사용자 목록 구독
        this.stompClient.subscribe('/topic/users', (message) => {
          if (this.onUsersUpdated) {
            this.onUsersUpdated(JSON.parse(message.body));
          }
        });

        // 접속 알림 전송
        this.stompClient.publish({
          destination: '/app/chat.join',
          body: JSON.stringify({ sender: userId, type: 'JOIN' })
        });

        if (onConnected) {
          onConnected();
        }
      },
      onStompError: (frame) => {
        this.connected = false;
        console.error('Broker reported error: ' + frame.headers['message']);
        console.error('Additional details: ' + frame.body);
        if (onError) {
          onError(frame);
        }
      },
      onWebSocketError: (error) => {
        this.connected = false;
        console.error('WebSocket error:', error);
        if (onError) {
          onError(error);
        }
      }
    });

    this.stompClient.activate();
  }

  /**
   * 메시지 전송
   * @param {object} message - 전송할 메시지 객체
   */
  sendMessage(message) {
    if (this.stompClient && this.connected) {
      this.stompClient.publish({
        destination: '/app/chat.send',
        body: JSON.stringify(message)
      });
    }
  }

  /**
   * WebSocket 연결 해제
   * @param {string} userId - 사용자 ID
   */
  disconnect(userId) {
    if (this.stompClient && this.connected) {
      // 퇴장 알림 전송
      this.stompClient.publish({
        destination: '/app/chat.leave',
        body: JSON.stringify({ sender: userId, type: 'LEAVE' })
      });

      this.stompClient.deactivate();
      this.connected = false;
      console.log('Disconnected');
    }
  }

  /**
   * 메시지 수신 콜백 등록
   * @param {function} callback - 메시지 수신 시 호출될 콜백 함수
   */
  setOnMessageReceived(callback) {
    this.onMessageReceived = callback;
  }

  /**
   * 사용자 목록 업데이트 콜백 등록
   * @param {function} callback - 사용자 목록 업데이트 시 호출될 콜백 함수
   */
  setOnUsersUpdated(callback) {
    this.onUsersUpdated = callback;
  }
}

export default new WebSocketService();
