--liquibase formatted sql

--changeset teamlab:004-import-batch-inserts
-- Hibernate reserves ids 50 at a time (pooled sequence) for delivery points and revenues, so the import can send its
-- inserts in JDBC batches instead of one round trip per row (US-02: 5,000 rows in less than 5 s).
-- Plain INSERTs using the column default keep working: they just take the next free block.
ALTER SEQUENCE delivery_point_id_seq INCREMENT BY 50;
ALTER SEQUENCE revenue_id_seq INCREMENT BY 50;
--rollback ALTER SEQUENCE delivery_point_id_seq INCREMENT BY 1;
--rollback ALTER SEQUENCE revenue_id_seq INCREMENT BY 1;
