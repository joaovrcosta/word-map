import { PrismaClient } from "@prisma/client";
import { migrateLegacyWordToFsrs } from "@word-map/shared/fsrs-schedule.js";

const prisma = new PrismaClient();

async function main() {
  let migrated = 0;
  for (;;) {
    const batch = await prisma.word.findMany({
      where: { dueAt: null },
      select: {
        id: true,
        confidence: true,
        lastPractice: true,
      },
      take: 200,
      orderBy: { id: "asc" },
    });
    if (batch.length === 0) break;
    for (const word of batch) {
      const patch = migrateLegacyWordToFsrs({
        wordId: word.id,
        confidence: word.confidence,
        lastPractice: word.lastPractice,
      });
      await prisma.word.update({
        where: { id: word.id },
        data: {
          fsrsState: patch.fsrsState,
          stability: patch.stability,
          difficulty: patch.difficulty,
          dueAt: patch.dueAt,
          scheduledDays: patch.scheduledDays,
          learningSteps: patch.learningSteps,
          reps: patch.reps,
          lapses: patch.lapses,
          lastReview: patch.lastReview,
          confidence: patch.confidence,
          lastPractice: patch.lastPractice,
        },
      });
      migrated += 1;
    }
    if (batch.length < 200) break;
  }
  console.log(`Migrated ${migrated} words to FSRS.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
