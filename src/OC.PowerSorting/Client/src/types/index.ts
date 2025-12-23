export interface MenuItem {
  id: string;
  name: string;
  icon: string;
}

export interface NodeChild {
  id: string;
  name: string;
  sortOrder: number;
  contentTypeAlias?: string;
  icon?: string;
}
