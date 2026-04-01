import axios from "axios";
import type {
  Teacher,
  Subject,
  Room,
  Timeslot,
  Schedule,
  ScheduleListItem,
} from "../types";

const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
});

// Teachers
export const getTeachers = () => api.get<Teacher[]>("/teachers").then((r) => r.data);
export const createTeacher = (data: {
  name: string;
  email?: string;
  max_hours_week?: number;
  max_hours_day?: number;
  qualifications?: { subject_name: string; min_grade: number; max_grade: number }[];
}) => api.post<Teacher>("/teachers", data).then((r) => r.data);
export const deleteTeacher = (id: string) => api.delete(`/teachers/${id}`);

// Subjects
export const getSubjects = () => api.get<Subject[]>("/subjects").then((r) => r.data);
export const createSubject = (data: {
  name: string;
  grade_level: number;
  hours_per_week: number;
  requires_room_type?: string;
}) => api.post<Subject>("/subjects", data).then((r) => r.data);
export const deleteSubject = (id: string) => api.delete(`/subjects/${id}`);

// Rooms
export const getRooms = () => api.get<Room[]>("/rooms").then((r) => r.data);
export const createRoom = (data: { name: string; capacity: number; room_type?: string }) =>
  api.post<Room>("/rooms", data).then((r) => r.data);
export const deleteRoom = (id: string) => api.delete(`/rooms/${id}`);

// Timeslots
export const getTimeslots = () => api.get<Timeslot[]>("/timeslots").then((r) => r.data);
export const createTimeslot = (data: {
  slot_index: number;
  start_time: string;
  end_time: string;
  label?: string;
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
