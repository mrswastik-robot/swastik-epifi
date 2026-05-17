export const openapiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Notes App API",
    description:
      "Multi-user Notes backend REST API. Think backend for Google Keep or Apple Notes.",
    version: "1.0.0",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Note: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          content: { type: "string" },
          ownerId: { type: "string", format: "uuid" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      NoteHistory: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          content: { type: "string" },
          savedAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
  },
  paths: {
    "/register": {
      post: {
        summary: "Register a new user",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User registered successfully" },
          "400": { description: "Validation error" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/login": {
      post: {
        summary: "Login and receive a JWT",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "JWT access token",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { access_token: { type: "string" } },
                },
              },
            },
          },
          "401": { description: "Invalid email or password" },
        },
      },
    },
    "/notes": {
      get: {
        summary: "Get all notes accessible to the authenticated user",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "Paginated list of notes",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Note" },
                    },
                    meta: {
                      type: "object",
                      properties: {
                        total: { type: "integer" },
                        page: { type: "integer" },
                        limit: { type: "integer" },
                        totalPages: { type: "integer" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        summary: "Create a new note",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Created note",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Note" },
              },
            },
          },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/notes/search": {
      get: {
        summary: "Full-text search across accessible notes",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 20 },
          },
        ],
        responses: {
          "200": { description: "Search results" },
          "400": { description: "Missing or empty query" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/notes/{id}": {
      get: {
        summary: "Get a specific note by ID",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Note data",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Note" },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found" },
        },
      },
      put: {
        summary: "Update a note (owner only)",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated note" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found or not owner" },
        },
      },
      delete: {
        summary: "Delete a note (owner only)",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "204": { description: "Deleted" },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found or not owner" },
        },
      },
    },
    "/notes/{id}/share": {
      post: {
        summary: "Share a note with another user",
        tags: ["Notes"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["share_with_email"],
                properties: {
                  share_with_email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Note shared successfully" },
          "400": { description: "Validation error or sharing with self" },
          "401": { description: "Unauthorized" },
          "404": { description: "Note or target user not found" },
        },
      },
    },
    "/notes/{id}/history": {
      get: {
        summary: "Get revision history for a note (owner only)",
        tags: ["Notes", "Revision History"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "List of past snapshots, newest first",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/NoteHistory" },
                },
              },
            },
          },
          "401": { description: "Unauthorized" },
          "404": { description: "Not found or not owner" },
        },
      },
    },
    "/notes/{id}/history/{historyId}/restore": {
      post: {
        summary: "Restore a past snapshot as the current note (owner only)",
        tags: ["Notes", "Revision History"],
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
          {
            name: "historyId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": { description: "Restored note" },
          "401": { description: "Unauthorized" },
          "404": { description: "Note or snapshot not found" },
        },
      },
    },
    "/about": {
      get: {
        summary: "About this application",
        tags: ["Meta"],
        responses: {
          "200": { description: "Author and feature info" },
        },
      },
    },
    "/openapi.json": {
      get: {
        summary: "OpenAPI 3.0 specification",
        tags: ["Meta"],
        responses: {
          "200": { description: "OpenAPI JSON" },
        },
      },
    },
  },
};
