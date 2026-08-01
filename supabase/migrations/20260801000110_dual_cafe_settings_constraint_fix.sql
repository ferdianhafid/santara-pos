-- Follow-up safety for the dual-cafe migration.
--
-- A short-lived version of the preceding migration added a unique constraint
-- to google_sheet_sync_settings.business_id. Deterministic per-business row IDs
-- already provide the required application behavior, while a pre-existing
-- duplicate settings row could make that unique constraint block rollout.

alter table public.google_sheet_sync_settings
  drop constraint if exists google_sheet_sync_settings_business_key;
