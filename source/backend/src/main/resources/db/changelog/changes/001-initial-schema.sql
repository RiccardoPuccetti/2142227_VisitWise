--liquibase formatted sql

--changeset teamlab:001-import-batch
CREATE TABLE import_batch (
    id               BIGSERIAL PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    source_file_name VARCHAR(255),
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status           VARCHAR(20)  NOT NULL,
    total_rows       INTEGER      NOT NULL DEFAULT 0,
    imported_rows    INTEGER      NOT NULL DEFAULT 0,
    skipped_rows     INTEGER      NOT NULL DEFAULT 0,
    geocoded_rows    INTEGER      NOT NULL DEFAULT 0,
    column_mapping   TEXT,
    error_message    TEXT
);

--changeset teamlab:001-enterprise
CREATE TABLE enterprise (
    id            BIGSERIAL PRIMARY KEY,
    import_id     BIGINT       NOT NULL REFERENCES import_batch (id) ON DELETE CASCADE,
    source_column VARCHAR(150) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    color         VARCHAR(7),
    position      INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT uq_enterprise_import_name UNIQUE (import_id, name)
);

--changeset teamlab:001-delivery-point
CREATE TABLE delivery_point (
    id             BIGSERIAL PRIMARY KEY,
    import_id      BIGINT        NOT NULL REFERENCES import_batch (id) ON DELETE CASCADE,
    source_row     INTEGER       NOT NULL,
    customer_name  VARCHAR(255)  NOT NULL,
    point_name     VARCHAR(255)  NOT NULL,
    address        VARCHAR(255)  NOT NULL,
    city           VARCHAR(120)  NOT NULL,
    agent          VARCHAR(120),
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    geocode_status VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    total_revenue  NUMERIC(14, 2) NOT NULL DEFAULT 0
);
CREATE INDEX ix_delivery_point_import ON delivery_point (import_id);
CREATE INDEX ix_delivery_point_import_agent ON delivery_point (import_id, agent);

--changeset teamlab:001-revenue
CREATE TABLE revenue (
    id                BIGSERIAL PRIMARY KEY,
    delivery_point_id BIGINT         NOT NULL REFERENCES delivery_point (id) ON DELETE CASCADE,
    enterprise_id     BIGINT         NOT NULL REFERENCES enterprise (id) ON DELETE CASCADE,
    amount            NUMERIC(14, 2) NOT NULL,
    CONSTRAINT uq_revenue_point_enterprise UNIQUE (delivery_point_id, enterprise_id)
);
CREATE INDEX ix_revenue_enterprise ON revenue (enterprise_id);

--changeset teamlab:001-geocode-cache
-- Global cache shared by all imports: an address is geocoded only once, ever.
CREATE TABLE geocode_cache (
    id         BIGSERIAL PRIMARY KEY,
    query_key  VARCHAR(400) NOT NULL UNIQUE,
    latitude   DOUBLE PRECISION,
    longitude  DOUBLE PRECISION,
    found      BOOLEAN      NOT NULL,
    provider   VARCHAR(30)  NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

--changeset teamlab:001-visit-plan
CREATE TABLE visit_plan (
    id         BIGSERIAL PRIMARY KEY,
    import_id  BIGINT       NOT NULL REFERENCES import_batch (id) ON DELETE CASCADE,
    name       VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    parameters TEXT         NOT NULL,
    kpis       TEXT
);
CREATE INDEX ix_visit_plan_import ON visit_plan (import_id);

--changeset teamlab:001-planned-visit
CREATE TABLE planned_visit (
    id                BIGSERIAL PRIMARY KEY,
    plan_id           BIGINT         NOT NULL REFERENCES visit_plan (id) ON DELETE CASCADE,
    delivery_point_id BIGINT         NOT NULL REFERENCES delivery_point (id) ON DELETE CASCADE,
    agent             VARCHAR(120),
    visit_date        DATE           NOT NULL,
    day_index         INTEGER        NOT NULL,
    slot              INTEGER        NOT NULL,
    expected_revenue  NUMERIC(14, 2) NOT NULL,
    travel_km         NUMERIC(8, 2)  NOT NULL DEFAULT 0
);
CREATE INDEX ix_planned_visit_plan ON planned_visit (plan_id);
