\set ON_ERROR_STOP on
\ir /schema/install.sql

-- Marcador local: o healthcheck só aceita o servidor após o instalador completo.
CREATE SCHEMA qa_fixture;
REVOKE ALL ON SCHEMA qa_fixture FROM PUBLIC;
CREATE TABLE qa_fixture.environment (
    ready BOOLEAN NOT NULL CHECK (ready),
    installed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO qa_fixture.environment (ready) VALUES (true);
CREATE TABLE qa_fixture.seed_version (
    version INTEGER PRIMARY KEY,
    reference_date DATE NOT NULL,
    loaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
