export enum ChangeType {
  CREATE,
  UPDATE,
  DELETE,
  UNIDENTIFIED,
}

export interface CADFile {
  path: string;
  commit: number;
  size: number;
  hash: string;
  change: ChangeType;
}

export interface DownloadFile {
  path: string;
  size: number;
}

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
  relativePath: string;
  change: ChangeType;
}

export interface CADFileColumn {
  file: UpdatedCADFile;
}
