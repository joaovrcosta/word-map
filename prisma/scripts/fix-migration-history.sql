-- Execute once if `prisma migrate dev` reports a missing/old migration record:
-- pnpm exec prisma db execute --file prisma/scripts/fix-migration-history.sql --schema prisma/schema.prisma
--
-- Removes the orphaned migration that was created with an incorrect timestamp
-- (before the init migration that creates UserSettings).

DELETE FROM "_prisma_migrations"
WHERE migration_name = '20250616120000_add_auto_translate_word_preview';
