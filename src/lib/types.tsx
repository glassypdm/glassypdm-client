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

export interface LocalCADFile {
  path: string;
  size: number;
  hash: string;
  change?: ChangeType;
}

export interface ProjectState {
  commit: number;
  files: CADFile[];
}

export interface UpdatedCADFile {
  path: string;
  relativePath: string;
  change: ChangeType;
}

export interface CADFileColumn {
  file: UpdatedCADFile;
}
