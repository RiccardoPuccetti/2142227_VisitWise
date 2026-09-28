--liquibase formatted sql

--changeset teamlab:dev-100-demo-tenant context:dev
-- DEV ONLY (Liquibase context "dev", the docker compose default): a tenant everybody on the team can log in with.
-- Login: demo.federation@visitwise.test / visitwise-demo (README). The hash is Argon2id, made with PasswordConfig.
-- The password is public: never run the "dev" context on a machine that holds real data for someone else.
INSERT INTO tenant (name, email, password_hash)
VALUES ('Demo federation', 'demo.federation@visitwise.test',
        '{argon2}$argon2id$v=19$m=19456,t=2,p=1$/b3IGPBu1LUaNd2VbqK/Bw$zcVDzhody8uIo0mdpcETy5wx9nl/j4/VovVxRvE6kF0')
ON CONFLICT (email) DO NOTHING;
