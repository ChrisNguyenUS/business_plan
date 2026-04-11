---
name: scaffold-webapp
description: Scaffold một web app mới từ đầu. Dùng khi user muốn tạo project structure, setup boilerplate, hoặc bắt đầu build app với tech stack cụ thể.
---

# Skill: Scaffold Web App

## Before Starting
Ask user:
1. App làm gì? (1 sentence)
2. Tech stack preference? (hoặc để AI suggest)
3. MVP scope: bao nhiêu screens/features?
4. Deploy ở đâu? (Vercel / Firebase / Replit / local)
5. Auth cần không?

## Default Stack (nếu user không chỉ định)
```
Frontend: React + Vite + TailwindCSS
Backend: Firebase (Auth + Firestore) hoặc Supabase
Deploy: Vercel
Language: TypeScript
```

## Scaffold Checklist
- [ ] Tạo folder structure chuẩn
- [ ] Setup dependencies (package.json)
- [ ] Config environment variables (.env.example)
- [ ] Setup routing
- [ ] Base layout component
- [ ] README với setup instructions
- [ ] .gitignore

## Folder Structure Template
```
src/
├── components/     # Reusable UI components
├── pages/          # Route-level components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── services/       # API calls, Firebase config
└── types/          # TypeScript types
```

## Rules
- Mobile-first responsive design
- Dark mode support nếu có thể
- Loading states cho mọi async operation
- Error boundaries
- Không over-engineer cho v1
