export enum ChangeType {
  CREATE = "Create",
  UPDATE = "Update",
  DELETE = "Delete",
  UNIDENTIFIED = "Unidentified",
}

export interface CADFile {
  path: string; // TODO confirm this is relative
  commit: number;
  s3key: string;
  size: number;
  hash: string;
  change: ChangeType;
}

export interface DownloadFile {
  rel_path: string;
  size: number;
}

export interface LocalCADFile {
  path: string; // absolute
  size: number;
  hash: string;
}

export interface Change {
  file: LocalCADFile;
  change: ChangeType;
}

export interface ProjectState {
  commit: number;
  files: CADFile[];
}

// only used for CADFileColumn
export interface UpdatedCADFile {
  // download: relative; upload: absolute
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
  toDownload: TrackedRemoteFile[];
  toUpload: Change[];
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
  upload: Change[];
  download: TrackedRemoteFile[];
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
