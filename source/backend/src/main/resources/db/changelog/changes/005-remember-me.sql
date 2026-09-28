--liquibase formatted sql

--changeset teamlab:005-remember-me
-- "Keep me logged in" (US-37, AUTHENTICATION.md A13): Spring Security persistent remember-me tokens, one row per
-- remembered device (series), token replaced at every use. username is the tenant login email.
CREATE TABLE persistent_logins (
    series    VARCHAR(64)              PRIMARY KEY,
    username  VARCHAR(254)             NOT NULL REFERENCES tenant (email) ON DELETE CASCADE,
    token     VARCHAR(64)              NOT NULL,
    last_used TIMESTAMP WITH TIME ZONE NOT NULL
);
CREATE INDEX ix_persistent_logins_username ON persistent_logins (username);
--rollback DROP TABLE persistent_logins;
