// Vietnamese dictionary — the source of truth for the dictionary shape.
// Đợt 2 covers ONLY the login screen + language modal. Later phases add
// namespaces per screen (dashboard, study, practice, ...).
export const vi = {
  login: {
    tagline: 'TỰ TIN CHINH PHỤC\nGIẤC MƠ MỸ!',
    headline1: 'Học thông minh.',
    headline2: 'Đậu phỏng vấn.',
    headline3: 'Trở thành công dân Mỹ.',
    heroSub:
      'N400 Ready là ứng dụng giúp bạn học và luyện thi quốc tịch Mỹ (N-400) một cách hiệu quả, dễ dàng và thú vị.',
    mobileHeroSub:
      'Ứng dụng giúp bạn học và luyện thi quốc tịch Mỹ (N-400) hiệu quả, dễ dàng và thú vị.',
    socialProof:
      'Được xây dựng từ trải nghiệm phỏng vấn quốc tịch Mỹ thực tế và hướng dẫn chính thức mới nhất của USCIS.',
    welcomePrefix: 'Welcome to',
    cardSubtitle: 'Tiếp tục hành trình chinh phục quốc tịch Mỹ 👋',
    continueWith: 'Tiếp tục với',
    or: 'HOẶC',
    continueWithEmail: 'Tiếp tục với Email',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Mật khẩu',
    signingIn: 'Đang đăng nhập...',
    signIn: 'Đăng nhập',
    forgotPassword: 'Quên mật khẩu?',
    createAccount: 'Tạo tài khoản',
    loginFailed: 'Đăng nhập thất bại. Vui lòng thử lại.',
    securityNote1: 'Dữ liệu của bạn được bảo mật tuyệt đối.',
    securityNote2: 'Chúng tôi không chia sẻ thông tin của bạn.',
  },
};

export type N400Dict = typeof vi;
