const firebaseConfig = {
  apiKey: "AIzaSyDqltXG91yfWaSsEe_pvMGCL_tz8gkek4c",
  authDomain: "webgimal-4340e.firebaseapp.com",
  databaseURL: "https://webgimal-4340e-default-rtdb.firebaseio.com",
  projectId: "webgimal-4340e",
  storageBucket: "webgimal-4340e.firebasestorage.app",
  messagingSenderId: "1066881654157",
  appId: "1:1066881654157:web:a5da2873254c86e05771c4",
  measurementId: "G-LQ278MS2CF"
};

// Initialize Firebase using compat
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global language state
let currentSelectedLang = localStorage.getItem('preferredLanguage') || 'ko';

const translations = {
  ko: {
    slide1_title: "로봇소프트웨어 학과사이트",
    slide1_desc: "동양미래대학교 로봇소프트웨어공학과의 공식 홈페이지로 바로 이동합니다.",
    slide2_title: "과제 공지",
    slide2_desc: "과제 제출 기한을 확인하고 나의 과제 완료 현황을 손쉽게 확인하세요.",
    slide3_title: "질문 게시판",
    slide3_desc: "공부하다가 막히는 내용이나 학업 질문을 올려 소통하세요.",
    slide4_title: "3D가상세계 월드",
    slide4_desc: "메타버스로 구현된 3D 가상 공간에서 스마트 월드를 경험해보세요.",
    go_to: "바로가기",
    board1_title: "과제 공지",
    board2_title: "질문 게시판",
    services_title: "주요서비스",
    service1_name: "E 서비스",
    service2_name: "원격수업강의",
    service3_name: "3D월드",
    login: "로그인",
    logout: "로그아웃",
    welcome_title: "로봇소프트웨어 D2반을 위한<br>웹사이트입니다!",
    welcome_desc: "과제, 주요 공지, 가상월드의 내용을<br>포함하고 있습니다!",
    confirm: "확인했습니다",
    col_no: "번호",
    col_title: "제목",
    col_complete: "완료",
    col_author: "작성자",
    col_date: "등록일",
    new_assignment_title: "새 과제 등록",
    select_subject: "과목 선택",
    select_subject_placeholder: "과목을 선택해주세요",
    subject_important: "중요 공지",
    subject_win: "윈도우프로그래밍",
    subject_english: "전공영어",
    subject_micro: "마이크로컨트롤러",
    subject_plc: "PLC 프로그래밍",
    subject_web: "웹프로그래밍",
    subject_ai: "인공지능개론",
    input_title: "제목",
    input_content: "내용",
    cancel_btn: "취소",
    submit_btn: "등록하기",
    new_qna_title: "질문 등록",
    select_category: "카테고리 선택",
    select_category_placeholder: "선택해주세요",
    category_homework: "과제",
    category_life: "학교생활",
    category_etc: "기타",
    write_btn: "글쓰기",
    empty_assignment: "등록된 과제 공지가 없습니다.",
    empty_qna: "등록된 질문이 없습니다.",
    task_complete: "과제 완료",
    back_to_list: "목록으로",
    label_author: "작성자",
    label_date: "등록일",
    label_like: "추천",
    label_answers: "답변",
    label_write_btn: "작성",
    delete_btn: "삭제",
    chat_title: "실시간 D2 채팅방",
    chat_live: "LIVE",
    chat_login_prompt: "로그인 후 실시간 채팅에<br>참여해보세요!",
    anonymous_mode: "익명으로 작성",
    attach_image: "이미지 첨부"
  },
  en: {
    slide1_title: "Dept Website",
    slide1_desc: "Go directly to Dongyang Mirae University's Department of Robot Software Engineering official site.",
    slide2_title: "Assignments",
    slide2_desc: "Check submission deadlines and easily view your completed assignments.",
    slide3_title: "Q&A Board",
    slide3_desc: "Post questions about your studies or where you are stuck to communicate.",
    slide4_title: "3D Virtual World",
    slide4_desc: "Experience the smart world in a 3D virtual metaverse workspace.",
    go_to: "Go To",
    board1_title: "Assignments",
    board2_title: "Q&A Board",
    services_title: "Main Services",
    service1_name: "E-Service",
    service2_name: "e-Class",
    service3_name: "3D World",
    login: "Login",
    logout: "Logout",
    welcome_title: "Website for Robot Software<br>Class D2!",
    welcome_desc: "Includes assignments, major announcements,<br>and a virtual world!",
    confirm: "Understood",
    col_no: "No.",
    col_title: "Title",
    col_complete: "Done",
    col_author: "Author",
    col_date: "Date",
    new_assignment_title: "Register New Assignment",
    select_subject: "Select Subject",
    select_subject_placeholder: "Please select a subject",
    subject_important: "Important Notice",
    subject_win: "Windows Programming",
    subject_english: "Major English",
    subject_micro: "Microcontroller",
    subject_plc: "PLC Programming",
    subject_web: "Web Programming",
    subject_ai: "Intro to AI",
    input_title: "Title",
    input_content: "Content",
    cancel_btn: "Cancel",
    submit_btn: "Submit",
    new_qna_title: "Register Question",
    select_category: "Select Category",
    select_category_placeholder: "Please select",
    category_homework: "Homework",
    category_life: "Campus Life",
    category_etc: "Other",
    write_btn: "Write",
    empty_assignment: "No assignments registered.",
    empty_qna: "No questions registered.",
    task_complete: "Completed",
    back_to_list: "Back to List",
    label_author: "Author",
    label_date: "Date",
    label_like: "Like",
    label_answers: "Replies",
    label_write_btn: "Post",
    delete_btn: "Delete",
    chat_title: "Live D2 Chat",
    chat_live: "LIVE",
    chat_login_prompt: "Log in to join the<br>live chatroom!",
    anonymous_mode: "Post anonymously",
    attach_image: "Attach Image"
  },
  ja: {
    slide1_title: "ロボットソフトウェア学科サイト",
    slide1_desc: "東洋未来大学ロボットソフトウェア工学科の公式ホームページへ移動します。",
    slide2_title: "課題お知らせ",
    slide2_desc: "課題の提出期限を確認し、自分の課題完了状況を簡単に確認できます。",
    slide3_title: "質問掲示板",
    slide3_desc: "勉強中に困ったことや学習の質問を投稿して交流しましょう。",
    slide4_title: "3D仮想世界ワールド",
    slide4_desc: "メタバースで実現された3D仮想空間でスマートワールドを体験してください。",
    go_to: "ショートカット",
    board1_title: "課題お知らせ",
    board2_title: "質問掲示板",
    services_title: "主要サービス",
    service1_name: "Eサービス",
    service2_name: "遠隔授業講義",
    service3_name: "3Dワールド",
    login: "ログイン",
    logout: "ログアウト",
    welcome_title: "ロボットソフトウェアD2クラスの<br>ウェブサイトです！",
    welcome_desc: "課題、主要なお知らせ、仮想世界のコンテンツを<br>含んでいます！",
    confirm: "確認しました",
    col_no: "番号",
    col_title: "タイトル",
    col_complete: "完了",
    col_author: "作成者",
    col_date: "日付",
    new_assignment_title: "新規課題登録",
    select_subject: "科目選択",
    select_subject_placeholder: "科目を選択してください",
    subject_important: "重要なお知らせ",
    subject_win: "Windowsプログラミング",
    subject_english: "専攻英語",
    subject_micro: "マイクロコントローラ",
    subject_plc: "PLCプログラミング",
    subject_web: "ウェブプログラミング",
    subject_ai: "人工知能概論",
    input_title: "タイトル",
    input_content: "内容",
    cancel_btn: "キャンセル",
    submit_btn: "登録する",
    new_qna_title: "質問の登録",
    select_category: "カテゴリ選択",
    select_category_placeholder: "選択してください",
    category_homework: "課題",
    category_life: "学校生活",
    category_etc: "その他",
    write_btn: "書き込み",
    empty_assignment: "登録された課題はありません。",
    empty_qna: "登録された質問はありません。",
    task_complete: "課題完了",
    back_to_list: "リストへ",
    label_author: "作成者",
    label_date: "登録日",
    label_like: "おすすめ",
    label_answers: "返信",
    label_write_btn: "作成",
    delete_btn: "削除",
    chat_title: "リアルタイムD2チャット",
    chat_live: "ライブ",
    chat_login_prompt: "ログインしてリアルタイム<br>チャットに参加しましょう！",
    anonymous_mode: "匿名で投稿",
    attach_image: "画像添付"
  }
};

function updateLanguage(lang) {
  const elements = document.querySelectorAll('[data-translate-key]');
  elements.forEach(el => {
    const key = el.getAttribute('data-translate-key');
    if (translations[lang] && translations[lang][key]) {
      el.innerHTML = translations[lang][key];
    }
  });

  // Translate placeholders
  const placeholders = {
    ko: {
      postTitle: "제목을 입력하세요",
      postContent: "과제 내용을 상세히 입력해주세요.",
      qnaTitle: "질문 제목을 입력하세요",
      qnaContent: "질문 내용을 상세히 적어주세요."
    },
    en: {
      postTitle: "Enter title",
      postContent: "Please enter assignment details in detail.",
      qnaTitle: "Enter question title",
      qnaContent: "Please write details of your question."
    },
    ja: {
      postTitle: "タイトルを入力してください",
      postContent: "課題の詳細を入力してください。",
      qnaTitle: "質問のタイトルを入力してください",
      qnaContent: "質問の具体的な内容を書いてください。"
    }
  };

  const titleInput = document.getElementById('postTitle');
  const contentInput = document.getElementById('postContent');
  const qnaTitleInput = document.getElementById('qnaTitle');
  const qnaContentInput = document.getElementById('qnaContent');

  if (titleInput && placeholders[lang]) titleInput.placeholder = placeholders[lang].postTitle;
  if (contentInput && placeholders[lang]) contentInput.placeholder = placeholders[lang].postContent;
  if (qnaTitleInput && placeholders[lang]) qnaTitleInput.placeholder = placeholders[lang].qnaTitle;
  if (qnaContentInput && placeholders[lang]) qnaContentInput.placeholder = placeholders[lang].qnaContent;
}

document.addEventListener('DOMContentLoaded', () => {
  // Image Attachment State Variables
  let postImageData = null;
  let qnaImageData = null;

  function setupImageAttachment(inputElId, labelElId, previewContainerElId, previewImgElId, setCallback) {
    const inputEl = document.getElementById(inputElId);
    const labelEl = document.getElementById(labelElId);
    const previewContainerEl = document.getElementById(previewContainerElId);
    const previewImgEl = document.getElementById(previewImgElId);

    if (!inputEl || !labelEl || !previewContainerEl || !previewImgEl) return;

    inputEl.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        labelEl.textContent = '클릭하여 이미지 파일을 첨부하세요';
        previewContainerEl.style.display = 'none';
        previewImgEl.src = '';
        setCallback(null);
        return;
      }

      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 첨부할 수 있습니다.');
        inputEl.value = '';
        return;
      }

      labelEl.textContent = file.name;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max_size = 800;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          previewImgEl.src = dataUrl;
          previewContainerEl.style.display = 'block';
          setCallback(dataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  setupImageAttachment('postImage', 'postImageLabel', 'postImagePreviewContainer', 'postImagePreview', (data) => { postImageData = data; });
  setupImageAttachment('qnaImage', 'qnaImageLabel', 'qnaImagePreviewContainer', 'qnaImagePreview', (data) => { qnaImageData = data; });

  // Restore login session if available
  const storedStudentId = localStorage.getItem('studentId');
  const storedStudentName = localStorage.getItem('studentName');
  if (storedStudentId && storedStudentName) {
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const userProfileArea = document.getElementById('userProfileArea');
    const userGreeting = document.getElementById('userGreeting');
    
    if (headerLoginBtn && userProfileArea && userGreeting) {
      const suffix = currentSelectedLang === 'ko' ? '님' : (currentSelectedLang === 'en' ? '' : '様');
      userGreeting.textContent = currentSelectedLang === 'en' ? `Welcome, ${storedStudentName}(${storedStudentId})` : `${storedStudentName}(${storedStudentId})${suffix}`;
      headerLoginBtn.classList.add('hidden');
      userProfileArea.classList.remove('hidden');
    }
  }

  // Apply translation initially
  updateLanguage(currentSelectedLang);

  const langSelector = document.getElementById('langSelector');
  const langDropdown = document.getElementById('langDropdown');
  const currentLangSpan = document.getElementById('currentLang');
  const langOptions = document.querySelectorAll('.lang-option');

  if (langSelector && langDropdown && currentLangSpan) {
    // Set initial active states
    langOptions.forEach(opt => {
      if (opt.getAttribute('data-lang') === currentSelectedLang) {
        opt.classList.add('active');
        currentLangSpan.textContent = opt.textContent;
      } else {
        opt.classList.remove('active');
      }
    });

    langSelector.addEventListener('click', (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      langDropdown.classList.remove('active');
    });

    langOptions.forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedLang = option.getAttribute('data-lang');
        currentSelectedLang = selectedLang;
        
        localStorage.setItem('preferredLanguage', selectedLang);
        
        langOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentLangSpan.textContent = option.textContent;
        langDropdown.classList.remove('active');
        
        updateLanguage(selectedLang);
        
        // Reload Firebase feeds with appropriate empty messages
        if (typeof loadAssignments === 'function') loadAssignments();
        if (typeof loadQnas === 'function') loadQnas();
        if (typeof updateChatViewState === 'function') updateChatViewState();
      });
    });
  }

  const slides = document.querySelectorAll('.slide');
  const sliderWrapper = document.getElementById('sliderWrapper');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const progressFill = document.getElementById('progressFill');
  const sliderCounter = document.getElementById('sliderCounter');

  let currentIndex = 0;
  const totalSlides = slides.length;
  let isPlaying = true;
  let progress = 0;
  const slideDuration = 4000; // 4 seconds per slide
  const updateInterval = 40; // 40ms updates for smooth filling (25 FPS)
  let progressInterval = null;

  // Function to move to a specific slide index
  function goToSlide(index) {
    if (totalSlides === 0 || !sliderWrapper) return;
    // Wrap index around boundaries
    if (index < 0) {
      currentIndex = totalSlides - 1;
    } else if (index >= totalSlides) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }
    
    // Transform slider wrapper horizontally (each slide is 25% of the 400% width)
    sliderWrapper.style.transform = `translateX(-${currentIndex * (100 / totalSlides)}%)`;
    
    // Update active class to trigger content animations
    slides.forEach((slide, i) => {
      if (i === currentIndex) {
        slide.classList.add('active');
      } else {
        slide.classList.remove('active');
      }
    });
    
    // Update page indicator counter
    if (sliderCounter) sliderCounter.textContent = `${currentIndex + 1} / ${totalSlides}`;
    
    // Reset progress
    progress = 0;
    if (progressFill) progressFill.style.width = '0%';
  }

  // Function to start progress tracking
  function startProgressTracker() {
    if (!progressFill) return;
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(() => {
      if (isPlaying) {
        progress += (updateInterval / slideDuration) * 100;
        if (progress >= 100) {
          progress = 0;
          goToSlide(currentIndex + 1);
        }
        if (progressFill) progressFill.style.width = `${progress}%`;
      }
    }, updateInterval);
  }

  // Play / Pause event handling
  function togglePlayPause() {
    if (!playPauseBtn) return;
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');
    if (isPlaying) {
      isPlaying = false;
      // UI toggle
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
      playPauseBtn.setAttribute('aria-label', '재생');
    } else {
      isPlaying = true;
      // UI toggle
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
      playPauseBtn.setAttribute('aria-label', '일시정지');
    }
  }

  // Event Listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      goToSlide(currentIndex - 1);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      goToSlide(currentIndex + 1);
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', togglePlayPause);
  }

  // Mobile Menu Toggle Logic
  const menuToggleBtn = document.getElementById('menuToggleBtn');
  const headerNavActions = document.getElementById('headerNavActions');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

  if (menuToggleBtn && headerNavActions) {
    const toggleMenu = () => {
      menuToggleBtn.classList.toggle('active');
      headerNavActions.classList.toggle('active');
      if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.toggle('active');
      }
      document.body.style.overflow = headerNavActions.classList.contains('active') ? 'hidden' : '';
    };

    menuToggleBtn.addEventListener('click', toggleMenu);
    
    if (mobileMenuOverlay) {
      mobileMenuOverlay.addEventListener('click', toggleMenu);
    }

    const navLinks = headerNavActions.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (headerNavActions.classList.contains('active')) {
          toggleMenu();
        }
      });
    });
  }

  // Login Modal Logic
  const loginBtn = document.querySelector('.login-btn');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModal = document.getElementById('closeLoginModal');
  const loginForm = document.querySelector('.login-form');

  if (loginBtn && loginModal && closeLoginModal) {
    loginBtn.addEventListener('click', () => {
      loginModal.classList.add('active');
      // Close mobile menu if open
      if (headerNavActions && headerNavActions.classList.contains('active')) {
        menuToggleBtn.classList.remove('active');
        headerNavActions.classList.remove('active');
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    closeLoginModal.addEventListener('click', () => {
      loginModal.classList.remove('active');
    });

    // Close on overlay click
    loginModal.addEventListener('click', (e) => {
      if (e.target === loginModal) {
        loginModal.classList.remove('active');
      }
    });

    // Profile Elements
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const userProfileArea = document.getElementById('userProfileArea');
    const userGreeting = document.getElementById('userGreeting');
    const logoutBtn = document.getElementById('logoutBtn');

    // Handle form submit
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const studentId = document.getElementById('studentId').value;
        const studentName = document.getElementById('studentName').value;
        
        // Show temporary login alert as requested
        const loginAlert = currentSelectedLang === 'ko' ? '임시로그인 되었습니다!' : (currentSelectedLang === 'en' ? 'Logged in temporarily!' : '臨時ログインしました！');
        alert(loginAlert);
        
        // Save to localStorage
        localStorage.setItem('studentId', studentId);
        localStorage.setItem('studentName', studentName);
        
        // Update UI to logged-in state
        if (headerLoginBtn && userProfileArea && userGreeting) {
          const suffix = currentSelectedLang === 'ko' ? '님' : (currentSelectedLang === 'en' ? '' : '様');
          userGreeting.textContent = currentSelectedLang === 'en' ? `Welcome, ${studentName}(${studentId})` : `${studentName}(${studentId})${suffix}`;
          headerLoginBtn.classList.add('hidden');
          userProfileArea.classList.remove('hidden');
        }
        
        if (typeof updateChatViewState === 'function') updateChatViewState();
        if (typeof loadAssignments === 'function') loadAssignments();
        if (typeof loadQnas === 'function') loadQnas();
        
        loginModal.classList.remove('active');
        loginForm.reset();
      });
    }

    // Handle Logout
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        const logoutAlert = currentSelectedLang === 'ko' ? '로그아웃 되었습니다.' : (currentSelectedLang === 'en' ? 'Logged out.' : 'ログアウトしました。');
        alert(logoutAlert);
        
        // Clear from localStorage
        localStorage.removeItem('studentId');
        localStorage.removeItem('studentName');
        
        if (userGreeting) {
          userGreeting.textContent = '';
        }
        if (headerLoginBtn && userProfileArea) {
          headerLoginBtn.classList.remove('hidden');
          userProfileArea.classList.add('hidden');
        }
        if (typeof updateChatViewState === 'function') updateChatViewState();
        if (typeof loadAssignments === 'function') loadAssignments();
        if (typeof loadQnas === 'function') loadQnas();
      });
    }
  }

  // Initialize Slider state
  goToSlide(0);
  startProgressTracker();

  // Welcome Modal Logic
  const welcomeModal = document.getElementById('welcomeModal');
  const closeWelcomeModal = document.getElementById('closeWelcomeModal');
  const confirmWelcomeBtn = document.getElementById('confirmWelcomeBtn');

  if (welcomeModal) {
    // Show modal automatically on load with a slight delay if it hasn't been shown before
    const hasWelcomeShown = localStorage.getItem('welcomeShown');
    if (!hasWelcomeShown) {
      setTimeout(() => {
        welcomeModal.classList.add('active');
      }, 500);
    }

    const closeWelcome = () => {
      welcomeModal.classList.remove('active');
      localStorage.setItem('welcomeShown', 'true');
    };

    if (closeWelcomeModal) closeWelcomeModal.addEventListener('click', closeWelcome);
    if (confirmWelcomeBtn) confirmWelcomeBtn.addEventListener('click', closeWelcome);
    
    // Close on overlay click
    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) {
        closeWelcome();
      }
    });
  }

  // Assignment Modal Logic
  const assignmentNoticeBoard = document.getElementById('assignmentNoticeBoard');
  const assignmentModal = document.getElementById('assignmentModal');
  const closeAssignmentModal = document.getElementById('closeAssignmentModal');

  if (assignmentNoticeBoard && assignmentModal) {
    assignmentNoticeBoard.addEventListener('click', () => {
      assignmentModal.classList.add('active');
    });

    if (closeAssignmentModal) {
      closeAssignmentModal.addEventListener('click', () => {
        assignmentModal.classList.remove('active');
      });
    }

    // Close on overlay click
    assignmentModal.addEventListener('click', (e) => {
      if (e.target === assignmentModal) {
        assignmentModal.classList.remove('active');
      }
    });

    // Make the card title clickable to trigger list opening
    const noticeBoardTitle = document.querySelector('.notice-board .board-title');
    if (noticeBoardTitle) {
      noticeBoardTitle.addEventListener('click', () => {
        assignmentNoticeBoard.click();
      });
    }
  }

  // Write Post Modal Logic
  const openWritePostModal = document.getElementById('openWritePostModal');
  const writePostModal = document.getElementById('writePostModal');
  const closeWritePostModal = document.getElementById('closeWritePostModal');
  const cancelWriteBtn = document.getElementById('cancelWriteBtn');
  const writePostForm = document.getElementById('writePostForm');
  const assignmentTableBody = document.getElementById('assignmentTableBody');
  
  let postCount = 0;

  if (openWritePostModal && writePostModal) {
    openWritePostModal.addEventListener('click', () => {
      const headerLoginBtn = document.getElementById('headerLoginBtn');
      // If login button is visible, user is not logged in
      if (headerLoginBtn && !headerLoginBtn.classList.contains('hidden')) {
        alert('로그인이 필요한 서비스입니다.');
        return;
      }
      writePostModal.classList.add('active');
    });

    const closeWriteModal = () => {
      writePostModal.classList.remove('active');
      writePostForm.reset();
      postImageData = null;
      const postImageLabel = document.getElementById('postImageLabel');
      if (postImageLabel) postImageLabel.textContent = '클릭하여 이미지 파일을 첨부하세요';
      const postPreviewContainer = document.getElementById('postImagePreviewContainer');
      if (postPreviewContainer) postPreviewContainer.style.display = 'none';
      const postPreview = document.getElementById('postImagePreview');
      if (postPreview) postPreview.src = '';
    };

    if (closeWritePostModal) closeWritePostModal.addEventListener('click', closeWriteModal);
    if (cancelWriteBtn) cancelWriteBtn.addEventListener('click', closeWriteModal);

    // Form submission
    if (writePostForm) {
      writePostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = writePostForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = '등록 중...';

        try {
          const subject = document.getElementById('postSubject').value;
          const title = document.getElementById('postTitle').value;
          const content = document.getElementById('postContent').value;
          
          const formattedTitle = `[${subject}] ${title}`;
          
          let postAuthor = '작성자';
          const userGreeting = document.getElementById('userGreeting');
          if (userGreeting && userGreeting.textContent) {
            postAuthor = userGreeting.textContent.split('(')[0].trim() || '작성자';
          }
          
          const now = new Date();
          const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
          
          const authorId = getCurrentUserId();
          
          // Save to Firestore using compat API
          await db.collection("assignments").add({
            title: formattedTitle,
            content: content,
            author: postAuthor,
            authorId: authorId,
            dateStr: dateStr,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            imageData: postImageData
          });

          // Fetch fresh list
          await loadAssignments();
          
          closeWriteModal();
        } catch (error) {
          console.error("Error adding document: ", error);
          alert('과제 등록 중 오류가 발생했습니다.');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = '등록하기';
        }
      });
    }
  }

  // Helper to get logged-in user ID
  const getCurrentUserId = () => {
    const userGreeting = document.getElementById('userGreeting');
    if (userGreeting && userGreeting.textContent) {
      const match = userGreeting.textContent.match(/\((.*?)\)/);
      return match ? match[1] : null;
    }
    return null;
  };

  // Helper to sync completion state to Firestore
  async function toggleCompletion(postId, isComplete) {
    const userId = getCurrentUserId();
    if (!userId) return;

    const docRef = db.collection("assignments").doc(postId);
    try {
      if (isComplete) {
        await docRef.update({
          completedBy: firebase.firestore.FieldValue.arrayUnion(userId)
        });
      } else {
        await docRef.update({
          completedBy: firebase.firestore.FieldValue.arrayRemove(userId)
        });
      }
    } catch (err) {
      console.error("Error updating completion:", err);
    }
  }

  // Function to load assignments from Firestore
  async function loadAssignments() {
    const assignmentTableBody = document.getElementById('assignmentTableBody');
    const mainAssignmentList = document.getElementById('mainAssignmentList');
    
    if (!assignmentTableBody || !mainAssignmentList) return;
    
    try {
      const querySnapshot = await db.collection("assignments").orderBy("createdAt", "desc").get();
      
      if (querySnapshot.empty) {
        const emptyMsg = (translations[currentSelectedLang] && translations[currentSelectedLang].empty_assignment) || "등록된 과제 공지가 없습니다.";
        assignmentTableBody.innerHTML = `
          <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;">
            <td style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">1</td>
            <td style="padding: 20px 16px;"><a href="#" style="color: var(--color-text-main); font-weight: 600; text-decoration: none; transition: color 0.2s;">${emptyMsg}</a></td>
            <td style="padding: 20px 16px; text-align: center;">-</td>
            <td style="padding: 20px 16px; text-align: center;">-</td>
            <td style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">-</td>
          </tr>
        `;
        mainAssignmentList.innerHTML = '';
        return;
      }

      assignmentTableBody.innerHTML = '';
      mainAssignmentList.innerHTML = '';
      
      const readPostModal = document.getElementById('readPostModal');
      const readPostTitle = document.getElementById('readPostTitle');
      const readPostAuthor = document.getElementById('readPostAuthor');
      const readPostDate = document.getElementById('readPostDate');
      const readPostContent = document.getElementById('readPostContent');
      const postDeleteBtn = document.getElementById('postDeleteBtn');
      const userGreeting = document.getElementById('userGreeting');
      
      let index = querySnapshot.size;
      
      querySnapshot.forEach((doc) => {
        const postId = doc.id;
        const data = doc.data();
        const formattedTitle = data.title;
        const postAuthor = data.author;
        const authorId = data.authorId;
        const dateStr = data.dateStr;
        const content = data.content;
        
        const completedBy = data.completedBy || [];
        const isCompleted = getCurrentUserId() ? completedBy.includes(getCurrentUserId()) : false;
        
        const readPostCompleteCheck = document.getElementById('readPostCompleteCheck');

        const openReadModal = (e) => {
          e.preventDefault();
          if (readPostTitle) readPostTitle.textContent = formattedTitle || '';
          if (readPostAuthor) readPostAuthor.textContent = postAuthor || '';
          if (readPostDate) readPostDate.textContent = dateStr || '';
          if (readPostContent) readPostContent.textContent = content || '';
          
          const readPostImageContainer = document.getElementById('readPostImageContainer');
          const readPostImage = document.getElementById('readPostImage');
          if (readPostImageContainer && readPostImage) {
            if (data.imageData) {
              readPostImage.src = data.imageData;
              readPostImageContainer.style.display = 'block';
            } else {
              readPostImage.src = '';
              readPostImageContainer.style.display = 'none';
            }
          }
          
          if (postDeleteBtn) {
            const currentName = userGreeting && userGreeting.textContent ? userGreeting.textContent.split('(')[0].trim() : '';
            if (getCurrentUserId() && (authorId === getCurrentUserId() || postAuthor === currentName || currentName.includes('관리') || currentName.includes('류승우') || currentName.includes('관리류'))) {
              postDeleteBtn.style.display = 'block';
              postDeleteBtn.onclick = async () => {
                if (confirm('정말로 이 과제 공지를 삭제하시겠습니까?')) {
                  try {
                    await db.collection('assignments').doc(postId).delete();
                    if (readPostModal) readPostModal.classList.remove('active');
                    loadAssignments();
                  } catch (err) {
                    console.error("Error deleting post:", err);
                    alert("삭제 실패했습니다.");
                  }
                }
              };
            } else {
              postDeleteBtn.style.display = 'none';
            }
          }
          
          if (readPostCompleteCheck) {
            readPostCompleteCheck.dataset.postId = postId;
            const tableCheck = document.querySelector(`.table-complete-check[data-post-id="${postId}"]`);
            if (tableCheck) {
              readPostCompleteCheck.checked = tableCheck.checked;
            } else {
              readPostCompleteCheck.checked = getCurrentUserId() ? (data.completedBy || []).includes(getCurrentUserId()) : false;
            }
          }
          
          if (readPostModal) readPostModal.classList.add('active');
        };

        // Create new row for Modal Table
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        tr.style.transition = 'background-color 0.2s';
        
        tr.innerHTML = `
          <td style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">${index}</td>
          <td style="padding: 20px 16px;"><a href="#" class="post-link" style="color: var(--color-text-main); font-weight: 600; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-main)'">${formattedTitle}</a></td>
          <td style="padding: 20px 16px; text-align: center;"><input type="checkbox" class="table-complete-check" data-post-id="${postId}" ${isCompleted ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;"></td>
          <td style="padding: 20px 16px; text-align: center;">${postAuthor}</td>
          <td style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">${dateStr}</td>
        `;
        
        const checkInput = tr.querySelector('.table-complete-check');
        checkInput.addEventListener('change', async (e) => {
          const userId = getCurrentUserId();
          if (!userId) {
            alert('로그인이 필요한 기능입니다.');
            e.target.checked = !e.target.checked; // Revert
            return;
          }
          await toggleCompletion(postId, e.target.checked);
          
          // Update local data cache to reflect immediate UI state for the modal
          if (e.target.checked) {
            if (!data.completedBy) data.completedBy = [];
            if (!data.completedBy.includes(userId)) data.completedBy.push(userId);
          } else {
            if (data.completedBy) {
              data.completedBy = data.completedBy.filter(id => id !== userId);
            }
          }
          
          // Sync with read modal if it's open for this post
          if (readPostCompleteCheck && readPostCompleteCheck.dataset.postId === postId) {
            readPostCompleteCheck.checked = e.target.checked;
          }
        });
        
        tr.querySelector('.post-link').addEventListener('click', openReadModal);
        assignmentTableBody.appendChild(tr);
        
        // Main Dashboard List (Limit to 5 items to prevent layout overflow)
        if (mainAssignmentList.children.length < 5) {
          const li = document.createElement('li');
          li.className = 'board-item';
          
          let statusIcon = '';
          if (isCompleted) {
            statusIcon = `<span style="color: #10b981; margin-left: auto; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="완료됨">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 22px; height: 22px;">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </span>`;
          } else {
            statusIcon = `<span style="color: #fbbf24; margin-left: auto; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="미완료">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 22px; height: 22px;">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </span>`;
          }

          li.innerHTML = `
            <a href="#" class="item-link" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
              <div style="display: flex; flex-direction: column; min-width: 0; flex-grow: 1;">
                <span class="item-title" style="margin-bottom: 4px; text-align: left;">${formattedTitle}</span>
                <span class="item-date" style="text-align: left;">${dateStr}</span>
              </div>
              ${statusIcon}
            </a>
          `;
          li.querySelector('.item-link').addEventListener('click', openReadModal);
          mainAssignmentList.appendChild(li);
        }
        
        index--;
      });
    } catch (error) {
      console.error("Error fetching assignments: ", error);
    }
  }

  // Load assignments on page load
  loadAssignments();

  // Read Post Modal Close Logic
  const readPostModal = document.getElementById('readPostModal');
  const closeReadPostModal = document.getElementById('closeReadPostModal');
  const confirmReadBtn = document.getElementById('confirmReadBtn');
  
  if (readPostModal) {
    const closeReadModal = () => {
      readPostModal.classList.remove('active');
    };
    if (closeReadPostModal) closeReadPostModal.addEventListener('click', closeReadModal);
    if (confirmReadBtn) confirmReadBtn.addEventListener('click', closeReadModal);
    readPostModal.addEventListener('click', (e) => {
      if (e.target === readPostModal) {
        closeReadModal();
      }
    });
  }

  // Bind Read Post Modal Checkbox to Firestore
  const readPostCompleteCheck = document.getElementById('readPostCompleteCheck');
  if (readPostCompleteCheck) {
    readPostCompleteCheck.addEventListener('change', async (e) => {
      const userId = getCurrentUserId();
      if (!userId) {
        alert('로그인이 필요한 기능입니다.');
        e.target.checked = !e.target.checked; // Revert
        return;
      }
      
      const postId = e.target.dataset.postId;
      if (postId) {
        await toggleCompletion(postId, e.target.checked);
        
        // Sync with the table checkbox
        const tableCheck = document.querySelector(`.table-complete-check[data-post-id="${postId}"]`);
        if (tableCheck) {
          tableCheck.checked = e.target.checked;
        }
      }
    });
  }

  // Q&A Board Modals & Logic
  const qnaBoardBtn = document.getElementById('qnaBoardBtn');
  const qnaModal = document.getElementById('qnaModal');
  const closeQnaModal = document.getElementById('closeQnaModal');
  
  const openWriteQnaModal = document.getElementById('openWriteQnaModal');
  const writeQnaModal = document.getElementById('writeQnaModal');
  const closeWriteQnaModal = document.getElementById('closeWriteQnaModal');
  const cancelWriteQnaBtn = document.getElementById('cancelWriteQnaBtn');
  const writeQnaForm = document.getElementById('writeQnaForm');
  
  const readQnaModal = document.getElementById('readQnaModal');
  const closeReadQnaModal = document.getElementById('closeReadQnaModal');
  
  const qnaReplySubmitBtn = document.getElementById('qnaReplySubmitBtn');
  const qnaReplyInput = document.getElementById('qnaReplyInput');
  const qnaRepliesContainer = document.getElementById('qnaRepliesContainer');

  if (qnaBoardBtn) {
    qnaBoardBtn.addEventListener('click', () => qnaModal.classList.add('active'));
    const qnaBoardTitle = document.querySelector('.qna-board .board-title');
    if (qnaBoardTitle) {
      qnaBoardTitle.addEventListener('click', () => {
        qnaBoardBtn.click();
      });
    }
  }
  if (closeQnaModal) closeQnaModal.addEventListener('click', () => qnaModal.classList.remove('active'));

  if (openWriteQnaModal) {
    openWriteQnaModal.addEventListener('click', () => {
      if (!getCurrentUserId()) {
        alert('로그인이 필요한 서비스입니다.');
        return;
      }
      writeQnaModal.classList.add('active');
    });
  }
  
  const closeWriteQna = () => {
    writeQnaModal.classList.remove('active');
    if (writeQnaForm) writeQnaForm.reset();
    qnaImageData = null;
    const qnaImageLabel = document.getElementById('qnaImageLabel');
    if (qnaImageLabel) qnaImageLabel.textContent = '클릭하여 이미지 파일을 첨부하세요';
    const qnaPreviewContainer = document.getElementById('qnaImagePreviewContainer');
    if (qnaPreviewContainer) qnaPreviewContainer.style.display = 'none';
    const qnaPreview = document.getElementById('qnaImagePreview');
    if (qnaPreview) qnaPreview.src = '';
  };
  if (closeWriteQnaModal) closeWriteQnaModal.addEventListener('click', closeWriteQna);
  if (cancelWriteQnaBtn) cancelWriteQnaBtn.addEventListener('click', closeWriteQna);
  
  const closeReadQna = () => readQnaModal.classList.remove('active');
  if (closeReadQnaModal) closeReadQnaModal.addEventListener('click', closeReadQna);

  // Write new Q&A
  if (writeQnaForm) {
    writeQnaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = writeQnaForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = '등록 중...';

      try {
        const category = document.getElementById('qnaCategory').value;
        const titleInput = document.getElementById('qnaTitle').value;
        const title = `[${category}] ${titleInput}`;
        const content = document.getElementById('qnaContent').value;
        const isAnonymous = document.getElementById('qnaAnonymous').checked;
        
        let author = '작성자';
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting && userGreeting.textContent) {
          author = userGreeting.textContent.split('(')[0].trim() || '작성자';
        }
        
        const authorId = getCurrentUserId();
        
        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
        
        await db.collection("qnas").add({
          title: title,
          content: content,
          author: author,
          authorId: authorId,
          dateStr: dateStr,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          replies: [],
          likes: [],
          isAnonymous: isAnonymous,
          imageData: qnaImageData
        });

        await loadQnas();
        closeWriteQna();
      } catch (error) {
        console.error("Error adding Q&A: ", error);
        alert('질문 등록 중 오류가 발생했습니다.');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '등록하기';
      }
    });
  }

  // Load Q&A from Firestore
  async function loadQnas() {
    const qnaTableBody = document.getElementById('qnaTableBody');
    const mainQnaList = document.getElementById('mainQnaList');
    if (!qnaTableBody || !mainQnaList) return;
    try {
      const querySnapshot = await db.collection("qnas").orderBy("createdAt", "desc").get();
      
      if (querySnapshot.empty) {
        const emptyMsg = (translations[currentSelectedLang] && translations[currentSelectedLang].empty_qna) || "등록된 질문이 없습니다.";
        qnaTableBody.innerHTML = `
          <tr style="border-bottom: 1px solid #e2e8f0; transition: background-color 0.2s;">
            <td colspan="4" style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">${emptyMsg}</td>
          </tr>
        `;
        mainQnaList.innerHTML = '';
        return;
      }

      qnaTableBody.innerHTML = '';
      mainQnaList.innerHTML = '';
      
      const readQnaTitle = document.getElementById('readQnaTitle');
      const readQnaAuthor = document.getElementById('readQnaAuthor');
      const readQnaDate = document.getElementById('readQnaDate');
      const readQnaContent = document.getElementById('readQnaContent');
      
      let index = querySnapshot.size;

      const qnaLikeBtn = document.getElementById('qnaLikeBtn');
      const qnaLikeCount = document.getElementById('qnaLikeCount');
      const qnaDeleteBtn = document.getElementById('qnaDeleteBtn');
      const userGreeting = document.getElementById('userGreeting');

      querySnapshot.forEach((doc) => {
        const qnaId = doc.id;
        const data = doc.data();
        const title = data.title;
        const author = data.author;
        const authorId = data.authorId;
        const dateStr = data.dateStr;
        const content = data.content;
        const replies = data.replies || [];
        const likes = data.likes || [];
        
        const isAnonymous = data.isAnonymous === true;
        const authorDisplay = isAnonymous ? (currentSelectedLang === 'ko' ? '익명' : (currentSelectedLang === 'en' ? 'Anonymous' : '匿名')) : author;

        const openReadQnaModal = (e) => {
          e.preventDefault();
          if (readQnaTitle) readQnaTitle.textContent = title || '';
          if (readQnaAuthor) readQnaAuthor.textContent = authorDisplay || '';
          if (readQnaDate) readQnaDate.textContent = dateStr || '';
          if (readQnaContent) readQnaContent.textContent = content || '';
          
          const readQnaImageContainer = document.getElementById('readQnaImageContainer');
          const readQnaImage = document.getElementById('readQnaImage');
          if (readQnaImageContainer && readQnaImage) {
            if (data.imageData) {
              readQnaImage.src = data.imageData;
              readQnaImageContainer.style.display = 'block';
            } else {
              readQnaImage.src = '';
              readQnaImageContainer.style.display = 'none';
            }
          }
          
          if (qnaLikeCount && qnaLikeBtn) {
            qnaLikeCount.textContent = likes.length;
            const hasLiked = getCurrentUserId() && likes.includes(getCurrentUserId());
            if (hasLiked) {
              qnaLikeBtn.style.backgroundColor = 'var(--color-primary)';
              qnaLikeBtn.style.color = 'white';
            } else {
              qnaLikeBtn.style.backgroundColor = '#f1f5f9';
              qnaLikeBtn.style.color = 'var(--color-primary)';
            }
            
            qnaLikeBtn.onclick = async () => {
              if (!getCurrentUserId()) {
                alert('로그인이 필요한 기능입니다.');
                return;
              }
              const currentHasLiked = likes.includes(getCurrentUserId());
              try {
                if (currentHasLiked) {
                  await db.collection('qnas').doc(qnaId).update({
                    likes: firebase.firestore.FieldValue.arrayRemove(getCurrentUserId())
                  });
                  likes.splice(likes.indexOf(getCurrentUserId()), 1);
                } else {
                  await db.collection('qnas').doc(qnaId).update({
                    likes: firebase.firestore.FieldValue.arrayUnion(getCurrentUserId())
                  });
                  likes.push(getCurrentUserId());
                }
                qnaLikeCount.textContent = likes.length;
                if (likes.includes(getCurrentUserId())) {
                  qnaLikeBtn.style.backgroundColor = 'var(--color-primary)';
                  qnaLikeBtn.style.color = 'white';
                } else {
                  qnaLikeBtn.style.backgroundColor = '#f1f5f9';
                  qnaLikeBtn.style.color = 'var(--color-primary)';
                }
              } catch (err) {
                console.error("Error toggling like:", err);
              }
            };
          }
          
          if (qnaDeleteBtn) {
            const currentName = userGreeting && userGreeting.textContent ? userGreeting.textContent.split('(')[0].trim() : '';
            if (getCurrentUserId() && (authorId === getCurrentUserId() || author === currentName || currentName.includes('관리') || currentName.includes('류승우') || currentName.includes('관리류'))) {
              qnaDeleteBtn.style.display = 'block';
              qnaDeleteBtn.onclick = async () => {
                if (confirm('정말로 이 질문을 삭제하시겠습니까?')) {
                   try {
                    await db.collection('qnas').doc(qnaId).delete();
                    if (closeReadQnaModal) closeReadQnaModal.click();
                    loadQnas();
                  } catch (err) {
                    console.error("Error deleting Q&A:", err);
                    alert("삭제 실패했습니다.");
                  }
                }
              };
            } else {
              qnaDeleteBtn.style.display = 'none';
            }
          }
 
          if (qnaReplySubmitBtn) {
            qnaReplySubmitBtn.dataset.qnaId = qnaId;
          }
          
          renderQnaReplies(replies, qnaId);
          if (readQnaModal) readQnaModal.classList.add('active');
        };
 
        // Table row
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        tr.style.transition = 'background-color 0.2s';
        
        tr.innerHTML = `
          <td style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">${index}</td>
          <td style="padding: 20px 16px;"><a href="#" class="post-link" style="color: var(--color-text-main); font-weight: 600; text-decoration: none; transition: color 0.2s;" onmouseover="this.style.color='var(--color-primary)'" onmouseout="this.style.color='var(--color-text-main)'">${title}</a></td>
          <td style="padding: 20px 16px; text-align: center;">${authorDisplay}</td>
          <td style="padding: 20px 16px; text-align: center; color: var(--color-text-muted);">${dateStr}</td>
        `;
        tr.querySelector('.post-link').addEventListener('click', openReadQnaModal);
        qnaTableBody.appendChild(tr);
        
        // Main Dashboard List (Limit to 3 items to prevent layout overflow)
        if (mainQnaList.children.length < 3) {
          const li = document.createElement('li');
          li.className = 'board-item';
          let newBadge = '';
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            const postTime = data.createdAt.toDate().getTime();
            if (Date.now() - postTime < 24 * 60 * 60 * 1000) {
              newBadge = `<span style="color: #d97706; margin-left: auto; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" title="새 질문">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 20px; height: 20px;">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </span>`;
            }
          }
          li.innerHTML = `
            <a href="#" class="item-link" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; gap: 12px;">
              <div style="display: flex; flex-direction: column; min-width: 0; flex-grow: 1;">
                <span class="item-title" style="margin-bottom: 4px; text-align: left;">${title}</span>
                <span class="item-date" style="text-align: left;">${dateStr}</span>
              </div>
              ${newBadge}
            </a>
          `;
          li.querySelector('.item-link').addEventListener('click', openReadQnaModal);
          mainQnaList.appendChild(li);
        }
 
        index--;
      });

    } catch (error) {
      console.error("Error fetching QnAs: ", error);
    }
  }

  // Render replies in Q&A Modal
  function renderQnaReplies(replies, qnaId) {
    if (!qnaRepliesContainer) return;
    qnaRepliesContainer.innerHTML = '';
    
    if (replies.length === 0) {
      qnaRepliesContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: 20px 0;">아직 답변이 없습니다. 첫 답변을 남겨보세요!</div>';
      return;
    }
    
    const userGreeting = document.getElementById('userGreeting');
    const currentName = userGreeting && userGreeting.textContent ? userGreeting.textContent.split('(')[0].trim() : '';

    replies.forEach(reply => {
      const replyDiv = document.createElement('div');
      replyDiv.style.backgroundColor = 'white';
      replyDiv.style.padding = '12px 16px';
      replyDiv.style.borderRadius = '8px';
      replyDiv.style.border = '1px solid #e2e8f0';
      replyDiv.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
      
      const isOwner = getCurrentUserId() && (reply.authorId === getCurrentUserId() || reply.author === currentName || currentName.includes('관리') || currentName.includes('류승우') || currentName.includes('관리류'));
      const deleteHtml = isOwner ? `<button class="reply-delete-btn" style="color: #ef4444; background: none; border: none; cursor: pointer; font-size: 12px; margin-left: 8px; padding: 0;">삭제</button>` : '';

      replyDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px;">
          <strong style="color: var(--color-text-main);">${reply.author}</strong>
          <div>
            <span style="color: var(--color-text-muted);">${reply.dateStr}</span>
            ${deleteHtml}
          </div>
        </div>
        <div style="color: var(--color-text-main); font-size: 15px; line-height: 1.5; white-space: pre-wrap;">${reply.content}</div>
      `;
      
      if (isOwner) {
        replyDiv.querySelector('.reply-delete-btn').addEventListener('click', async () => {
          if (confirm('답변을 삭제하시겠습니까?')) {
            try {
              await db.collection("qnas").doc(qnaId).update({
                replies: firebase.firestore.FieldValue.arrayRemove(reply)
              });
              const freshDoc = await db.collection("qnas").doc(qnaId).get();
              if (freshDoc.exists) {
                renderQnaReplies(freshDoc.data().replies || [], qnaId);
              }
            } catch (err) {
              console.error("Error deleting reply: ", err);
              alert('답변 삭제에 실패했습니다.');
            }
          }
        });
      }
      
      qnaRepliesContainer.appendChild(replyDiv);
    });
  }

  // Handle Reply Submit
  if (qnaReplySubmitBtn && qnaReplyInput) {
    qnaReplySubmitBtn.addEventListener('click', async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        alert('로그인이 필요한 서비스입니다.');
        return;
      }
      
      const content = qnaReplyInput.value.trim();
      if (!content) return;
      
      const qnaId = qnaReplySubmitBtn.dataset.qnaId;
      if (!qnaId) return;

      let author = '작성자';
      const userGreeting = document.getElementById('userGreeting');
      if (userGreeting && userGreeting.textContent) {
        author = userGreeting.textContent.split('(')[0].trim() || '작성자';
      }
      const authorId = userId;
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      
      const replyObj = { author, authorId, content, dateStr };

      qnaReplySubmitBtn.disabled = true;
      qnaReplySubmitBtn.textContent = '...';

      try {
        await db.collection("qnas").doc(qnaId).update({
          replies: firebase.firestore.FieldValue.arrayUnion(replyObj)
        });
        
        qnaReplyInput.value = '';
        await loadQnas(); 
        
        const freshDoc = await db.collection("qnas").doc(qnaId).get();
        if (freshDoc.exists) {
          renderQnaReplies(freshDoc.data().replies || [], qnaId);
          qnaRepliesContainer.scrollTop = 0; 
        }

      } catch (err) {
        console.error("Error adding reply: ", err);
        alert('답변 등록에 실패했습니다.');
      } finally {
        qnaReplySubmitBtn.disabled = false;
        qnaReplySubmitBtn.textContent = '작성';
      }
    });
    
    // Press enter to submit
    qnaReplyInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        qnaReplySubmitBtn.click();
      }
    });
  }

  loadQnas();

  // Banner button click handlers
  const bannerAssignmentBtn = document.getElementById('bannerAssignmentBtn');
  const bannerQnaBtn = document.getElementById('bannerQnaBtn');
  const banner3dBtn = document.getElementById('banner3dBtn');

  if (bannerAssignmentBtn && assignmentNoticeBoard) {
    bannerAssignmentBtn.addEventListener('click', (e) => {
      e.preventDefault();
      assignmentNoticeBoard.click();
    });
  }
  if (bannerQnaBtn && qnaBoardBtn) {
    bannerQnaBtn.addEventListener('click', (e) => {
      e.preventDefault();
      qnaBoardBtn.click();
    });
  }
  if (banner3dBtn) {
    const hostname = window.location.hostname || 'localhost';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '8099';
    banner3dBtn.href = isLocal ? `http://${hostname}:5173/world.html` : `/3D/dist/world.html`;
    banner3dBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const studentId = localStorage.getItem('studentId');
      const studentName = localStorage.getItem('studentName');
      
      if (!studentId || !studentName) {
        alert('로그인이 필요한 서비스입니다.');
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
          loginModal.classList.add('active');
        }
      } else {
        const url = isLocal
          ? `http://${hostname}:5173/world.html?studentId=${encodeURIComponent(studentId)}&studentName=${encodeURIComponent(studentName)}`
          : `/3D/dist/world.html?studentId=${encodeURIComponent(studentId)}&studentName=${encodeURIComponent(studentName)}`;
        window.location.href = url;
      }
    });
  }

  // Real-time Chatroom Implementation
  const chatMessages = document.getElementById('chatMessages');
  const chatInputForm = document.getElementById('chatInputForm');
  const chatInput = document.getElementById('chatInput');
  const chatLoggedOutState = document.getElementById('chatLoggedOutState');
  const chatLoggedInState = document.getElementById('chatLoggedInState');
  const chatLoginBtn = document.getElementById('chatLoginBtn');

  if (chatLoginBtn) {
    chatLoginBtn.addEventListener('click', () => {
      const loginModal = document.getElementById('loginModal');
      if (loginModal) loginModal.classList.add('active');
    });
  }

  let chatUnsubscribe = null;

  window.updateChatViewState = function() {
    const userId = getCurrentUserId();
    if (userId) {
      if (chatLoggedOutState) chatLoggedOutState.classList.add('hidden');
      if (chatLoggedInState) chatLoggedInState.classList.remove('hidden');
      if (chatInput) {
        chatInput.placeholder = currentSelectedLang === 'ko' ? "메시지를 입력하세요..." : (currentSelectedLang === 'en' ? "Type a message..." : "メッセージを入力してください...");
      }
      initChatListener();
    } else {
      if (chatLoggedOutState) chatLoggedOutState.classList.remove('hidden');
      if (chatLoggedInState) chatLoggedInState.classList.add('hidden');
      if (chatUnsubscribe) {
        chatUnsubscribe();
        chatUnsubscribe = null;
      }
    }
  };

  function initChatListener() {
    if (chatUnsubscribe) {
      chatUnsubscribe();
      chatUnsubscribe = null;
    }

    if (!chatMessages) return;

    chatUnsubscribe = db.collection("chats")
      .orderBy("createdAt", "asc")
      .limitToLast(200)
      .onSnapshot((snapshot) => {
        const currentUserId = getCurrentUserId();
        const currentUserName = localStorage.getItem('d2_portal_name');
        const activeIds = new Set();
        let lastNode = null;

        snapshot.forEach((doc) => {
          const docId = doc.id;
          activeIds.add(docId);

          const data = doc.data();
          const author = data.author || 'Anonymous';
          const authorId = data.authorId;
          const text = data.text || '';
          
          let timeStr = '';
          if (data.createdAt) {
            const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            const now = new Date();
            timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }

          let msgItem = document.getElementById(`msg-${docId}`);
          
          if (!msgItem) {
            const isOutgoing = (currentUserId && authorId && String(authorId) === String(currentUserId)) ||
                               (currentUserName && author && author.trim() === currentUserName.trim());
            msgItem = document.createElement('div');
            msgItem.className = `chat-msg-item ${isOutgoing ? 'outgoing' : 'incoming'}`;
            msgItem.id = `msg-${docId}`;
            
            msgItem.innerHTML = `
              <span class="chat-msg-author">${author}</span>
              <div class="chat-msg-bubble-wrapper">
                <div class="chat-msg-bubble">${escapeHtml(text)}</div>
                <span class="chat-msg-time">${timeStr}</span>
              </div>
            `;
            chatMessages.appendChild(msgItem);
          } else {
            // Update time if changed (e.g. from local latency null to server timestamp)
            const timeSpan = msgItem.querySelector('.chat-msg-time');
            if (timeSpan && timeSpan.textContent !== timeStr) {
              timeSpan.textContent = timeStr;
            }
          }

          // Enforce correct order of DOM nodes matching the query
          if (lastNode) {
            if (msgItem.previousSibling !== lastNode) {
              chatMessages.insertBefore(msgItem, lastNode.nextSibling);
            }
          } else {
            if (chatMessages.firstChild !== msgItem) {
              chatMessages.insertBefore(msgItem, chatMessages.firstChild);
            }
          }
          lastNode = msgItem;
        });

        // Remove old message nodes that have slid out of the limitToLast window
        const existingMsgItems = chatMessages.querySelectorAll('.chat-msg-item');
        existingMsgItems.forEach((item) => {
          const itemId = item.id.replace('msg-', '');
          if (!activeIds.has(itemId)) {
            item.remove();
          }
        });

        // Scroll to the bottom to display the latest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, (error) => {
        console.error("Chat listener error:", error);
      });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  if (chatInputForm) {
    chatInputForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const text = chatInput.value.trim();
      const userId = getCurrentUserId();
      
      if (!text || !userId) return;
      
      let author = 'Anonymous';
      const userGreeting = document.getElementById('userGreeting');
      if (userGreeting && userGreeting.textContent) {
        author = userGreeting.textContent.split('(')[0].trim() || 'Anonymous';
      }

      chatInput.value = '';

      try {
        await db.collection("chats").add({
          author: author,
          authorId: userId,
          text: text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error("Error sending message:", err);
      }
    });
  }

  // Initial call to set state
  window.updateChatViewState();

  // Redirect to 3D World with login validation
  const serviceCard3d = document.getElementById('serviceCard3d');
  if (serviceCard3d) {
    const hostname = window.location.hostname || 'localhost';
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.port === '8099';
    serviceCard3d.href = isLocal ? `http://${hostname}:5173/world.html` : `/3D/dist/world.html`;
    serviceCard3d.addEventListener('click', (e) => {
      e.preventDefault();
      const studentId = localStorage.getItem('studentId');
      const studentName = localStorage.getItem('studentName');
      
      if (!studentId || !studentName) {
        alert('로그인이 필요한 서비스입니다.');
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
          loginModal.classList.add('active');
        }
      } else {
        const url = isLocal
          ? `http://${hostname}:5173/world.html?studentId=${encodeURIComponent(studentId)}&studentName=${encodeURIComponent(studentName)}`
          : `/3D/dist/world.html?studentId=${encodeURIComponent(studentId)}&studentName=${encodeURIComponent(studentName)}`;
        window.location.href = url;
      }
    });
  }
});
