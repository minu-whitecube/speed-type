'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type GameState = 'start' | 'countdown' | 'playing' | 'result';

// 랜덤으로 선택될 문장 목록
const TARGET_SENTENCES = [
  '차앤박 더마앤서 액티브 부스트 PDRN 앰플',
];

// 테스트 모드: true로 설정하면 도전권 제한이 비활성화됩니다
const TEST_MODE = true;

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

  // 스탑워치
  useEffect(() => {
    if (gameState === 'playing') {
      intervalRef.current = setInterval(() => {
        setTime((prev) => prev + 0.01);
      }, 10);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [gameState]);

  // 입력 처리 (iOS Safari 호환)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLTextAreaElement>) => {
    if (gameState !== 'playing') return;

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

  // 포커스 처리 (iOS 키보드 자동 올리기)
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      // iOS에서 키보드가 올라오도록 약간의 지연 추가
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // iOS Safari에서 확실하게 포커스되도록 클릭 이벤트 시뮬레이션
          inputRef.current.click();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [gameState]);

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

  // 공유 URL 생성
  const getShareUrl = () => {
    if (typeof window === 'undefined' || !userId) return '';
    return `${window.location.origin}?ref=${userId}`;
  };

  // 공유 텍스트 생성
  const getShareText = () => {
    const shareUrl = getShareUrl();
    return `챌린저스 따라쓰기 이벤트에 도전해보세요!${shareUrl}`;
  };

  // 링크 복사
  const copyLink = async (text?: string) => {
    const textToCopy = text || getShareUrl();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        alert('링크가 복사되었습니다!');
        return true;
      } else {
        // iOS Safari fallback
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (success) {
          alert('링크가 복사되었습니다!');
          return true;
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }

    // 수동 복사 모달 표시
    setCopyText(textToCopy);
    setShowCopyModal(true);
    setTimeout(() => {
      copyInputRef.current?.select();
    }, 100);
    return false;
  };

  // 공유 처리
  const handleShare = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isKakaoTalk = typeof navigator !== 'undefined' && /KAKAOTALK|KAKAO/i.test(navigator.userAgent);

    if (isKakaoTalk) {
      // 카카오톡 브라우저에서는 커스텀 모달 표시
      setShowShareModal(true);
      return;
    }

    if (isIOS && navigator.share) {
      try {
        await navigator.share({
          title: '챌린저스 따라쓰기 이벤트',
          text: getShareText(),
        });
        return;
      } catch (error) {
        // 사용자가 취소한 경우
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    }

    // 기본: 클립보드 복사
    copyLink();
  };

  // 카카오톡 공유 모달에서 메시지와 링크 복사
  const handleKakaoShare = () => {
    const shareText = getShareText();
    copyLink(shareText);
    setShowShareModal(false);
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

        {gameState === 'countdown' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="text-9xl font-bold text-[#F93B4E] animate-countdown">
                {countdown}
              </div>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6 pb-2 md:pb-6 animate-fadeIn">
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
              <p className="text-base md:text-lg font-semibold text-gray-900 mb-4 leading-relaxed text-center">
                {currentSentence}
              </p>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onInput={handleInputChange}
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
              {(TEST_MODE || tickets > 0) && (
                <button
                  onClick={handleRetry}
                  className="w-full bg-gray-50 text-gray-700 py-4 rounded-xl font-semibold text-lg hover:bg-gray-100 active:scale-[0.98] transition-all duration-200"
                >
                  재도전
                </button>
              )}
            </div>
          </div>
        )}

        {/* 카카오톡 공유 모달 */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-900 mb-4">공유하기</h3>
              <p className="text-gray-600 mb-6">
                아래 내용을 복사하여 카카오톡 대화방에 붙여넣으세요
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleKakaoShare}
                  className="w-full bg-[#F93B4E] text-white py-4 rounded-xl font-semibold text-lg hover:bg-[#d83242] active:scale-[0.98] transition-all duration-200"
                >
                  메시지와 링크 복사하기
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn">
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
                onClick={(e) => (e.target as HTMLInputElement).select()}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5 animate-fadeIn">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn">
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
