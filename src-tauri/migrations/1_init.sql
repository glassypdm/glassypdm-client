CREATE TABLE server (url TEXT PRIMARY KEY, name TEXT, clerk_publickey TEXT, local_dir TEXT, active INTEGER, debug_url TEXT, debug_active INTEGER);
CREATE TABLE project (id INTEGER PRIMARY KEY, server_url TEXT, name TEXT, active INTEGER, current_commitid INTEGER);
CREATE TABLE file (path TEXT PRIMARY KEY);