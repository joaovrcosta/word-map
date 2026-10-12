import { prisma } from "@/lib/prisma";
import { TUTOR_DAY_LIMIT, TUTOR_MINUTE_LIMIT } from "@/lib/tutor";

export async function consumeTutorQuota(userId: number): Promise<boolean> {
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
  return Number(updated) > 0;
}
