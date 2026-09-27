--liquibase formatted sql

--changeset teamlab:003-import-tenant
-- Every import belongs to one tenant (D-09); points, revenues and plans hang off the import.
-- NOT NULL without a default: imports created before this change would have no owner (none exist yet).
ALTER TABLE import_batch ADD COLUMN tenant_id BIGINT NOT NULL REFERENCES tenant (id) ON DELETE CASCADE;
CREATE INDEX ix_import_batch_tenant ON import_batch (tenant_id, created_at DESC);
