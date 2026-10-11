export const vi = {
  appName: 'Smart Link',
  tagline: 'Kho lưu link cá nhân',

  tabs: {
    inbox: 'Hộp lưu',
    search: 'Tìm kiếm',
    collections: 'Bộ sưu tập',
    resurface: 'Nhắc lại',
    settings: 'Cài đặt',
  },

  common: {
    loading: 'Đang tải…',
    retry: 'Thử lại',
    error: 'Có lỗi xảy ra',
    copy: 'Sao chép',
    copied: 'Đã sao chép',
    close: 'Đóng',
    comingSoon: 'Sắp có',
  },

  auth: {
    signInTitle: 'Đăng nhập',
    signUpTitle: 'Đăng ký',
    emailLabel: 'Email',
    emailPlaceholder: 'ban@email.com',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Ít nhất 6 ký tự',
    signInAction: 'Đăng nhập',
    signUpAction: 'Đăng ký',
    working: 'Đang xử lý…',
    toggleToSignUp: 'Chưa có tài khoản? Đăng ký',
    toggleToSignIn: 'Đã có tài khoản? Đăng nhập',
    needConfirm: 'Đã tạo tài khoản. Kiểm tra email để xác nhận rồi đăng nhập.',
    invalidEmail: 'Email không hợp lệ.',
    weakPassword: 'Mật khẩu cần ít nhất 6 ký tự.',
    failed: 'Email hoặc mật khẩu không đúng.',
    signOut: 'Đăng xuất',
  },

  inbox: {
    title: 'Hộp lưu',
    empty: 'Chưa có mục nào. Lưu một link từ Shortcut để bắt đầu.',
    emptyError: 'Không tải được danh sách.',
    statusPending: 'đang xử lý',
    statusFailed: 'làm giàu lỗi',
    noNote: '(không có ghi chú)',
  },

  search: {
    title: 'Tìm kiếm',
    placeholder: 'Tìm theo ghi chú, tiêu đề…',
    empty: 'Không tìm thấy kết quả.',
    hint: 'Gõ để tìm. Không dấu vẫn ra kết quả có dấu.',
  },

  settings: {
    title: 'Cài đặt',
    account: 'Tài khoản',
    tokensTitle: 'Token cho Shortcut',
    tokensHint:
      'Tạo token để iOS Shortcut gửi link lên. Token chỉ hiện một lần, hãy sao chép ngay.',
    newTokenLabel: 'Tên token',
    newTokenPlaceholder: 'VD: iPhone của tôi',
    createToken: 'Tạo token',
    creating: 'Đang tạo…',
    tokenShownOnce:
      'Đây là token của bạn. Nó chỉ hiện một lần — sao chép và lưu lại ngay.',
    revoke: 'Thu hồi',
    revoked: 'đã thu hồi',
    lastUsed: 'dùng lần cuối',
    neverUsed: 'chưa dùng',
    noTokens: 'Chưa có token nào.',
    shortcutGuideTitle: 'Cách cài iOS Shortcut',
    shortcutGuide:
      'Tạo Shortcut nhận dữ liệu từ Share Sheet, hỏi ghi chú, rồi POST JSON {url, note, channel:"shortcut"} kèm header Authorization: Bearer <token> tới endpoint ingest.',
    endpointLabel: 'Endpoint',
  },

  placeholder: {
    collections: 'Bộ sưu tập sẽ có ở giai đoạn sau.',
    resurface: 'Tính năng nhắc lại sẽ có ở giai đoạn sau.',
  },
} as const;
