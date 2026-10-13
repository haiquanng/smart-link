// Vietnamese UI text for the extension, kept apart from src/i18n/vi.ts
// because the extension is a separate bundle.
export const t = {
  title: 'Lưu vào Smart Link',
  notePlaceholder: 'Ghi chú của bạn (tuỳ chọn)',
  save: 'Lưu',
  saving: 'Đang lưu…',
  saved: 'Đã lưu!',
  duplicate: 'Link này đã có, đã thêm ghi chú vào mục cũ.',
  badToken: 'Token không đúng hoặc đã bị thu hồi. Dán token mới bên dưới.',
  rateLimited: 'Bạn lưu nhanh quá, đợi một chút nhé.',
  error: 'Lưu thất bại, thử lại.',
  notSavable: 'Trang này không lưu được (chỉ trang http/https).',
  tokenLabel: 'Token (tạo trong Cài đặt của app)',
  tokenPlaceholder: 'Dán token vào đây',
  saveToken: 'Lưu token',
  changeToken: 'Đổi token',
  tokenSaved: 'Đã lưu token.',
  needToken: 'Dán token từ Smart Link → Cài đặt để bắt đầu.',
  menuSave: 'Lưu link vào Smart Link',
} as const;
