--liquibase formatted sql

--changeset teamlab:002-tenant
-- One row per tenant (federation): owner of the data and its only login account. See AUTHENTICATION.md.
CREATE TABLE tenant (
    id                  BIGSERIAL PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    email               VARCHAR(254) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,
    failed_login_count  INTEGER      NOT NULL DEFAULT 0,
    locked_until        TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_login_at       TIMESTAMP WITH TIME ZONE,
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT uq_tenant_email UNIQUE (email),
    CONSTRAINT ck_tenant_email_normalized CHECK (email = lower(btrim(email)))
);
