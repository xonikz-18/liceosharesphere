# Borrow Request Backend Contract

This workspace only contains the Angular frontend. The real borrow-request backend is not present here, so this file defines the server work needed to replace the current `localStorage` fallback in `src/app/services/borrow-request.service.ts`.

## Required Endpoints

Base URL: `http://localhost:3000/auth/borrow-requests`

### 1. Create borrow request

`POST /auth/borrow-requests`

Request body:

```json
{
  "postId": 12,
  "ownerId": 5,
  "borrowerId": 9
}
```

Success response:

```json
{
  "request": {
    "id": 101,
    "postId": 12,
    "ownerId": 5,
    "borrowerId": 9,
    "status": "pending",
    "requestedAt": "2026-04-10T08:00:00.000Z",
    "updatedAt": "2026-04-10T08:00:00.000Z"
  }
}
```

Rules:

- Reject if borrower is the owner.
- Reject if the post is not `available`.
- Reject if the same borrower already has a `pending` or `approved` request for the same post.

### 2. Get notifications for a user

`GET /auth/borrow-requests/notifications?userId=9`

Success response:

```json
{
  "notifications": [
    {
      "id": 9001,
      "requestId": 101,
      "type": "incoming-request",
      "actorName": "Jane Doe",
      "actorProfilePicture": "https://...",
      "itemName": "Projector",
      "status": "pending",
      "createdAt": "2026-04-10T08:00:00.000Z",
      "message": "Jane Doe requested to borrow \"Projector\"."
    }
  ]
}
```

### 3. Approve a request

`PATCH /auth/borrow-requests/:requestId/approve`

Request body:

```json
{
  "ownerId": 5
}
```

Success response:

```json
{
  "request": {
    "id": 101,
    "status": "approved",
    "updatedAt": "2026-04-10T08:10:00.000Z"
  },
  "post": {
    "id": 12,
    "status": "borrowed"
  }
}
```

Rules:

- Only the owner can approve.
- Approving one request must automatically decline other pending requests for the same post.
- Approving must update the related post status to `borrowed`.

### 4. Decline a request

`PATCH /auth/borrow-requests/:requestId/decline`

Request body:

```json
{
  "ownerId": 5
}
```

### 5. Get borrowed items for a borrower

`GET /auth/borrow-requests/borrowed?userId=9`

Success response:

```json
{
  "items": [
    {
      "requestId": 101,
      "postId": 12,
      "name": "Projector",
      "image": "https://...",
      "owner": "John Smith",
      "ownerProfilePicture": "https://...",
      "requestedAt": "2026-04-10T08:00:00.000Z",
      "approvedAt": "2026-04-10T08:10:00.000Z",
      "status": "borrowed"
    }
  ]
}
```

### 6. Get lent items for an owner

`GET /auth/borrow-requests/lent?userId=5`

Success response:

```json
{
  "items": [
    {
      "requestId": 101,
      "postId": 12,
      "name": "Calculator",
      "image": "https://...",
      "borrower": "Jane Doe",
      "borrowerProfilePicture": "https://...",
      "requestedAt": "2026-04-10T08:00:00.000Z",
      "approvedAt": "2026-04-10T08:10:00.000Z",
      "status": "lent"
    }
  ]
}
```

## Proposed SQL Tables

```sql
CREATE TABLE borrow_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  post_id BIGINT NOT NULL,
  owner_id BIGINT NOT NULL,
  borrower_id BIGINT NOT NULL,
  status ENUM('pending', 'approved', 'declined') NOT NULL DEFAULT 'pending',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_borrow_requests_post FOREIGN KEY (post_id) REFERENCES posts(id),
  CONSTRAINT fk_borrow_requests_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_borrow_requests_borrower FOREIGN KEY (borrower_id) REFERENCES users(id)
);

CREATE INDEX idx_borrow_requests_owner_status ON borrow_requests(owner_id, status);
CREATE INDEX idx_borrow_requests_borrower_status ON borrow_requests(borrower_id, status);
CREATE INDEX idx_borrow_requests_post_status ON borrow_requests(post_id, status);

CREATE TABLE borrow_notifications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  request_id BIGINT NOT NULL,
  recipient_id BIGINT NOT NULL,
  actor_id BIGINT NOT NULL,
  type ENUM('incoming-request', 'request-approved', 'request-declined') NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_borrow_notifications_request FOREIGN KEY (request_id) REFERENCES borrow_requests(id),
  CONSTRAINT fk_borrow_notifications_recipient FOREIGN KEY (recipient_id) REFERENCES users(id),
  CONSTRAINT fk_borrow_notifications_actor FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX idx_borrow_notifications_recipient_read ON borrow_notifications(recipient_id, is_read, created_at);
```

## Required Server Behaviors

- When a request is created, insert one `incoming-request` notification for the owner.
- When a request is approved, insert one `request-approved` notification for the borrower.
- When a request is declined, insert one `request-declined` notification for the borrower.
- When a request is approved, all other pending requests for the same `post_id` must be declined in one transaction.
- Post status must stay aligned with the approved request state.

## Frontend Integration Note

The current frontend already supports this feature through `localStorage`. Once these endpoints exist, the next frontend step is to replace the service persistence in `src/app/services/borrow-request.service.ts` with real `HttpClient` calls and keep `localStorage` only as an optional fallback.