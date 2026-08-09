export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  supervisor_id: string;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
};
