DROP VIEW IF EXISTS used_modules;
DROP VIEW IF EXISTS module_usage;
DROP VIEW IF EXISTS module_usages;
DROP VIEW IF EXISTS active_accounts;
DROP VIEW IF EXISTS accounts;
DROP TABLE IF EXISTS project_modules;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS module_groups;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS users;

-- =========================
-- ====  ACES INTERNAL  ====
-- =========================

DROP TABLE IF EXISTS 'admins';
CREATE TABLE 'admins'
(
    [id] TEXT PRIMARY KEY NOT NULL, -- ObjectId
    [username] TEXT UNIQUE NOT NULL,
    [fullname] TEXT NOT NULL,
    [email] TEXT UNIQUE NOT NULL,
    [secret] TEXT NOT NULL,
    [role] TEXT DEFAULT '',
    [status] TEXT DEFAULT '',
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z')
);

INSERT INTO admins ([id],[username],[fullname],[email],[secret],[role],[status]) VALUES
('6397c47ba009344a26c0db97','poltang','Gaia Poltangan','adminits@gaiasol.com','y2o2X8B4ChDQiH5PB0Wxpmd8SsTaeqg=','super-admin','active');


--
-- 1. users
--
DROP TABLE IF EXISTS 'users';
CREATE TABLE 'users'
(
    [id] TEXT PRIMARY KEY NOT NULL, -- ObjectId
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'), -- 2022-11-23 08:57:31Z
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'), -- 2022-11-23 08:57:31Z
    [username] TEXT UNIQUE NOT NULL,
    [fullname] TEXT NOT NULL,
    [email] TEXT UNIQUE NOT NULL
);
--
-- 2. tenants
--
DROP TABLE IF EXISTS 'tenants';
CREATE TABLE 'tenants'
(
    [id] TEXT PRIMARY KEY NOT NULL,  -- ObjectId
    [adminId] TEXT, -- NOT NULL,
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'), -- 2022-11-23 08:57:31Z
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'), -- 2022-11-23 08:57:31Z
    [expiryDate] TEXT NULL, -- TBD: default 1 year from creation/refresh
    [orgName] TEXT NOT NULL,
    [shortName] TEXT NOT NULL,
    [tenantType] TEXT NOT NULL DEFAULT 'partner' CHECK (tenantType IS 'partner' OR tenantType IS 'corporate'),
    [licenseType] TEXT NOT NULL DEFAULT 'basic' CHECK (licenseType IS 'basic' OR licenseType IS 'pro'),
    [refreshDate] TEXT DEFAULT '',
    [address1] TEXT DEFAULT '',
    [address2] TEXT DEFAULT '',
    [city] TEXT DEFAULT '',
    [province] TEXT DEFAULT '',
    [postcode] TEXT DEFAULT '',
    [phone] TEXT DEFAULT '',
    [email] TEXT DEFAULT '',
    [website] TEXT DEFAULT '',
    [orgType] TEXT DEFAULT '',
    [bizTypes] TEXT DEFAULT '', -- JSON.stringify(types: string[])
    [logo] TEXT DEFAULT '',
    [npwpNomor] TEXT DEFAULT '',
    [npwpNama] TEXT DEFAULT '',
    [npwpNIK] TEXT DEFAULT '',
    [npwpAlamat] TEXT DEFAULT '',
    [npwpKelurahan] TEXT DEFAULT '',
    [npwpKecamatan] TEXT DEFAULT '',
    [npwpKota] TEXT DEFAULT '',
    [npwpProvinsi] TEXT DEFAULT '',
    [contactName] TEXT DEFAULT '',
    [contactPhone] TEXT DEFAULT '',
    [contactEmail] TEXT DEFAULT '',
    [techContactName] TEXT DEFAULT '',
    [techContactPhone] TEXT DEFAULT '',
    [techContactEmail] TEXT DEFAULT '',

    FOREIGN KEY ([adminId]) REFERENCES 'users' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
--
-- 3. members
--
DROP TABLE IF EXISTS 'members';
CREATE TABLE 'members'
(
    [id] TEXT NOT NULL,
    [tenantId] TEXT NOT NULL,
    [role] TEXT DEFAULT '',
    [status] TEXT DEFAULT '',
    [isDefault] BOOLEAN NOT NULL,
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    --
    UNIQUE ([id],[tenantId]),
    FOREIGN KEY ([id]) REFERENCES 'users' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY ([tenantId]) REFERENCES 'tenants' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
--
-- 4. clients
--
DROP TABLE IF EXISTS 'clients';
CREATE TABLE 'clients'
(
    [id] TEXT PRIMARY KEY NOT NULL,  -- P1669197440717-WB09: C + Date().getTime() + random
    [tenantId] TEXT NOT NULL,
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'), -- 2022-11-23 08:57:31Z
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'), -- 2022-11-23 08:57:31Z
    [orgName] TEXT NOT NULL,
    [address1] TEXT DEFAULT '',
    [address2] TEXT DEFAULT '',
    [city] TEXT DEFAULT '',
    [province] TEXT DEFAULT '',
    [postcode] TEXT DEFAULT '',
    [phone] TEXT DEFAULT '',
    [email] TEXT DEFAULT '',
    [website] TEXT DEFAULT '',
    [orgType] TEXT DEFAULT '',
    [bizTypes] TEXT DEFAULT '', -- JSON.stringify(bizTypes: string[])
    [logo] TEXT DEFAULT '',
    [npwpNomor] TEXT DEFAULT '',
    [npwpNama] TEXT DEFAULT '',
    [npwpNIK] TEXT DEFAULT '',
    [npwpAlamat] TEXT DEFAULT '',
    [npwpKelurahan] TEXT DEFAULT '',
    [npwpKecamatan] TEXT DEFAULT '',
    [npwpKota] TEXT DEFAULT '',
    [npwpProvinsi] TEXT DEFAULT '',
    [contactName] TEXT DEFAULT '',
    [contactPhone] TEXT DEFAULT '',
    [contactEmail] TEXT DEFAULT '',
    FOREIGN KEY ([tenantId]) REFERENCES 'tenants' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
--
-- 5. projects
--
DROP TABLE IF EXISTS 'projects';
CREATE TABLE 'projects'
(
    [id] TEXT PRIMARY KEY NOT NULL, -- P1669197440717-ABX: P + Date().getTime() + random
    [tenantId] TEXT NOT NULL,
    [clientId] TEXT, -- NOT NULL,
    [adminId] TEXT NOT NULL,
    [slug] TEXT UNIQUE NOT NULL,
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [type] TEXT DEFAULT '',
    [title] TEXT NOT NULL,
    [description] TEXT DEFAULT '',
    [startDate] TEXT DEFAULT '',
    [endDate] TEXT DEFAULT '',
    [acesContractDate] TEXT DEFAULT '',
    [acesContractValue] INTEGER DEFAULT 0,
    [acesInvoiceDate] TEXT DEFAULT '',
    [reportLang] TEXT NOT NULL DEFAULT 'ID',
    [clientContractDate] TEXT DEFAULT '',
    [clientInvoiceDate] TEXT DEFAULT '',
    [contactName] TEXT DEFAULT '',
    [contactPhone] TEXT DEFAULT '',
    [contactEmail] TEXT DEFAULT '',
    --
    UNIQUE ([tenantId],[slug]),
    FOREIGN KEY ([adminId]) REFERENCES 'users' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY ([tenantId]) REFERENCES 'tenants' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY ([clientId]) REFERENCES 'clients' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
--
-- 6. module_groups
--
DROP TABLE IF EXISTS 'module_groups';
CREATE TABLE 'module_groups'
(
    [id] TEXT PRIMARY KEY NOT NULL,
    [name] TEXT NOT NULL,
    [descID] TEXT NOT NULL DEFAULT 'Deskripsi Bahasa Indonesia...',
    [descEN] TEXT NOT NULL DEFAULT 'Deskripsi Bahasa Inggris...',
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z')
);
--
-- 7. modules
--
DROP TABLE IF EXISTS 'modules';
CREATE TABLE 'modules'
(
    [id] TEXT PRIMARY KEY NOT NULL,
    [groupId] TEXT NOT NULL,
    [lang] TEXT NOT NULL DEFAULT 'ID' CHECK (lang IS 'ID' OR lang IS 'EN'),
    [level] INTEGER NOT NULL,
    [minutes] INTEGER NOT NULL CHECK ([minutes] > 0),
    [method] TEXT NOT NULL CHECK (method IS 'selftest' OR method IS 'assisted'),
    [title] TEXT NOT NULL,
    [description] TEXT NOT NULL DEFAULT 'Please add description...',
    [price] INTEGER NOT NULL DEFAULT 0,
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),

    FOREIGN KEY ([groupId]) REFERENCES 'module_groups' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
--
-- 8. project_modules
--
DROP TABLE IF EXISTS 'project_modules';
CREATE TABLE 'project_modules'
(
    [id] TEXT NOT NULL,
    [projectId] TEXT NOT NULL,
    [quota] INTEGER NOT NULL CHECK ([quota] > 0),
    [created] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    [updated] TEXT NOT NULL DEFAULT (datetime('now')||'Z'),
    --
    UNIQUE ([id], [projectId]),
    FOREIGN KEY ([id]) REFERENCES 'modules' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    FOREIGN KEY ([projectId]) REFERENCES 'projects' ([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- =======================
-- ======  VIEWS  ========
-- =======================
--
-- 9. accounts
--
DROP VIEW IF EXISTS accounts;
CREATE VIEW accounts AS SELECT
    m.id, m.tenantId, m.role, m.status, m.isDefault,
    (SELECT COUNT(*) FROM members WHERE id=m.id) as mems, -- memberships
    (SELECT COUNT(*) FROM members WHERE status='active' AND id=m.id) as amems, -- active memberships
    users.username, users.email, users.fullname,
    tenants.orgName tenantOrgName, tenants.expiryDate tenantExpDate
FROM members m
LEFT JOIN users ON m.id=users.id
LEFT JOIN tenants ON m.tenantId=tenants.id;
--
-- 10. module_usages
--
DROP VIEW IF EXISTS module_usages;
CREATE VIEW module_usages AS SELECT
    p.id, p.projectId, p.quota,
    m.groupId, m.lang, m.level, m.minutes, m.method, m.title, m.description, m.price,
    p.created, p.updated
FROM project_modules p
LEFT JOIN modules m ON p.id=m.id;

