import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Subjects from "./pages/Subjects";
import Rooms from "./pages/Rooms";
import Timeslots from "./pages/Timeslots";
import Classes from "./pages/Classes";
import Schedules from "./pages/Schedules";
import ScheduleView from "./pages/ScheduleView";
import Setup from "./pages/Setup";
import {
  getClasses,
  getRooms,
  getSchedules,
  getSubjects,
  getTeachers,
  getTimeslots,
} from "./api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

function WarmupQueries() {
  useEffect(() => {
    void queryClient.prefetchQuery({ queryKey: ["teachers"], queryFn: getTeachers });
    void queryClient.prefetchQuery({ queryKey: ["subjects"], queryFn: getSubjects });
    void queryClient.prefetchQuery({ queryKey: ["rooms"], queryFn: getRooms });
    void queryClient.prefetchQuery({ queryKey: ["timeslots"], queryFn: getTimeslots });
    void queryClient.prefetchQuery({ queryKey: ["classes"], queryFn: getClasses });
    void queryClient.prefetchQuery({ queryKey: ["schedules"], queryFn: getSchedules });
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WarmupQueries />
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/classes" element={<Classes />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/timeslots" element={<Timeslots />} />
              <Route path="/schedules" element={<Schedules />} />
              <Route path="/schedules/:id" element={<ScheduleView />} />
              <Route path="/setup" element={<Setup />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
