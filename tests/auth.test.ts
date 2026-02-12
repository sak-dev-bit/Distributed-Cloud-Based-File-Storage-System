import request from "supertest";
import { createApp } from "../src/app";

// These tests exercise the auth API end-to-end at the HTTP layer,
// assuming a test database and Redis are available. For a college
// project this is usually enough; if you don't have test infra yet,
// treat these as examples and adapt them to your environment.

describe("Auth API", () => {
  const app = createApp();

  const testUser = {
    email: `testuser+${Date.now()}@example.com`,
    password: "StrongPass123!",
    name: "Test User"
  };

  let accessToken: string;
  let refreshToken: string;

  it("registers a new user", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.tokens).toBeDefined();
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();

    accessToken = res.body.tokens.accessToken;
    refreshToken = res.body.tokens.refreshToken;
  });

  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
    expect(res.body.tokens.accessToken).toBeTruthy();
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("returns current user with /me", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email.toLowerCase());
  });

  it("refreshes tokens", async () => {
    const res = await request(app).post("/api/v1/auth/refresh").send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
  });
});

