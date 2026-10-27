import { prisma } from "../prisma/client";
import { TUTOR_DAY_LIMIT, TUTOR_MINUTE_LIMIT } from "./tutor";

export type TutorQuotaResult =
  | { allowed: true }
  | { allowed: false; window: "minute" | "day" };

export async function consumeTutorQuota(userId: number): Promise<TutorQuotaResult> {
  const updated = await prisma.$executeRaw`
    INSERT INTO "TutorQuota" ("userId", "minuteStart", "minuteCount", "dayStart", "dayCount")
    VALUES (${userId}, NOW(), 1, NOW(), 1)
    ON CONFLICT ("userId") DO UPDATE SET
      "minuteStart" = CASE
        WHEN "TutorQuota"."minuteStart" < NOW() - INTERVAL '1 minute' THEN NOW()
        ELSE "TutorQuota"."minuteStart"
      END,
      "minuteCount" = CASE
        WHEN "TutorQuota"."minuteStart" < NOW() - INTERVAL '1 minute' THEN 1
        ELSE "TutorQuota"."minuteCount" + 1
      END,
      "dayStart" = CASE
        WHEN "TutorQuota"."dayStart" < NOW() - INTERVAL '1 day' THEN NOW()
        ELSE "TutorQuota"."dayStart"
      END,
      "dayCount" = CASE
        WHEN "TutorQuota"."dayStart" < NOW() - INTERVAL '1 day' THEN 1
        ELSE "TutorQuota"."dayCount" + 1
      END
    WHERE
      (
        "TutorQuota"."minuteStart" < NOW() - INTERVAL '1 minute'
        OR "TutorQuota"."minuteCount" < ${TUTOR_MINUTE_LIMIT}
      )
      AND (
        "TutorQuota"."dayStart" < NOW() - INTERVAL '1 day'
        OR "TutorQuota"."dayCount" < ${TUTOR_DAY_LIMIT}
      )
  `;
  if (Number(updated) > 0) return { allowed: true };

  const row = await prisma.tutorQuota.findUnique({ where: { userId } });
  if (!row) return { allowed: false, window: "minute" };

  const minuteFresh = row.minuteStart.getTime() < Date.now() - 60_000;
  const dayFresh = row.dayStart.getTime() < Date.now() - 86_400_000;
  const dayBlocked = !dayFresh && row.dayCount >= TUTOR_DAY_LIMIT;
  const minuteBlocked = !minuteFresh && row.minuteCount >= TUTOR_MINUTE_LIMIT;

  if (dayBlocked) return { allowed: false, window: "day" };
  if (minuteBlocked) return { allowed: false, window: "minute" };
  return { allowed: false, window: "minute" };
}

export async function refundTutorQuota(userId: number): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "TutorQuota"
    SET
      "minuteCount" = GREATEST("minuteCount" - 1, 0),
      "dayCount" = GREATEST("dayCount" - 1, 0)
    WHERE "userId" = ${userId}
  `;
}
