--liquibase formatted sql

--changeset teamlab:006-tenant-starting-base
-- US-35: the tenant's starting base, typed once as an address in the planner and geocoded. Every plan starts and
-- ends each working day here. All columns are NULL until the tenant saves a base (the planner then uses the default).
ALTER TABLE tenant
    ADD COLUMN base_address   VARCHAR(255),
    ADD COLUMN base_city      VARCHAR(120),
    ADD COLUMN base_latitude  DOUBLE PRECISION,
    ADD COLUMN base_longitude DOUBLE PRECISION;
