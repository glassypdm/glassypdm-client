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

// path is absolute
export interface LocalCADFile {
  path: string;
  size: number;
  hash: string;
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
