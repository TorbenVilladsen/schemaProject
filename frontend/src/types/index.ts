export interface Teacher {
  id: string;
  tenant_id: string;
  name: string;
  email: string | null;
  max_hours_week: number;
  max_hours_day: number;
  qualifications: Qualification[];
}

export interface Qualification {
  id: string;
  subject_name: string;
  min_grade: number;
  max_grade: number;
}

export interface Subject {
  id: string;
  tenant_id: string;
  name: string;
  grade_level: number;
  hours_per_week: number;
  requires_room_type: string | null;
  class_id: string | null;
}

export interface SchoolClass {
  id: string;
  tenant_id: string;
  name: string;
  grade_level: number;
  contact_teacher_id: string | null;
}

export interface Room {
  id: string;
  tenant_id: string;
  name: string;
  capacity: number;
  room_type: string;
}

export interface Timeslot {
  id: string;
  tenant_id: string;
  slot_index: number;
  start_time: string;
  end_time: string;
  label: string | null;
  period_type: string;
}

export interface ScheduleEntry {
  id: string;
  teacher_id: string;
  subject_id: string;
  room_id: string | null;
  day_of_week: number;
  timeslot_id: string;
  class_id: string | null;
  is_locked: boolean;
}

export interface Schedule {
  id: string;
  tenant_id: string;
  name: string | null;
  status: string;
  solver_status: string | null;
  solver_stats: Record<string, unknown> | null;
  created_at: string;
  published_at: string | null;
  entries: ScheduleEntry[];
}

export interface ScheduleListItem {
  id: string;
  tenant_id: string;
  name: string | null;
  status: string;
  solver_status: string | null;
  created_at: string;
}

export interface SetupTeacher {
  id?: string;
  name: string;
  email: string | null;
  max_hours_week: number;
  max_hours_day: number;
  qualifications: {
    subject_name: string;
    min_grade: number;
    max_grade: number;
  }[];
}

export interface SetupClass {
  id?: string;
  name: string;
  grade_level: number;
  contact_teacher_id: string | null;
}

export interface SetupSubject {
  id?: string;
  name: string;
  grade_level: number;
  hours_per_week: number;
  requires_room_type: string | null;
  class_id: string | null;
}

export interface SetupRoom {
  id?: string;
  name: string;
  capacity: number;
  room_type: string;
}

export interface SetupTimeslot {
  id?: string;
  slot_index: number;
  start_time: string;
  end_time: string;
  label: string | null;
  period_type: string;
}

export interface SetupData {
  version: number;
  classes: SetupClass[];
  teachers: SetupTeacher[];
  subjects: SetupSubject[];
  rooms: SetupRoom[];
  timeslots: SetupTimeslot[];
}

export interface SetupImportResponse {
  imported: Record<string, number>;
  replace_existing: boolean;
}
