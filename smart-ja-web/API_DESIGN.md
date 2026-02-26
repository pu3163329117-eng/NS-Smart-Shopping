# NS Smart Shopping - API Design Specification

## 1. Overview
- **Base URL**: `/api/v1`
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token (JWT) in `Authorization` header.

---

## 2. Authentication & User (用户模块)

### 2.1 Register
- **Endpoint**: `POST /auth/register`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "Rain"
  }
  ```
- **Response**: `201 Created` with User object + Token.

### 2.2 Login
- **Endpoint**: `POST /auth/login`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "token": "eyJhbG...",
    "user": { "id": 1, "name": "Rain", "avatar": "..." }
  }
  ```

### 2.3 Get Profile
- **Endpoint**: `GET /users/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK` (Full user profile including DNA chart data).

---

## 3. Products & Market (商品与市场)

### 3.1 List Products
- **Endpoint**: `GET /products`
- **Query Params**:
  - `page`: 1
  - `limit`: 20
  - `category`: "digital" | "fashion" | "home"
  - `sort`: "price_asc" | "price_desc" | "newest"
- **Response**: `200 OK` (Paginated list).

### 3.2 Product Detail
- **Endpoint**: `GET /products/:id`
- **Response**: `200 OK` (Detailed info, images, specs, AI evaluation).

### 3.3 Search Products
- **Endpoint**: `GET /products/search`
- **Query Params**: `q=keyword`
- **Response**: `200 OK` (Matching products).

---

## 4. AI Lab (AI 孵化中心)

### 4.1 Chat Completion (Multi-Agent)
- **Endpoint**: `POST /ai/chat`
- **Description**: Centralized endpoint for talking to NS-Planner, NS-Designer, etc.
- **Body**:
  ```json
  {
    "sessionId": "session_123",
    "agentId": "planner", // planner, designer, supply, sales, cfo
    "message": "我想做一个智能花盆",
    "context": [...] // Previous messages context
  }
  ```
- **Response**: `200 OK` (Streamed or full text response).

### 4.2 Get Chat History
- **Endpoint**: `GET /ai/history`
- **Response**: `200 OK` (List of past incubation sessions).

### 4.3 Generate Product Proposal (Planner)
- **Endpoint**: `POST /ai/generate/proposal`
- **Body**: `{ "requirements": "..." }`
- **Response**: `200 OK` (Structured product definition JSON).

---

## 5. Cart & Orders (交易模块)

### 5.1 Get Cart
- **Endpoint**: `GET /cart`
- **Response**: `200 OK` (List of items, total price, discounts).

### 5.2 Add to Cart
- **Endpoint**: `POST /cart/items`
- **Body**: `{ "productId": 123, "quantity": 1, "skuId": 456 }`
- **Response**: `200 OK` (Updated cart).

### 5.3 Create Order
- **Endpoint**: `POST /orders`
- **Body**:
  ```json
  {
    "items": [ ... ],
    "addressId": 1,
    "paymentMethod": "alipay"
  }
  ```
- **Response**: `201 Created` (OrderId, PaymentLink).

---

## 6. Crowdfunding (众筹模块)

### 6.1 List Projects
- **Endpoint**: `GET /crowdfunding/projects`
- **Response**: `200 OK`.

### 6.2 Back a Project (Support)
- **Endpoint**: `POST /crowdfunding/projects/:id/back`
- **Body**: `{ "amount": 100 }`
- **Response**: `200 OK`.

---

## 7. Social (社区动态)

### 7.1 Get Feed
- **Endpoint**: `GET /social/feed`
- **Response**: `200 OK`.

### 7.2 Post Update
- **Endpoint**: `POST /social/posts`
- **Body**: `{ "content": "...", "images": [...] }`
- **Response**: `201 Created`.
