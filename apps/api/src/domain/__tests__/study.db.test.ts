/**
 * Integration tests that need real Postgres (FOR UPDATE).
 * Run with: RUN_DB_TESTS=1 npm test -- study.db
 */
import { PrismaClient } from "@prisma/client";
import { bindPrisma } from "../../prisma/client";
import { runWithUser, type User } from "../../auth/current-user";
import {
  ensureUserSettings,
  getStudyToday,
  recordStudyHeartbeat,
  updateDailyGoalMinutes,
} from "../study";

const runDb = process.env.RUN_DB_TESTS === "1";
const describeDb = runDb ? describe : describe.skip;

describeDb("study heartbeat (postgres)", () => {
  const client = new PrismaClient();
  let userId = 0;

  beforeAll(async () => {
    bindPrisma(client);
    const user = await client.user.create({
      data: {
        name: "Study Test",
        email: `study-test-${Date.now()}@example.com`,
        username: `study_${Date.now().toString(36)}`.slice(0, 20),
      },
    });
    userId = user.id;
    await ensureUserSettings(userId);
  });

  afterAll(async () => {
    await client.$executeRaw`DELETE FROM "StudyDay" WHERE "userId" = ${userId}`;
    await client.$executeRaw`DELETE FROM "UserSettings" WHERE "userId" = ${userId}`;
    await client.user.delete({ where: { id: userId } });
    await client.$disconnect();
  });

  function asUser<T>(fn: () => Promise<T>): Promise<T> {
    const user: User = {
      id: userId,
      name: "Study Test",
      email: "study@test",
      username: "study",
      createdAt: new Date(),
      updatedAt: new Date(),
      role: "USER",
    };
    return runWithUser(user, fn);
  }

  it("Promise.all de dois heartbeats não passa do tempo real", async () => {
    const now = new Date("2026-10-28T18:00:00Z");
    await client.$executeRaw`
      UPDATE "UserSettings" SET "creditedUntil" = NULL WHERE "userId" = ${userId}
    `;
    await client.$executeRaw`DELETE FROM "StudyDay" WHERE "userId" = ${userId}`;

    const [a, b] = await asUser(() =>
      Promise.all([
        recordStudyHeartbeat({ kind: "reading", seconds: 30, now }),
        recordStudyHeartbeat({ kind: "practice", seconds: 30, now }),
      ])
    );

    expect(Math.max(a.seconds, b.seconds)).toBeLessThanOrEqual(30);
    const rows = await client.$queryRaw<Array<{ seconds: number }>>`
      SELECT seconds FROM "StudyDay" WHERE "userId" = ${userId}
    `;
    expect(rows[0]?.seconds ?? 0).toBeLessThanOrEqual(30);
  });

  it("upgrade de meta após completo não revoga completedAt", async () => {
    const now = new Date("2026-10-29T18:00:00Z");
    await client.$executeRaw`
      UPDATE "UserSettings"
      SET "dailyGoalMinutes" = 5, "currentStreak" = 0, "bestStreak" = 0,
          "lastGoalDate" = NULL, "creditedUntil" = NULL
      WHERE "userId" = ${userId}
    `;
    await client.$executeRaw`DELETE FROM "StudyDay" WHERE "userId" = ${userId}`;

    let cursor = now;
    await asUser(async () => {
      for (let i = 0; i < 10; i++) {
        await recordStudyHeartbeat({ kind: "reading", seconds: 30, now: cursor });
        cursor = new Date(cursor.getTime() + 30_000);
      }
    });

    const completed = await asUser(() => getStudyToday(cursor));
    expect(completed.completed).toBe(true);
    expect(completed.currentStreak).toBe(1);

    const afterUpgrade = await asUser(() => updateDailyGoalMinutes(20, cursor));
    expect(afterUpgrade.completed).toBe(true);
    expect(afterUpgrade.goalMinutes).toBe(20);
    expect(afterUpgrade.currentStreak).toBe(1);

    const rows = await client.$queryRaw<Array<{ completedAt: Date | null }>>`
      SELECT "completedAt" FROM "StudyDay" WHERE "userId" = ${userId}
    `;
    expect(rows[0]?.completedAt).not.toBeNull();
  });

  it("GET today com gap de 2 dias devolve streak 0", async () => {
    const now = new Date("2026-10-30T18:00:00Z");
    await client.$executeRaw`
      UPDATE "UserSettings"
      SET "currentStreak" = 9, "bestStreak" = 9, "lastGoalDate" = '2026-10-27'
      WHERE "userId" = ${userId}
    `;
    const today = await asUser(() => getStudyToday(now));
    expect(today.currentStreak).toBe(0);
  });
});
