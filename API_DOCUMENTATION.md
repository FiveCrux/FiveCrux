# API Documentation

## Authentication
All API routes require authentication via NextAuth session.

## Script APIs

### POST /api/scripts
**Create a new script**

**Headers:** `Content-Type: application/json`

**Payload:**
```json
{
  "title": "string (required)",
  "description": "string (required)", 
  "price": "string (required)",
  "original_price": "string (optional)",
  "category": "string (required)",
  "framework": "string | string[] (required)",
  "tags": "string[] (optional, default: [])",
  "features": "string[] (optional, default: [])",
  "requirements": "string[] (optional, default: [])",
  "images": "string[] (optional, default: [])",
  "videos": "string[] (optional, default: [])",
  "screenshots": "string[] (optional, default: [])",
  "cover_image": "string (optional)",
  "demo_url": "string (optional)",
  "documentation_url": "string (optional)",
  "support_url": "string (optional)",
  "featured": "boolean (optional, default: false)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Script created and approved successfully!",
  "scriptId": 123,
  "status": "approved"
}
```

### GET /api/scripts
**Get all scripts with filters**

**Query Parameters:**
- `category` (optional): Filter by category
- `framework` (optional): Filter by framework (comma-separated)
- `status` (optional): Filter by status (default: "approved")
- `featured` (optional): Filter featured scripts (true/false)
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "scripts": [
    {
      "id": 123,
      "title": "Script Title",
      "description": "Script description",
      "price": "29.99",
      "category": "automation",
      "framework": ["react", "nextjs"],
      "seller_name": "John Doe",
      "seller_email": "john@example.com",
      "seller_id": "123456789012345678",
      "tags": ["automation", "productivity"],
      "featured": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/user/scripts
**Create script via user endpoint**

**Payload:** Same as `/api/scripts`

**Response:**
```json
{
  "success": true,
  "scriptId": 123,
  "message": "Script created successfully"
}
```

### GET /api/user/scripts
**Get user's scripts**

**Response:**
```json
{
  "scripts": [
    {
      "id": 123,
      "title": "My Script",
      "status": "pending",
      "seller_id": "123456789012345678",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### PATCH /api/user/scripts
**Update user's script**

**Payload:**
```json
{
  "scriptId": 123,
  "title": "Updated Title",
  "description": "Updated description",
  "price": "39.99"
}
```

### DELETE /api/user/scripts?id=123
**Delete user's script**

**Query Parameters:**
- `id` (required): Script ID to delete

## Giveaway APIs

### POST /api/giveaways
**Create a new giveaway**

**Payload:**
```json
{
  "giveaway": {
    "title": "string (required)",
    "description": "string (required)",
    "total_value": "string (required)",
    "category": "string (required)",
    "end_date": "string (required)",
    "max_entries": "number (optional)",
    "difficulty": "string (required)",
    "featured": "boolean (optional, default: false)",
    "auto_announce": "boolean (optional, default: false)",
    "creator_name": "string (required)",
    "creator_email": "string (required)",
    "images": "string[] (optional, default: [])",
    "videos": "string[] (optional, default: [])",
    "cover_image": "string (optional)",
    "tags": "string[] (optional, default: [])",
    "rules": "string[] (optional, default: [])"
  },
  "requirements": [
    {
      "type": "string (required)",
      "description": "string (required)",
      "points": "number (required)",
      "required": "boolean (optional, default: true)",
      "link": "string (optional)"
    }
  ],
  "prizes": [
    {
      "position": "number (required)",
      "name": "string (required)",
      "description": "string (optional)",
      "value": "string (required)"
    }
  ]
}
```

### GET /api/giveaways
**Get all giveaways**

**Query Parameters:**
- `category` (optional): Filter by category
- `status` (optional): Filter by status
- `featured` (optional): Filter featured giveaways
- `limit` (optional): Number of results
- `offset` (optional): Pagination offset

## Ad APIs

### POST /api/ads
**Create a new ad**

**Payload:**
```json
{
  "title": "string (required)",
  "description": "string (required)",
  "image_url": "string (optional)",
  "link_url": "string (optional)",
  "category": "string (required) - must be 'both', 'scripts', or 'giveaways'",
  "priority": "number (optional, default: 1)",
  "start_date": "string (optional)",
  "end_date": "string (optional)"
}
```

### GET /api/ads
**Get all ads**

**Query Parameters:**
- `category` (optional): Filter by category
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority

## Upload API

### POST /api/upload
**Upload files (images/videos)**

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file` (required): File to upload
- `type` (required): File type - "coverImage", "screenshot", "thumbnail", "demoVideo", "trailerVideo"

**Size Limits:**
- Cover Image: 500KB, 1600x1200px
- Screenshot: 400KB, 1200x900px  
- Thumbnail: 100KB, 400x300px
- Demo Video: 10MB, 1280x720px
- Trailer Video: 25MB, 1920x1080px

**Response:**
```json
{
  "success": true,
  "url": "/uploads/images/filename.jpg",
  "filename": "filename.jpg"
}
```

## Admin APIs

### GET /api/admin/scripts
**Get all scripts for admin review**

### GET /api/admin/giveaways  
**Get all giveaways for admin review**

### GET /api/admin/ads
**Get all ads for admin review**

### GET /api/admin/users
**Get all users**

### PATCH /api/admin/users/[id]/roles
**Update user roles**

**Payload:**
```json
{
  "roles": ["founder", "admin", "verified_creator", "moderator", "user"]
}
```

## Debug APIs

### POST /api/debug/init-db
**Initialize database (development only)**

### GET /api/debug/user-data
**Get user data for debugging**

### GET /api/debug/user-roles
**Get user roles for debugging**

## Authentication

All APIs require a valid NextAuth session. The session includes:
- `user.id`: Discord snowflake ID
- `user.email`: User email
- `user.name`: User display name
- `user.roles`: Array of user roles
- `user.username`: Discord username

## Error Responses

All APIs return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

**Common Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (missing/invalid data)
- `401`: Unauthorized (no session)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error
