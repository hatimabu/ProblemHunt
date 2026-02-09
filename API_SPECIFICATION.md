# API Specification - ProblemHunt Backend

## Overview

All endpoints are secured with Supabase JWT authentication. Every request must include:

```
Authorization: Bearer <access_token>
```

The JWT is verified using HS256 with `SUPABASE_JWT_SECRET`.

## Authentication Flow

1. **Client obtains JWT from Supabase** during login
2. **Every request includes** `Authorization: Bearer <token>`
3. **Backend validates** JWT signature & expiration
4. **User ID extracted** from JWT 'sub' claim
5. **Request proceeds** with authenticated user context

## Response Format

### Success (2xx)
```json
{
  "id": "uuid",
  "user_id": "user-uuid",
  "title": "string",
  "content": "string",
  "tags": ["string"],
  "upvotes": 0,
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp"
}
```

### Error (4xx/5xx)
```json
{
  "error": "Human-readable error message"
}
```

## Endpoints

---

## 1. Create Post

**Endpoint**: POST `/api/create-post`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Create a new post for the authenticated user

**Request Headers**:
```
Content-Type: application/json
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "title": "Problem Title",
  "content": "Detailed description of the problem",
  "tags": ["tag1", "tag2"]
}
```

**Request Validation**:
- `title`: Required, non-empty string (max 500 chars)
- `content`: Required, non-empty string (max 5000 chars)
- `tags`: Optional, array of strings (max 10 tags)

**Response**: 201 Created
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "title": "Problem Title",
  "content": "Detailed description of the problem",
  "tags": ["tag1", "tag2"],
  "upvotes": 0,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T10:30:00.000000"
}
```

**Error Responses**:
- 400: Invalid request body (missing title or content)
- 401: Missing or invalid Authorization header
- 500: Internal server error

**Example**:
```javascript
const response = await authenticatedFetch('/api/create-post', {
  method: 'POST',
  body: {
    title: 'Login button not working',
    content: 'When I click the login button...',
    tags: ['bug', 'urgent']
  }
});
const post = await handleResponse(response);
```

---

## 2. Get Posts

**Endpoint**: GET `/api/get-posts`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Retrieve all posts for the authenticated user

**Query Parameters**:
- `limit` (optional): Number of posts to return (default: 10, max: 100)
- `offset` (optional): Number of posts to skip for pagination (default: 0)

**Response**: 200 OK
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "title": "First Post",
    "content": "Content",
    "tags": ["tag1"],
    "upvotes": 5,
    "created_at": "2024-01-15T10:30:00.000000",
    "updated_at": "2024-01-15T10:30:00.000000"
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "user_id": "user-123",
    "title": "Second Post",
    "content": "Content",
    "tags": [],
    "upvotes": 3,
    "created_at": "2024-01-14T14:20:00.000000",
    "updated_at": "2024-01-14T14:20:00.000000"
  }
]
```

**Error Responses**:
- 401: Missing or invalid Authorization header
- 400: Invalid limit or offset parameters
- 500: Internal server error

**Example**:
```javascript
// Get first 20 posts
const posts = await authenticatedFetch('/api/get-posts?limit=20&offset=0', {
  method: 'GET'
});
const data = await handleResponse(posts);

// Get page 2 (20-40)
const page2 = await authenticatedFetch('/api/get-posts?limit=20&offset=20', {
  method: 'GET'
});
```

---

## 3. Get Post by ID

**Endpoint**: GET `/api/get-post/{post_id}`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Retrieve a specific post by ID (user must own the post)

**Path Parameters**:
- `post_id` (required): The ID of the post to retrieve

**Response**: 200 OK
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "title": "Post Title",
  "content": "Post content",
  "tags": ["tag1"],
  "upvotes": 5,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T10:30:00.000000"
}
```

**Error Responses**:
- 401: Missing or invalid Authorization header
- 404: Post not found
- 403: User does not own this post
- 500: Internal server error

**Example**:
```javascript
const response = await authenticatedFetch('/api/get-post/550e8400-e29b-41d4-a716-446655440000', {
  method: 'GET'
});
const post = await handleResponse(response);
```

---

## 4. Update Post

**Endpoint**: PUT `/api/update-post`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Update fields of an existing post

**Request Body**:
```json
{
  "post_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Updated Title",
  "content": "Updated content",
  "tags": ["newtag"]
}
```

**Request Validation**:
- `post_id`: Required, must belong to authenticated user
- `title`, `content`, `tags`: At least one required to update

**Response**: 200 OK
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-123",
  "title": "Updated Title",
  "content": "Updated content",
  "tags": ["newtag"],
  "upvotes": 5,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T11:45:00.000000"
}
```

**Error Responses**:
- 400: Invalid request body
- 401: Missing or invalid Authorization header
- 404: Post not found
- 403: User does not own this post
- 500: Internal server error

**Example**:
```javascript
const response = await authenticatedFetch('/api/update-post', {
  method: 'PUT',
  body: {
    post_id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Updated Title'
  }
});
const updated = await handleResponse(response);
```

---

## 5. Delete Post

**Endpoint**: DELETE `/api/delete-post/{post_id}`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Delete a post (user must own the post)

**Path Parameters**:
- `post_id` (required): The ID of the post to delete

**Response**: 200 OK
```json
{
  "message": "Post deleted successfully",
  "post_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- 401: Missing or invalid Authorization header
- 404: Post not found
- 403: User does not own this post
- 500: Internal server error

**Example**:
```javascript
const response = await authenticatedFetch('/api/delete-post/550e8400-e29b-41d4-a716-446655440000', {
  method: 'DELETE'
});
const result = await handleResponse(response);
console.log(result.message); // "Post deleted successfully"
```

---

## 6. Upvote Post

**Endpoint**: POST `/api/upvote-post/{post_id}`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Increment upvote count for a post

**Path Parameters**:
- `post_id` (required): The ID of the post to upvote

**Response**: 200 OK
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-owner",
  "title": "Post Title",
  "content": "Post content",
  "tags": ["tag1"],
  "upvotes": 6,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T11:50:00.000000"
}
```

**Error Responses**:
- 401: Missing or invalid Authorization header
- 404: Post not found
- 500: Internal server error

**Example**:
```javascript
const response = await authenticatedFetch('/api/upvote-post/550e8400-e29b-41d4-a716-446655440000', {
  method: 'POST'
});
const updated = await handleResponse(response);
console.log('New upvote count:', updated.upvotes);
```

---

## 7. Remove Upvote

**Endpoint**: DELETE `/api/remove-upvote/{post_id}`

**Authentication**: ✅ Required (Bearer Token)

**Description**: Decrement upvote count for a post

**Path Parameters**:
- `post_id` (required): The ID of the post to remove upvote from

**Response**: 200 OK
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user-owner",
  "title": "Post Title",
  "content": "Post content",
  "tags": ["tag1"],
  "upvotes": 4,
  "created_at": "2024-01-15T10:30:00.000000",
  "updated_at": "2024-01-15T11:55:00.000000"
}
```

**Error Responses**:
- 401: Missing or invalid Authorization header
- 404: Post not found
- 500: Internal server error

**Example**:
```javascript
const response = await authenticatedFetch('/api/remove-upvote/550e8400-e29b-41d4-a716-446655440000', {
  method: 'DELETE'
});
const updated = await handleResponse(response);
console.log('New upvote count:', updated.upvotes);
```

---

## Common Headers

### Request Headers (All Endpoints)
```
Authorization: Bearer <access_token>     (Required)
Content-Type: application/json           (Required for POST/PUT)
```

### Response Headers (All Endpoints)
```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```

## Error Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or missing fields |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | User doesn't have permission (not owner) |
| 404 | Not Found | Resource doesn't exist |
| 500 | Server Error | Unexpected server error |

## Rate Limiting

Currently no rate limiting is enforced, but in production:
- Consider 100 requests per minute per user
- Implement via Azure API Management or Function App throttling

## Data Types

| Type | Format | Example |
|------|--------|---------|
| UUID | RFC 4122 | `550e8400-e29b-41d4-a716-446655440000` |
| Timestamp | ISO 8601 | `2024-01-15T10:30:00.000000` |
| String | UTF-8 | `"Hello World"` |
| Number | Integer | `5` |
| Array | JSON array | `["tag1", "tag2"]` |

## Pagination Strategy

Use offset-based pagination:

```javascript
// Example: Get 20 posts per page
const pageSize = 20;
const page = 2; // Get second page
const offset = (page - 1) * pageSize; // 20

const response = await authenticatedFetch(
  `/api/get-posts?limit=${pageSize}&offset=${offset}`,
  { method: 'GET' }
);
```

Limits:
- Maximum `limit`: 100
- Minimum `limit`: 1 (default 10)
- Minimum `offset`: 0

## Best Practices

1. **Always include Authorization header** on every request
2. **Handle 401 errors** by redirecting to login
3. **Implement pagination** for large result sets
4. **Use ETags** for caching responses (future enhancement)
5. **Implement retry logic** for 5xx errors
6. **Log all API errors** for debugging
7. **Validate data** on client before sending
8. **Use descriptive variable names** when building URLs

## Testing with cURL

```bash
# Set your token
TOKEN="eyJhbGc..."

# Create post
curl -X POST http://localhost:7071/api/create-post \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test content","tags":["test"]}'

# Get posts
curl -X GET "http://localhost:7071/api/get-posts?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"

# Delete post
curl -X DELETE http://localhost:7071/api/delete-post/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

## Version History

- **v1.0** (Current): Initial release with full CRUD operations

## Future Enhancements

- [ ] Search posts by title/content/tags
- [ ] Filter posts by date range
- [ ] Batch operations (delete multiple posts)
- [ ] User profile endpoints
- [ ] Comments/replies on posts
- [ ] Real-time updates via WebSocket
- [ ] Post visibility settings (public/private)
