import { dbPool } from "../src/config/db";
import {
  createFileWithVersion,
  createFolder,
  getFileByIdForUser,
  listFolderChildren
} from "../src/modules/metadata/metadata.model";
import { UserRole } from "../src/config/jwt";

// These tests expect your test database to be reachable and either empty
// or disposable. For a more isolated setup, point DB_* env vars at a
// dedicated test schema before running.

describe("Metadata model", () => {
  let ownerId: string;
  let folderId: string;
  let fileId: string;

  beforeAll(async () => {
    const userResult = await dbPool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [`meta-test-${Date.now()}@example.com`, "hash", "user" as UserRole]
    );
    ownerId = userResult.rows[0].id;
  });

  it("creates a folder for the owner", async () => {
    const folder = await createFolder({ ownerId, name: "root-folder" });
    expect(folder.id).toBeDefined();
    expect(folder.name).toBe("root-folder");
    folderId = folder.id;
  });

  it("creates a file with an initial version", async () => {
    const { file, version } = await createFileWithVersion({
      ownerId,
      folderId,
      name: "doc.txt",
      mimeType: "text/plain",
      sizeBytes: 10,
      storageKey: "user/x/doc.txt",
      checksum: "abc123"
    });

    expect(file.id).toBeDefined();
    expect(version.fileId).toBe(file.id);
    expect(file.currentVersionId).toBe(version.id);
    fileId = file.id;
  });

  it("lists folder children including the created file", async () => {
    const list = await listFolderChildren({ folderId, userId: ownerId, userRole: "user" });
    const foundFile = list.files.find((f) => f.id === fileId);
    expect(foundFile).toBeDefined();
  });

  it("gets file by id for owner", async () => {
    const file = await getFileByIdForUser({ fileId, userId: ownerId, userRole: "user" });
    expect(file).not.toBeNull();
    expect(file!.id).toBe(fileId);
  });
});

