export enum ChangeType {
  CREATE,
  UPDATE,
  DELETE,
  UNIDENTIFIED,
}

export interface CADFile {
  path: string;
  commit: number;
  s3Key: string;
  size: number;
  hash: string;
  change: ChangeType;
}

export interface DownloadFile {
  rel_path: string;
  size: number;
}

// TODO deprecate this type
export interface LocalCADFile {
  path: string;
  size: number;
  hash: string;
  change: ChangeType;
}

// TODO rename to LocalCADFile
// path is absolute
export interface File {
  path: string;
  size: number;
  hash: string;
}

// TODO
export interface Change {
  file: File;
  change: ChangeType;
}

export interface ProjectState {
  commit: number;
  files: CADFile[];
}

export interface UpdatedCADFile {
  path: string;
  size: number;
  hash: string;
  relativePath: string;
  change: ChangeType;
}

export interface CADFileColumn {
  file: UpdatedCADFile;
}

export interface WorkbenchLoaderProps {
  toDownload: CADFile[];
  toUpload: LocalCADFile[];
  conflict: string[];
}

export interface Commit {
  id: number;
  projectID: number;
  authorID: string;
  message: string;
  fileCount: number;
  timestamp: number;
}

export interface HistoryLoaderProps {
  recentCommits: Commit[];
}

export interface PermissionDashboardProps {
  level: number;
}

export interface SyncOutput {
  upload: LocalCADFile[];
  download: CADFile[];
  conflict: string[];
}

export interface DownloadStatus {
  s3: string;
  rel_path: string;
}

export interface RemoteFile {
  path: string; // relative
  commitid: number;
  size: number;
  hash: string;
}

export interface TrackedRemoteFile {
  file: RemoteFile;
  change: string;
}
