/**
 * 알람 서비스 클래스
 * 브라우저 알림, 소리, 배지, 타이틀 깜빡임 등 모든 알람 기능 통합
 */
class NotificationService {
  constructor() {
    /** 알림 권한 상태 */
    this.permission = 'default';

    /** 알림음 객체 */
    this.notificationSound = null;

    /** 원본 페이지 타이틀 */
    this.originalTitle = document.title;

    /** 타이틀 깜빡임 인터벌 ID */
    this.titleBlinkInterval = null;

    /** 읽지 않은 메시지 수 */
    this.unreadCount = 0;

    /** 사용자별 읽지 않은 메시지 카운트 */
    this.unreadByUser = {};

    /** 알림음 활성화 여부 */
    this.soundEnabled = true;

    /** 데스크톱 알림 활성화 여부 */
    this.desktopNotificationEnabled = true;

    this.initNotificationSound();
  }

  /**
   * 알림음 초기화
   */
  initNotificationSound() {
    // 간단한 알림음 (data URL 방식)
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 대체: 간단한 beep 소리 생성
    this.playBeep = () => {
      if (!this.soundEnabled) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };
  }

  /**
   * 브라우저 알림 권한 요청
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('이 브라우저는 데스크톱 알림을 지원하지 않습니다.');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  /**
   * 데스크톱 알림 표시
   * @param {string} title - 알림 제목
   * @param {string} body - 알림 내용
   * @param {string} icon - 알림 아이콘 URL
   */
  showDesktopNotification(title, body, icon = null) {
    if (!this.desktopNotificationEnabled) return;

    if (this.permission === 'granted') {
      const notification = new Notification(title, {
        body: body,
        icon: icon,
        badge: icon,
        tag: 'chat-message',
        requireInteraction: false,
      });

      // 3초 후 자동 닫기
      setTimeout(() => notification.close(), 3000);

      // 알림 클릭 시 창 포커스
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }

  /**
   * 알림음 재생
   */
  playSound() {
    if (this.soundEnabled && this.playBeep) {
      try {
        this.playBeep();
      } catch (error) {
        console.error('알림음 재생 실패:', error);
      }
    }
  }

  /**
   * 읽지 않은 메시지 수 증가
   * @param {string} userId - 메시지를 보낸 사용자 ID
   */
  incrementUnreadCount(userId) {
    this.unreadCount++;
    this.unreadByUser[userId] = (this.unreadByUser[userId] || 0) + 1;
    this.updateTitle();
  }

  /**
   * 특정 사용자의 읽지 않은 메시지 수 초기화
   * @param {string} userId - 사용자 ID
   */
  clearUnreadForUser(userId) {
    const userUnread = this.unreadByUser[userId] || 0;
    this.unreadCount -= userUnread;
    delete this.unreadByUser[userId];

    if (this.unreadCount <= 0) {
      this.unreadCount = 0;
      this.stopTitleBlink();
    } else {
      this.updateTitle();
    }
  }

  /**
   * 모든 읽지 않은 메시지 초기화
   */
  clearAllUnread() {
    this.unreadCount = 0;
    this.unreadByUser = {};
    this.stopTitleBlink();
  }

  /**
   * 특정 사용자의 읽지 않은 메시지 수 조회
   * @param {string} userId - 사용자 ID
   * @returns {number} 읽지 않은 메시지 수
   */
  getUnreadCountForUser(userId) {
    return this.unreadByUser[userId] || 0;
  }

  /**
   * 전체 읽지 않은 메시지 수 조회
   * @returns {number} 읽지 않은 메시지 수
   */
  getTotalUnreadCount() {
    return this.unreadCount;
  }

  /**
   * 페이지 타이틀 업데이트
   */
  updateTitle() {
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) ${this.originalTitle}`;
      this.startTitleBlink();
    } else {
      document.title = this.originalTitle;
      this.stopTitleBlink();
    }
  }

  /**
   * 타이틀 깜빡임 시작
   */
  startTitleBlink() {
    if (this.titleBlinkInterval) return;

    let showUnread = true;
    this.titleBlinkInterval = setInterval(() => {
      if (showUnread) {
        document.title = `🔔 새 메시지 (${this.unreadCount})`;
      } else {
        document.title = this.originalTitle;
      }
      showUnread = !showUnread;
    }, 1000);
  }

  /**
   * 타이틀 깜빡임 중지
   */
  stopTitleBlink() {
    if (this.titleBlinkInterval) {
      clearInterval(this.titleBlinkInterval);
      this.titleBlinkInterval = null;
    }
    document.title = this.originalTitle;
  }

  /**
   * 새 메시지 알림 (모든 알람 기능 통합)
   * @param {string} senderName - 발신자 이름
   * @param {string} senderId - 발신자 ID
   * @param {string} messageContent - 메시지 내용
   * @param {boolean} isWindowFocused - 창이 포커스 상태인지
   */
  notifyNewMessage(senderName, senderId, messageContent, isWindowFocused = false) {
    // 창이 포커스 상태가 아닐 때만 알림
    if (!isWindowFocused) {
      // 1. 데스크톱 알림
      this.showDesktopNotification(
        `${senderName}님의 새 메시지`,
        messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent
      );

      // 2. 알림음 재생
      this.playSound();

      // 3. 읽지 않은 메시지 수 증가
      this.incrementUnreadCount(senderId);
    }
  }

  /**
   * 알림음 토글
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  /**
   * 데스크톱 알림 토글
   */
  toggleDesktopNotification() {
    this.desktopNotificationEnabled = !this.desktopNotificationEnabled;
    return this.desktopNotificationEnabled;
  }

  /**
   * 알림음 활성화 상태 조회
   */
  isSoundEnabled() {
    return this.soundEnabled;
  }

  /**
   * 데스크톱 알림 활성화 상태 조회
   */
  isDesktopNotificationEnabled() {
    return this.desktopNotificationEnabled;
  }

  /**
   * 창 포커스 시 처리
   */
  onWindowFocus() {
    // 타이틀 깜빡임만 중지 (읽지 않은 메시지는 유지)
    if (this.titleBlinkInterval) {
      this.stopTitleBlink();
      if (this.unreadCount > 0) {
        document.title = `(${this.unreadCount}) ${this.originalTitle}`;
      }
    }
  }

  /**
   * 리소스 정리
   */
  cleanup() {
    this.stopTitleBlink();
    this.clearAllUnread();
  }
}

export default new NotificationService();
