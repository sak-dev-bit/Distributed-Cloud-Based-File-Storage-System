import { dbPool } from "../../config/db";
import { UserRole } from "../../config/jwt";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  role: UserRole;
  createdAt: Date;
}

export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await dbPool.query(
    `
      SELECT id, email, password_hash AS "passwordHash", name, role, created_at AS "createdAt"
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email.toLowerCase()]
  );

  return result.rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const result = await dbPool.query(
    `
      SELECT id, email, password_hash AS "passwordHash", name, role, created_at AS "createdAt"
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] ?? null;
};

export const createUser = async (params: {
  email: string;
  passwordHash: string;
  name?: string;
  role?: UserRole;
}): Promise<User> => {
  const role = params.role ?? "user";

  const result = await dbPool.query(
    `
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, password_hash AS "passwordHash", name, role, created_at AS "createdAt"
    `,
    [params.email.toLowerCase(), params.passwordHash, params.name ?? null, role]
  );

  return result.rows[0];
};

