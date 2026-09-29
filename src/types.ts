export type JSONValueType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "null";

export interface TreeNode {
  id: string;
  key?: string;
  value: any;
  type: JSONValueType;
  depth: number;
  path: string;
  collapsed: boolean;
  itemCount?: number;
  children?: TreeNode[];
  parentId?: string;
}

export type DiffStatus = "added" | "removed" | "modified" | "unchanged";

export interface DiffNode {
  id: string;
  key?: string;
  path: string;
  depth: number;
  status: DiffStatus;
  oldValue?: any;
  newValue?: any;
  type: JSONValueType;
  collapsed: boolean;
  children?: DiffNode[];
  itemCount?: number;
}

export interface ViewerOptions {
  initialDepth?: number;
  showTypes?: boolean;
  showCounts?: boolean;
  search?: string;
  theme?: "default" | "vibrant" | "monochrome";
}

export interface DiffOptions {
  showUnchanged?: boolean;
  initialDepth?: number;
}
