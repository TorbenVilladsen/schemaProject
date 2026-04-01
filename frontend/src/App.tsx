import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Teachers from "./pages/Teachers";
import Subjects from "./pages/Subjects";
import Rooms from "./pages/Rooms";
import Schedules from "./pages/Schedules";
import ScheduleView from "./pages/ScheduleView";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div style={{ display: "flex" }}>
          <Sidebar />
          <main style={{ flex: 1, padding: "1.5rem" }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/teachers" element={<Teachers />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/schedules" element={<Schedules />} />
              <Route path="/schedules/:id" element={<ScheduleView />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
