/**
 * Idempotent FSRS backfill: only Words with dueAt IS NULL.
 * Run: pnpm --filter @word-map/api exec ts-node -r tsconfig-paths/register src/scripts/migrate-words-fsrs.ts
 */
import { migrateAllWordsWithNullDueAt } from "../domain/word-fsrs";

async function main() {
  const migrated = await migrateAllWordsWithNullDueAt();
  console.log(`Migrated ${migrated} words to FSRS.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
