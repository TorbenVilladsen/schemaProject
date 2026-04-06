import axios from "axios";
import type {
  Teacher,
  Subject,
  Room,
  Timeslot,
  Schedule,
  ScheduleListItem,
  SchoolClass,
  SetupData,
  SetupImportResponse,
} from "../types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1",
});

// Teachers
export const getTeachers = () => api.get<Teacher[]>("/teachers").then((r) => r.data);
export const createTeacher = (data: {
  name: string;
  max_hours_week?: number;
  max_hours_day?: number;
  qualifications?: { subject_name: string; min_grade: number; max_grade: number }[];
  availability?: { day_of_week: number; timeslot_id: string; is_available?: boolean; preference?: number }[];
}) => api.post<Teacher>("/teachers", data).then((r) => r.data);
export const updateTeacher = (id: string, data: {
  name?: string;
  max_hours_week?: number;
  max_hours_day?: number;
  availability?: { day_of_week: number; timeslot_id: string; is_available?: boolean; preference?: number }[];
}) => api.put<Teacher>(`/teachers/${id}`, data).then((r) => r.data);
export const deleteTeacher = (id: string) => api.delete(`/teachers/${id}`);

// Subjects
export const getSubjects = () => api.get<Subject[]>("/subjects").then((r) => r.data);
export const createSubject = (data: {
  name: string;
  grade_level: number;
  hours_per_week: number;
  requires_room_type?: string;
  class_id?: string;
}) => api.post<Subject>("/subjects", data).then((r) => r.data);
export const updateSubject = (id: string, data: {
  name?: string;
  grade_level?: number;
  hours_per_week?: number;
  requires_room_type?: string | null;
  class_id?: string | null;
}) => api.put<Subject>(`/subjects/${id}`, data).then((r) => r.data);
export const deleteSubject = (id: string) => api.delete(`/subjects/${id}`);

// Classes
export const getClasses = () => api.get<SchoolClass[]>("/classes").then((r) => r.data);
export const createClass = (data: {
  name: string;
  grade_level: number;
  contact_teacher_id?: string;
  primary_room_id?: string;
}) => api.post<SchoolClass>("/classes", data).then((r) => r.data);
export const updateClass = (id: string, data: {
  name?: string;
  grade_level?: number;
  contact_teacher_id?: string | null;
  primary_room_id?: string | null;
}) => api.put<SchoolClass>(`/classes/${id}`, data).then((r) => r.data);
export const deleteClass = (id: string) => api.delete(`/classes/${id}`);

// Rooms
export const getRooms = () => api.get<Room[]>("/rooms").then((r) => r.data);
export const createRoom = (data: {
  name: string;
  capacity: number;
  room_type?: string;
  availability?: { day_of_week: number; timeslot_id: string; is_available?: boolean }[];
}) => api.post<Room>("/rooms", data).then((r) => r.data);
export const updateRoom = (id: string, data: {
  name?: string;
  capacity?: number;
  room_type?: string;
  grid_row?: number | null;
  grid_col?: number | null;
  grid_pane?: string | null;
  availability?: { day_of_week: number; timeslot_id: string; is_available?: boolean }[];
}) => api.put<Room>(`/rooms/${id}`, data).then((r) => r.data);
export const deleteRoom = (id: string) => api.delete(`/rooms/${id}`);

// Timeslots
export const getTimeslots = () => api.get<Timeslot[]>("/timeslots").then((r) => r.data);
export const createTimeslot = (data: {
  slot_index: number;
  start_time: string;
  end_time: string;
  label?: string;
  period_type?: string;
}) => api.post<Timeslot>("/timeslots", data).then((r) => r.data);

// Schedules
export const getSchedules = () =>
  api.get<ScheduleListItem[]>("/schedules").then((r) => r.data);
export const getSchedule = (id: string) =>
  api.get<Schedule>(`/schedules/${id}`).then((r) => r.data);
export const createSchedule = (name?: string) =>
  api.post<ScheduleListItem>("/schedules", { name }).then((r) => r.data);
export const generateSchedule = (id: string) =>
  api.post<Schedule>(`/schedules/${id}/generate`).then((r) => r.data);
export const deleteSchedule = (id: string) => api.delete(`/schedules/${id}`);
export const moveScheduleEntry = (scheduleId: string, entryId: string, data: { day_of_week: number; timeslot_id: string }) =>
  api.patch(`/schedules/${scheduleId}/entries/${entryId}`, data).then((r) => r.data);

// Setup import/export
export const exportSetup = () =>
  api.get<SetupData>("/setup/export").then((r) => r.data);
export const importSetup = (data: SetupData, replace_existing = true) =>
  api.post<SetupImportResponse>("/setup/import", { data, replace_existing }).then((r) => r.data);
