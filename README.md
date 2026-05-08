# Interview AI

English | Vietnamese

---

## Project Overview (EN)

Interview AI is a full-stack web application for practicing and recording technical interviews. It provides candidate authentication, timed interview sessions with video recording, automated report generation, interview history, and payment integration.

This repository contains two main folders: `client` (React + Vite) and `server` (Node.js + Express).

## Tổng quan dự án (VI)

Interview AI là một ứng dụng web full-stack giúp luyện phỏng vấn kỹ thuật, ghi hình phiên phỏng vấn, tạo báo cáo tự động, lưu lịch sử phỏng vấn và tích hợp thanh toán.

Kho chứa gồm hai thư mục chính: `client` (React + Vite) và `server` (Node.js + Express).

---

## Features (EN)

- User authentication (signup/signin)
- Timed interview sessions with video recording
- Interview history and downloadable reports
- Admin / User roles and profile management
- Payment flow (VNPAY integration)
- Firebase for media storage and optional authentication

## Tính năng (VI)

- Đăng ký/đăng nhập người dùng
- Phiên phỏng vấn có đếm giờ và ghi hình video
- Lịch sử phỏng vấn và báo cáo có thể tải về
- Quản lý vai trò và hồ sơ
- Thanh toán tích hợp (VNPAY)
- Sử dụng Firebase để lưu trữ media và tùy chọn auth

---

## Tech Stack (EN)

- Frontend: React, Vite, Redux
- Backend: Node.js, Express
- Database: MongoDB (assumed via `connectDb.js`)
- Storage / Media: Firebase Storage
- Payment: VNPAY service

## Công nghệ (VI)

- Frontend: React, Vite, Redux
- Backend: Node.js, Express
- Cơ sở dữ liệu: MongoDB
- Lưu trữ media: Firebase Storage
- Thanh toán: Dịch vụ VNPAY

---

## Repository Structure (EN)

- `client/` — React app (UI, components, pages, Redux slices)
- `server/` — Express API (controllers, routes, models, services)
  - `controllers/` — request handlers
  - `routes/` — API routes
  - `models/` — Mongoose models
  - `services/` — third-party integrations (VNPAY, openRouter)
  - `middlewares/` — auth, file upload (multer)

## Cấu trúc repo (VI)

- `client/` — ứng dụng React (giao diện, component, trang, Redux)
- `server/` — API Express (controllers, routes, models, services)
  - `controllers/` — xử lý request
  - `routes/` — định nghĩa API
  - `models/` — Mongoose models
  - `services/` — tích hợp bên thứ ba (VNPAY, openRouter)
  - `middlewares/` — xác thực, upload file (multer)

---

## Prerequisites (EN)

- Node.js v16+ (recommended)
- npm or yarn
- MongoDB instance (local or cloud)
- Firebase project and Service Account / API keys if using Firebase Storage

## Yêu cầu trước (VI)

- Node.js v16+ (khuyến nghị)
- npm hoặc yarn
- MongoDB (cục bộ hoặc cloud)
- Firebase project và khóa nếu dùng Firebase Storage

---

## Environment Variables (EN)

Create `.env` files for `client` and `server` as needed. Typical variables for `server` (example):

- `PORT` - server port (e.g., 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - secret for signing JWT tokens
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, etc. - Firebase config
- `VNPAY_TMNCODE`, `VNPAY_HASHSECRET`, `VNPAY_RETURN_URL` - VNPAY credentials

## Biến môi trường (VI)

Tạo file `.env` cho `client` và `server` nếu cần. Ví dụ biến cho `server`:

- `PORT` - cổng server (ví dụ `5000`)
- `MONGODB_URI` - chuỗi kết nối MongoDB
- `JWT_SECRET` - khóa bí mật JWT
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, ... - cấu hình Firebase
- `VNPAY_TMNCODE`, `VNPAY_HASHSECRET`, `VNPAY_RETURN_URL` - thông tin VNPAY

---

## Setup & Run (EN)

1. Install dependencies for both client and server:

```bash
# from repo root
cd client
npm install

cd ../server
npm install
```

2. Configure environment variables in `server/.env` and `client/.env`.

3. Run development servers:

```bash
# Start backend
cd server
npm run dev

# In another terminal: start frontend
cd ../client
npm run dev
```

4. Build for production (optional):

```bash
cd client
npm run build

cd ../server
npm start
```

## Cài đặt & Chạy (VI)

1. Cài dependencies cho `client` và `server`:

```bash
# từ thư mục gốc
cd client
npm install

cd ../server
npm install
```

2. Cấu hình biến môi trường trong `server/.env` và `client/.env`.

3. Chạy môi trường phát triển:

```bash
# Start backend
cd server
npm run dev

# Terminal khác: start frontend
cd ../client
npm run dev
```

4. Build production (tuỳ chọn):

```bash
cd client
npm run build

cd ../server
npm start
```

---

## Firebase & Media Storage (EN)

If the app uses Firebase for video/media storage, set up a Firebase project and enable Storage. Add the Firebase config to the client and server as needed. For server-side service account usage (if any), keep service account keys secure and out of source control.

## Firebase & Lưu trữ media (VI)

Nếu dùng Firebase để lưu video/media, tạo Firebase project và bật Storage. Thêm cấu hình Firebase cho client/server. Nếu dùng service account ở backend, giữ khóa an toàn và không push lên git.

---

## VNPAY Payment (EN)

Payment integration is in `server/services/vnpay.service.js` and `server/controllers/payment.controller.js`. Obtain credentials from VNPAY (TMN code, hash secret, return URL) and set environment variables.

## Thanh toán VNPAY (VI)

Tích hợp thanh toán nằm trong `server/services/vnpay.service.js` và `server/controllers/payment.controller.js`. Lấy thông tin từ VNPAY (TMN code, hash secret, return URL) và thêm vào biến môi trường.

---

## API Endpoints (EN)

See `server/routes/` for route definitions. Typical endpoints:

- `POST /api/auth/register` - user signup
- `POST /api/auth/login` - user login
- `GET /api/interviews` - list interviews
- `POST /api/interviews` - create interview session
- `POST /api/payments` - create payment

Check the actual route files for full list and payloads.

## API (VI)

Xem `server/routes/` để biết các route. Một vài endpoint thường thấy:

- `POST /api/auth/register` - đăng ký
- `POST /api/auth/login` - đăng nhập
- `GET /api/interviews` - danh sách phỏng vấn
- `POST /api/interviews` - tạo phiên phỏng vấn
- `POST /api/payments` - tạo thanh toán

Kiểm tra các file route để biết chi tiết payload.

---

## Testing (EN)

- Unit/integration tests: Add tests as needed (not included by default).
- Manual testing: Use Postman or similar to call API endpoints.

## Kiểm thử (VI)

- Unit/integration: Thêm tests khi cần (chưa có sẵn).
- Kiểm thử thủ công: Dùng Postman để gọi API.

---

## Deployment (EN)

- Backend: can be deployed to any Node hosting (Heroku, DigitalOcean, AWS, Azure). Ensure environment variables and MongoDB are configured.
- Frontend: build static assets (`npm run build`) and serve via a static host or behind the backend.

## Triển khai (VI)

- Backend: có thể deploy lên Heroku, DigitalOcean, AWS, Azure. Cấu hình biến môi trường và MongoDB.
- Frontend: build bằng `npm run build` và phục vụ tệp tĩnh hoặc host riêng.

---

## Contributing (EN)

Contributions are welcome. Please open issues for bugs or feature requests, and send pull requests with clear descriptions.

## Góp phần (VI)

Hoan nghênh đóng góp. Mở issue cho bug/feature và gửi pull request kèm mô tả rõ ràng.

---

## License (EN)

Specify your license here (e.g., MIT). If none set, add a `LICENSE` file.

## Giấy phép (VI)

Chỉ rõ giấy phép (ví dụ MIT). Nếu chưa có, thêm file `LICENSE`.

---

## Contact (EN)

For questions or help, contact the project owner / maintainer.

## Liên hệ (VI)

Nếu cần giúp đỡ, liên hệ với người duy trì dự án.

---

Thanks for using Interview AI — chúc bạn phát triển dự án tốt!
