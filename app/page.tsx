'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

type GameState = 'start' | 'countdown' | 'playing' | 'result';

// 랜덤으로 선택될 문장 목록
const TARGET_SENTENCES = [
  '차앤박 더마앤서 액티브 부스트 PDRN 앰플',
];

// 테스트 모드: true로 설정하면 도전권 제한이 비활성화됩니다
const TEST_MODE = false;

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('start');
  const [countdown, setCountdown] = useState(3);
  const [input, setInput] = useState('');
  const [time, setTime] = useState(0);
  const [isError, setIsError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [finalTime, setFinalTime] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [copyText, setCopyText] = useState('');
  const [currentSentence, setCurrentSentence] = useState<string>('');
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const copyInputRef = useRef<HTMLInputElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const isPasteEventRef = useRef<boolean>(false);
  const isStopwatchStartedRef = useRef<boolean>(false);

  // 유저 ID 가져오기 또는 생성
  const getOrCreateUserId = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    let storedUserId = localStorage.getItem('challengersUserId');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('challengersUserId', storedUserId);
    }
    return storedUserId;
  }, []);

  // 유저 초기화
  const initializeUser = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/user/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      const data = await response.json();
      if (data.userId) {
        setUserId(data.userId);
        setTickets(data.tickets);
        setIsCompleted(data.isCompleted);
      }
    } catch (error) {
      console.error('Failed to initialize user:', error);
    }
  }, []);

  // URL 파라미터에서 추천인 처리
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get('ref');
    const currentUserId = getOrCreateUserId();

    if (currentUserId) {
      initializeUser(currentUserId);

      // 추천인 처리
      if (refId && refId !== currentUserId) {
        fetch('/api/referral/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referrerId: refId,
            referredId: currentUserId,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              // URL에서 ref 파라미터 제거
              window.history.replaceState({}, '', window.location.pathname);
              // 현재 유저의 tickets 다시 조회 (피초대자는 기본 1개)
              initializeUser(currentUserId);
            }
          })
          .catch((error) => {
            console.error('Failed to process referral:', error);
          });
      }
    }
  }, [getOrCreateUserId, initializeUser]);

  // 게임 시작
  const handleStart = () => {
    if (!TEST_MODE && tickets <= 0) {
      alert('도전권이 없습니다. 링크를 공유하여 재도전 기회를 얻으세요!');
      return;
    }

    // 랜덤으로 문장 선택
    const randomIndex = Math.floor(Math.random() * TARGET_SENTENCES.length);
    const selectedSentence = TARGET_SENTENCES[randomIndex];
    setCurrentSentence(selectedSentence);

    // 스탑워치 리셋
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    isStopwatchStartedRef.current = false;

    setGameState('countdown');
    setCountdown(3);
    setInput('');
    setTime(0);
    setIsError(false);
  };

  // 카운트다운
  useEffect(() => {
    if (gameState === 'countdown') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setGameState('playing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [gameState]);

  // iOS 감지 (더 정확한 방법)
  const isIOS = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    
    // iOS 디바이스 감지 (더 포괄적인 방법)
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || 
                       (platform === 'MacIntel' && navigator.maxTouchPoints > 1) || // iPadOS 13+
                       /iPhone|iPad|iPod|iOS/i.test(ua);
    
    return isIOSDevice && !(window as any).MSStream;
  }, []);

  // Android 디바이스 감지
  const isAndroid = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent;
    return /Android/i.test(ua);
  }, []);

  // 카운트다운이 끝나고 게임이 시작될 때 포커스 (iOS 제외)
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      const textarea = inputRef.current;
      
      // iOS가 아닌 브라우저에서만 자동 포커스 (Android Chrome 등)
      // iOS에서는 자동 키보드 올리기가 불가능하므로 사용자가 직접 터치해야 함
      if (!isIOS) {
        textarea.focus();
        
        // 안정적인 포커스를 위해 한 번 더 시도
        const timer = setTimeout(() => {
          if (textarea) {
            textarea.focus();
          }
        }, 100);
        
        return () => clearTimeout(timer);
      }
    }
  }, [gameState, isIOS]);

  // 스탑워치 시작 함수
  const startStopwatch = useCallback(() => {
    if (isStopwatchStartedRef.current) {
      return; // 이미 시작됨
    }
    if (gameState !== 'playing') {
      return; // 게임이 진행 중이 아님
    }
    
    isStopwatchStartedRef.current = true;
    intervalRef.current = setInterval(() => {
      setTime((prev) => prev + 0.01);
    }, 10);
  }, [gameState]);

  // iOS에서 텍스트 박스 터치/포커스 시 스탑워치 시작 핸들러
  const handleIOSStart = useCallback((e?: React.SyntheticEvent) => {
    // iOS에서만 작동
    if (!isIOS) return;
    
    // 게임이 진행 중이고 스탑워치가 아직 시작되지 않았을 때만
    if (gameState === 'playing' && !isStopwatchStartedRef.current) {
      startStopwatch();
    }
    
    // iOS에서 키보드가 올라올 때 스크롤 방지
    // 현재 스크롤 위치 저장 후 복원
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    
    // 키보드가 올라온 후 스크롤 위치 복원 (여러 타이밍에 시도)
    requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
    });
    setTimeout(() => {
      window.scrollTo(scrollX, scrollY);
    }, 50);
    setTimeout(() => {
      window.scrollTo(scrollX, scrollY);
    }, 100);
    setTimeout(() => {
      window.scrollTo(scrollX, scrollY);
    }, 300);
  }, [isIOS, gameState, startStopwatch]);

  // 스탑워치 (iOS가 아닌 경우에만 자동 시작)
  useEffect(() => {
    if (gameState === 'playing') {
      // iOS가 아닌 경우에만 즉시 시작
      if (!isIOS) {
        startStopwatch();
      }
      // iOS는 텍스트 박스 터치 시 시작됨

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        isStopwatchStartedRef.current = false;
      };
    } else {
      // 게임이 끝나면 스탑워치 리셋
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      isStopwatchStartedRef.current = false;
    }
  }, [gameState, isIOS, startStopwatch]);

  // iOS에서 textarea에 직접 이벤트 리스너 추가 (더 확실한 방법)
  useEffect(() => {
    if (!isIOS || !inputRef.current) return;

    const textarea = inputRef.current;
    
    // 스크롤 위치 복원 함수
    const preventScrollOnKeyboard = () => {
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 50);
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 100);
      setTimeout(() => {
        window.scrollTo(scrollX, scrollY);
      }, 300);
    };
    
    // iOS에서 스탑워치 시작을 위한 이벤트 리스너
    const handleTouchStart = () => {
      if (gameState === 'playing' && !isStopwatchStartedRef.current) {
        startStopwatch();
      }
      preventScrollOnKeyboard();
    };

    const handleFocus = () => {
      if (gameState === 'playing' && !isStopwatchStartedRef.current) {
        startStopwatch();
      }
      preventScrollOnKeyboard();
    };

    const handleInput = () => {
      if (gameState === 'playing' && !isStopwatchStartedRef.current) {
        startStopwatch();
      }
    };

    // 이벤트 리스너 추가
    textarea.addEventListener('touchstart', handleTouchStart, { passive: true });
    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('input', handleInput);

    return () => {
      textarea.removeEventListener('touchstart', handleTouchStart);
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('input', handleInput);
    };
  }, [isIOS, gameState, startStopwatch]);

  // 입력 처리 (iOS Safari 호환)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLTextAreaElement>) => {
    if (gameState !== 'playing') return;

    // iOS에서 첫 입력 시 스탑워치 시작
    if (isIOS && !isStopwatchStartedRef.current && gameState === 'playing') {
      startStopwatch();
    }

    const target = e.target as HTMLTextAreaElement;
    const value = target.value;
    const previousLength = input.length;
    const newLength = value.length;

    // 붙여넣기 감지: 실제 paste 이벤트가 발생했을 때만 처리
    if (isPasteEventRef.current) {
      // 이벤트 차단
      e.preventDefault();
      e.stopPropagation();
      
      // iOS Safari 호환을 위해 ref로 직접 DOM 조작
      if (inputRef.current) {
        // 즉시 값 초기화
        inputRef.current.value = '';
        // iOS Safari에서 포커스 유지
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // 추가로 값이 남아있을 경우 다시 초기화
            if (inputRef.current.value) {
              inputRef.current.value = '';
            }
          }
        }, 0);
      }
      // 상태 초기화
      setInput('');
      setIsError(false);
      // 플래그 리셋
      isPasteEventRef.current = false;
      alert('복사-붙여넣기는 사용할 수 없습니다. 직접 입력해주세요.');
      return;
    }

    // Android에서 키보드 툴바를 통한 붙여넣기 차단
    // 한 번에 2글자 이상이 입력되면 붙여넣기로 간주하고 차단
    if (isAndroid && newLength - previousLength > 1) {
      // 이벤트 차단
      e.preventDefault();
      e.stopPropagation();
      
      // 값 초기화
      if (inputRef.current) {
        inputRef.current.value = input; // 이전 값으로 복원
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // 추가로 값이 변경되었을 경우 다시 복원
            if (inputRef.current.value !== input) {
              inputRef.current.value = input;
            }
          }
        }, 0);
      }
      alert('복사-붙여넣기는 사용할 수 없습니다. 직접 입력해주세요.');
      return;
    }

    // 일반 입력 처리
    setInput(value);

    // 오타 감지
    const isCorrect = currentSentence.startsWith(value);
    setIsError(!isCorrect);

    // 완료 체크
    if (value === currentSentence) {
      handleComplete();
    }
  };

  // 게임 완료
  const handleComplete = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setFinalTime(time);
    setGameState('result');

    // 도전권 차감 및 완료 상태 업데이트
    if (userId) {
      try {
        // 테스트 모드가 아닐 때만 tickets 차감
        if (!TEST_MODE) {
          await fetch('/api/user/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
          });
          setTickets((prev) => Math.max(0, prev - 1));
        }

        // 완료 상태 업데이트
        await fetch('/api/user/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        }).catch(() => {
          // API가 없어도 무시
        });

        setIsCompleted(true);
      } catch (error) {
        console.error('Failed to update user:', error);
      }
    }
  };


  // 텍스트 박스 높이를 텍스트에 맞게 조정
  useEffect(() => {
    if (inputRef.current && currentSentence && gameState === 'playing') {
      const textarea = inputRef.current;
      
      // 초기 높이를 리셋
      textarea.style.height = 'auto';
      
      // 텍스트의 실제 높이 측정을 위해 스크롤 높이 사용
      const scrollHeight = textarea.scrollHeight;
      
      // 최소 높이 설정 (한 줄 높이 + padding)
      const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 24;
      const padding = 32; // p-4 = 16px * 2
      const minHeight = lineHeight + padding;
      
      // 텍스트 높이에 맞춰 조정 (최소 높이 보장)
      textarea.style.height = Math.max(scrollHeight, minHeight) + 'px';
    }
  }, [currentSentence, gameState, input]);

  // 모달이 열릴 때 body 스크롤 막기 (모든 브라우저 호환)
  useEffect(() => {
    const isModalOpen = showShareModal || showCopyModal || showRewardModal;
    
    if (isModalOpen) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      // iOS Safari를 위한 추가 스타일
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 모달이 닫힐 때 스크롤 복원
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showShareModal, showCopyModal, showRewardModal]);

  // 공유 URL 생성
  const getShareUrl = () => {
    if (typeof window === 'undefined' || !userId) return '';
    return `${window.location.origin}?ref=${userId}`;
  };

  // 공유 텍스트 생성 (URL 포함 - 복사용)
  const getShareText = () => {
    const shareUrl = getShareUrl();
    return `문장을 따라쓰고 1만 원을 받아가세요
빠르게 쓸수록 보상이 더 커져요!
${shareUrl}`;
  };

  // 공유 텍스트 생성 (URL 제외 - 네이티브 공유 시트용)
  const getShareTextWithoutUrl = () => {
    return `문장을 따라쓰고 1만 원을 받아가세요
빠르게 쓸수록 보상이 더 커져요!`;
  };

  // 링크 복사 (모든 브라우저 호환)
  const copyLink = async (text?: string) => {
    const textToCopy = text || getShareUrl();

    // 방법 1: Clipboard API 시도 (Chrome, Firefox, Safari 13.1+)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        alert('링크가 복사되었습니다!');
        return true;
      } catch (error) {
        // Clipboard API 실패 시 fallback으로 진행
        console.log('Clipboard API failed, trying fallback:', error);
      }
    }

    // 방법 2: execCommand fallback (구형 브라우저, iOS Safari)
    try {
      // iOS Safari를 위한 개선된 방법
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      
      // iOS Safari에서 선택이 잘 되도록 스타일 조정
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';
      textarea.setAttribute('readonly', '');
      textarea.setAttribute('aria-hidden', 'true');
      
      document.body.appendChild(textarea);
      
      // iOS Safari에서 작동하도록 다양한 방법 시도
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        // iOS에서는 contentEditable div 사용
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textarea.setSelectionRange(0, 99999);
      } else {
        textarea.select();
        textarea.setSelectionRange(0, 99999);
      }
      
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      
      if (success) {
        alert('링크가 복사되었습니다!');
        return true;
      }
    } catch (error) {
      console.error('execCommand copy failed:', error);
    }

    // 방법 3: 수동 복사 모달 표시 (모든 방법 실패 시)
    setCopyText(textToCopy);
    setShowCopyModal(true);
    setTimeout(() => {
      if (copyInputRef.current) {
        copyInputRef.current.select();
        copyInputRef.current.setSelectionRange(0, 99999);
        // iOS Safari를 위한 추가 시도
        if (navigator.userAgent.match(/ipad|iphone/i)) {
          copyInputRef.current.focus();
        }
      }
    }, 100);
    return false;
  };

  // 공유 처리 (네이티브 공유 시트 우선 사용)
  const handleShare = async () => {
    const shareUrl = getShareUrl();
    
    // Safari 감지 (iOS Safari, macOS Safari)
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                     /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Safari의 경우 text에 URL을 포함시켜야 복사 시 링크도 함께 복사됨
    // 다른 브라우저는 text와 url을 별도로 전달 (플랫폼이 자동으로 처리)
    const shareText = isSafari ? getShareText() : getShareTextWithoutUrl();
    const shareData: { title: string; text: string; url?: string } = {
      title: '챌린저스 따라쓰기 챌린지',
      text: shareText,
    };
    
    // Safari가 아닌 경우에만 url을 별도로 전달
    if (!isSafari) {
      shareData.url = shareUrl;
    }

    // Web Share API 지원 확인 (모바일 iOS Safari, Android Chrome 등)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        // 공유 성공 (사용자가 공유 채널 선택 완료)
        return;
      } catch (error) {
        // 사용자가 공유를 취소한 경우 (AbortError)
        if ((error as Error).name === 'AbortError') {
          return; // 사용자가 취소했으므로 아무것도 하지 않음
        }
        // 다른 에러 발생 시 fallback으로 진행
        console.error('Share failed:', error);
      }
    }

    // Web Share API를 지원하지 않거나 실패한 경우: 커스텀 모달 표시
    setShowShareModal(true);
  };

  // 공유 모달에서 메시지와 링크 복사
  const handleKakaoShare = async () => {
    const shareText = getShareText();
    const success = await copyLink(shareText);
    // 복사 성공 시에만 모달 닫기 (실패 시 수동 복사 모달이 표시됨)
    if (success) {
      setShowShareModal(false);
    }
  };

  // 시간에 따라 표시할 지폐 이미지 결정
  const getBillImage = (currentTime: number): string | null => {
    if (currentTime < 6) {
      return '/10000.png';
    } else if (currentTime < 8) {
      return '/5000.png';
    } else if (currentTime < 10) {
      return '/1000.png';
    } else {
      return '/500.png';
    }
  };

  // 시간에 따라 표시할 문구 결정 (게임 플레이 중)
  const getBillMessage = (currentTime: number): string => {
    if (currentTime < 6) {
      return '지금 성공하면 만 원이에요!';
    } else if (currentTime < 8) {
      return '5천 원도 나쁘지 않아요!';
    } else if (currentTime < 10) {
      return '아쉽지만 천 원이라도...';
    } else {
      return '오백 원도 돈이랍니다...!';
    }
  };

  // 시간에 따라 표시할 문구 결정 (기록 화면)
  const getResultMessage = (currentTime: number): string => {
    if (currentTime < 6) {
      return '만 원 리워드를 받을 수 있어요!';
    } else if (currentTime < 8) {
      return '5천 원 리워드를 받을 수 있어요!';
    } else if (currentTime < 10) {
      return '천 원 리워드를 받을 수 있어요!';
    } else {
      return '오백 원도 리워드를 받을 수 있어요!';
    }
  };

  // 시간에 따라 리워드 금액 결정 (숫자 형식)
  const getReward = (currentTime: number): string => {
    if (currentTime < 6) {
      return '10000';
    } else if (currentTime < 8) {
      return '5000';
    } else if (currentTime < 10) {
      return '1000';
    } else {
      return '500';
    }
  };

  // 리워드 받기 링크 생성
  const getRewardLink = (currentTime: number): string => {
    const reward = getReward(currentTime);
    const baseUrl = 'https://tally.so/r/NplZ6l';
    // 사용자 요청 형식에 맞춰 &로 시작 (실제로는 ?가 맞지만 요청대로 구현)
    const params = new URLSearchParams({
      utm_source: 'viral',
      utm_campaign: 'speed-type',
      utm_content: userId || '',
      utm_term: reward,
    });
    // 일반적인 URL 형식으로 수정 (?로 시작)
    return `${baseUrl}?${params.toString()}`;
  };

  // 리워드 받기 버튼 클릭
  const handleRewardClick = () => {
    setShowRewardModal(true);
  };

  // 리워드 받기 확인
  const handleRewardConfirm = () => {
    if (finalTime !== null) {
      const link = getRewardLink(finalTime);
      window.open(link, '_blank');
      setShowRewardModal(false);
    }
  };

  // 리워드 받기 취소
  const handleRewardCancel = () => {
    setShowRewardModal(false);
  };

  // 재도전
  const handleRetry = () => {
    if (!TEST_MODE && tickets <= 0) {
      alert('도전권이 없습니다. 링크를 공유하여 재도전 기회를 얻으세요!');
      return;
    }
    // 재도전 시에도 새로운 랜덤 문장 선택
    const randomIndex = Math.floor(Math.random() * TARGET_SENTENCES.length);
    const selectedSentence = TARGET_SENTENCES[randomIndex];
    setCurrentSentence(selectedSentence);
    setGameState('start');
    setInput('');
    setTime(0);
    setFinalTime(null);
    setIsError(false);
  };

  return (
    <div className={`min-h-screen bg-white flex ${gameState === 'playing' ? 'items-start pt-3 pb-1 md:items-center md:py-5' : 'items-center'} justify-center px-3 md:px-5`}>
      <div className="container mx-auto max-w-2xl w-full">
        {gameState === 'start' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 animate-fadeIn">
            <div className="flex justify-center mb-4">
              <img
                src="/logo_challengers.png"
                alt="챌린저스 로고"
                className="h-10 md:h-10 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-center text-[#F93B4E] mb-2">
              따라쓰기 챌린지
            </h1>
            <p className="text-center text-gray-600 mb-8">
              주어진 문장을 정확히 따라 쓰세요.
              <br />
              성공하면 최대 1만 원을 드려요!
            </p>
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-2">남은 도전권</p>
              <p className="text-2xl font-bold text-[#F93B4E]">{tickets}개</p>
            </div>
            <button
              onClick={handleStart}
              disabled={!TEST_MODE && tickets <= 0}
              className="w-full bg-[#F93B4E] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#d83242] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!TEST_MODE && tickets <= 0 ? '도전권이 없습니다' : '시작하기'}
            </button>
          </div>
        )}

        {/* 카운트다운 화면 */}
        {gameState === 'countdown' && (
          <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
            <div className="text-center">
              <div className="text-9xl font-bold text-[#F93B4E] animate-countdown">
                {countdown}
              </div>
            </div>
          </div>
        )}

        {/* 게임 플레이 화면 */}
        {gameState === 'playing' && (
          <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 ${isIOS ? 'pb-2' : 'pb-2 md:pb-6'} animate-fadeIn`}>
            <div className="text-center mb-4 md:mb-6">
              <div className="text-3xl font-bold text-[#F93B4E] mb-2">
                {time.toFixed(2)}초
              </div>
            </div>
            <div className="mb-2 md:mb-6">
              {/* 지폐 이미지 애니메이션 */}
              {getBillImage(time) && (
                <div className="relative mb-4 flex flex-col items-center justify-center overflow-visible">
                  <div className="h-32 flex items-center justify-center">
                    <img
                      src={getBillImage(time)!}
                      alt="지폐"
                      className="max-h-24 md:max-h-32 w-auto"
                      style={{
                        filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
                        animation: 'float 2.5s ease-in-out infinite',
                        willChange: 'transform',
                      }}
                    />
                  </div>
                  <p className="text-sm md:text-base text-gray-600 mt-2 font-medium">
                    {getBillMessage(time)}
                  </p>
                </div>
              )}
            </div>
            <p className="text-base md:text-lg font-semibold text-gray-900 mb-4 leading-relaxed text-center">
              {currentSentence}
            </p>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onInput={handleInputChange}
                onFocus={handleIOSStart}
                onTouchStart={handleIOSStart}
                onMouseDown={handleIOSStart}
                onClick={handleIOSStart}
                onPaste={(e) => {
                  e.preventDefault();
                  // paste 이벤트 플래그 설정
                  isPasteEventRef.current = true;
                  // 값 초기화
                  if (inputRef.current) {
                    inputRef.current.value = '';
                  }
                  setInput('');
                  setIsError(false);
                  alert('복사-붙여넣기는 사용할 수 없습니다. 직접 입력해주세요.');
                }}
                onCopy={(e) => {
                  e.preventDefault();
                }}
                onCut={(e) => {
                  e.preventDefault();
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                }}
                className={`w-full p-4 border-2 rounded-xl text-sm md:text-base resize-none focus:outline-none transition-colors relative z-10 bg-transparent ${
                  isError
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-[#F93B4E]'
                }`}
                style={{
                  color: isError ? '#ef4444' : '#111827',
                  minHeight: 'auto',
                  height: 'auto',
                  fontSize: '16px', // iOS Safari에서 자동 줌 방지 (16px 미만이면 줌됨)
                }}
              />
              {input.length === 0 && (
                <div 
                  className="absolute top-0 left-0 w-full p-4 text-sm md:text-base text-gray-300 pointer-events-none z-0 whitespace-pre-wrap"
                  style={{
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    lineHeight: 'inherit',
                    letterSpacing: 'inherit',
                  }}
                >
                  {currentSentence}
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'result' && finalTime !== null && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 animate-fadeIn">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                축하드려요!
              </h2>
              {/* 지폐 이미지 */}
              {getBillImage(finalTime) && (
                <div className="mb-6 flex flex-col items-center justify-center">
                  <img
                    src={getBillImage(finalTime)!}
                    alt="지폐"
                    className="max-h-32 md:max-h-40 w-auto mb-2"
                    style={{
                      filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.15))',
                    }}
                  />
                  <p className="text-sm text-gray-600 font-medium">
                    {getResultMessage(finalTime)}
                  </p>
                </div>
              )}
              <div className="mb-6">
                <p className="text-sm text-gray-500 mb-2">기록</p>
                <p className="text-4xl font-bold text-[#F93B4E]">
                  {finalTime.toFixed(2)}초
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRewardClick}
                className="w-full bg-[#F93B4E] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#d83242] active:scale-[0.98] transition-all duration-200"
              >
                리워드 받기
              </button>
              <button
                onClick={handleShare}
                className="w-full bg-blue-500 text-white py-4 rounded-xl font-semibold text-lg hover:bg-blue-600 active:scale-[0.98] transition-all duration-200"
              >
                공유하기
              </button>
              <button
                onClick={handleRetry}
                className="w-full bg-gray-50 text-gray-700 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
              >
                재도전
              </button>
            </div>
          </div>
        )}

        {/* 공유 모달 */}
        {showShareModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-5"
            onClick={(e) => {
              // 모달 외부 클릭 시 닫기
              if (e.target === e.currentTarget) {
                setShowShareModal(false);
              }
            }}
            style={{
              // iOS Safari에서 모달이 제대로 표시되도록 보장
              WebkitOverflowScrolling: 'touch',
              position: 'fixed',
            }}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn shadow-xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                // iOS Safari에서 모달이 스크롤 가능하도록
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">공유하기</h3>
              <p className="text-gray-600 mb-6">
                아래 내용을 복사하여 공유하세요
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleKakaoShare}
                  className="w-full bg-[#F93B4E] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#d83242] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  링크 복사하기
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="w-full bg-gray-50 text-gray-700 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 수동 복사 모달 */}
        {showCopyModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-5"
            onClick={(e) => {
              // 모달 외부 클릭 시 닫기
              if (e.target === e.currentTarget) {
                setShowCopyModal(false);
              }
            }}
            style={{
              // iOS Safari에서 모달이 제대로 표시되도록 보장
              WebkitOverflowScrolling: 'touch',
              position: 'fixed',
            }}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn shadow-xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                // iOS Safari에서 모달이 스크롤 가능하도록
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">링크 복사</h3>
              <p className="text-gray-600 mb-4">
                아래 링크를 선택하여 복사하세요
              </p>
              <input
                ref={copyInputRef}
                type="text"
                value={copyText}
                readOnly
                className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm mb-4 focus:outline-none focus:border-[#F93B4E]"
                onClick={(e) => {
                  const target = e.target as HTMLInputElement;
                  target.select();
                  target.setSelectionRange(0, 99999);
                }}
                onFocus={(e) => {
                  // iOS Safari에서 포커스 시 자동 선택
                  e.target.select();
                  e.target.setSelectionRange(0, 99999);
                }}
              />
              <button
                onClick={() => setShowCopyModal(false)}
                className="w-full bg-[#F93B4E] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#d83242] active:scale-[0.98] transition-all duration-200"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 리워드 받기 모달 */}
        {showRewardModal && finalTime !== null && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-5 animate-fadeIn"
            onClick={(e) => {
              // 모달 외부 클릭 시 닫기
              if (e.target === e.currentTarget) {
                setShowRewardModal(false);
              }
            }}
            style={{
              // iOS Safari에서 모달이 제대로 표시되도록 보장
              WebkitOverflowScrolling: 'touch',
              position: 'fixed',
            }}
          >
            <div 
              className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn shadow-xl"
              onClick={(e) => e.stopPropagation()}
              style={{
                // iOS Safari에서 모달이 스크롤 가능하도록
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">리워드 받기</h3>
              <p className="text-gray-900 mb-2">
                리워드는 한 번만 받을 수 있어요.
              </p>
              <p className="text-gray-900 mb-4">
                이 리워드로 받으시겠어요?
              </p>
              <p className="text-base text-gray-500 mb-6">
                현재 리워드 : {getReward(finalTime)}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleRewardConfirm}
                  className="w-full bg-[#F93B4E] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#d83242] active:scale-[0.98] transition-all duration-200"
                >
                  네, 받을게요
                </button>
                <button
                  onClick={handleRewardCancel}
                  className="w-full bg-gray-50 text-gray-700 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                >
                  아뇨, 다시 도전할래요
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
