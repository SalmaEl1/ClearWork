export type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  supervisor_id: string;
  is_archived: boolean;
  /** Obligatorias: todo proyecto tiene un cliente. Solo el admin las da
   * de alta o las edita — ni el supervisor ni el trabajador pueden
   * tocarlas, solo verlas. */
  client_name: string;
  client_contact: string;
  created_at: Date;
  updated_at: Date;
};
