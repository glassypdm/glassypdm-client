CREATE TABLE server (
    url TEXT NOT NULL PRIMARY KEY,
    name TEXT,
    clerk_publickey TEXT,
    local_dir TEXT,
    active INTEGER,
    debug_url TEXT,
    webapp_url TEXT,
    debug_active INTEGER
);
CREATE TABLE project (
    pid INTEGER NOT NULL,
    url TEXT NOT NULL,
    team_name TEXT NOT NULL,
    title TEXT NOT NULL,
    remote_title TEXT NOT NULL,
    base_commitid INTEGER,
    tracked_commitid INTEGER,
    last_synced DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY(pid, url)
);
CREATE TABLE file (
    filepath TEXT NOT NULL, -- relative path
    pid INTEGER NOT NULL,
    base_hash TEXT NOT NULL DEFAULT "",
    curr_hash TEXT NOT NULL DEFAULT "",
    tracked_hash TEXT NOT NULL DEFAULT "", 
    size INTEGER NOT NULL DEFAULT 0,
    base_commitid INTEGER DEFAULT -1,
    tracked_commitid INTEGER DEFAULT -1,
    tracked_changetype INTEGER DEFAULT 1,
    tracked_size INTEGER DEFAULT 0,
    change_type INTEGER DEFAULT 1,
    in_fs INTEGER DEFAULT 1,
    PRIMARY KEY (filepath, pid)
);