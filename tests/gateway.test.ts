import request from "supertest";
import { createApp } from "../src/app";

// End-to-end gateway tests that cover routing, auth, metadata, and upload flow
// in a happy-path scenario. These assume backing services (DB, Redis, S3/local)
// are reachable in your test environment.

describe("Gateway API", () => {
  const app = createApp();

  const user = {
    email: `gw-test-${Date.now()}@example.com`,
    password: "StrongPass123!",
    name: "Gateway Tester"
  };

  let accessToken: string;
  let fileId: string;

  it("registers a user via gateway", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(user);

    expect(res.status).toBe(201);
    accessToken = res.body.tokens.accessToken;
  });

  it("uploads a file and creates metadata through upload + metadata modules", async () => {
    const res = await request(app)
      .post("/api/v1/upload/single")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("file", Buffer.from("hello world"), "hello.txt");

    expect(res.status).toBe(201);
    expect(res.body.file).toBeDefined();
    fileId = res.body.file.id;
  });

  it("generates a signed URL for the uploaded file", async () => {
    const res = await request(app)
      .get(`/api/v1/files/${fileId}/url`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.url).toContain(`/api/v1/files/${fileId}/stream`);
    expect(res.body.token).toBeTruthy();
  });

  it("streams the file via authenticated endpoint", async () => {
    const res = await request(app)
      .get(`/api/v1/files/${fileId}/stream`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toBeDefined();
  });
});

