import crypto from "crypto";
import { storeBuffer, storeChunks, buildStorageKey } from "../src/modules/storage/storage.service";
import { concatChunks } from "../src/modules/storage/chunk.manager";

describe("Storage service", () => {
  it("builds readable storage keys", () => {
    const key = buildStorageKey("user-123", "My File.pdf");
    expect(key).toMatch(/^user\/user-123\/uploads\/\d+-My_File\.pdf$/);
  });

  it("concatenates chunks in order", () => {
    const chunks = [
      { index: 1, buffer: Buffer.from("world") },
      { index: 0, buffer: Buffer.from("hello ") }
    ];
    const combined = concatChunks(chunks);
    expect(combined.toString()).toBe("hello world");
  });

  it("rejects uploads when checksum does not match", async () => {
    const buffer = Buffer.from("test-data");
    const fakeChecksum = crypto.createHash("sha256").update("other-data").digest("hex");

    await expect(
      storeBuffer({
        key: buildStorageKey("user-1", "file.txt"),
        mimeType: "text/plain",
        buffer,
        expectedChecksum: fakeChecksum
      })
    ).rejects.toBeDefined();
  });

  it("uploads from chunks and returns checksum", async () => {
    const chunks = [
      { index: 0, buffer: Buffer.from("part1-") },
      { index: 1, buffer: Buffer.from("part2") }
    ];

    const result = await storeChunks({
      key: buildStorageKey("user-1", "chunked.txt"),
      mimeType: "text/plain",
      chunks
    });

    expect(result.storageKey).toContain("chunked.txt");
    expect(result.sizeBytes).toBe(11);
    expect(result.checksum).toHaveLength(64);
  });
});

