import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import FacultyDashboard from './pages/FacultyDashboard';
import HODDashboard from './pages/HODDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard/index.jsx';
import TimetableBuilder from './pages/TimetableBuilder';
import TimetableViewer from './pages/FacultyDashboard/TimetableViewer';
import Faculty from './pages/Faculty';
import FacultyClassSchedule from './pages/FacultyClassSchedule';
import FacultyWorkloadSummary from './pages/FacultyWorkloadSummary';
import FacultyCourseAssignments from './pages/FacultyCourseAssignments';
import AboutUs from './pages/AboutUs';
import TimetableCoordinatorDashboard from './pages/TimetableCoordinatorDashboard';
import './App.css';

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route
            path="/faculty-dashboard"
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/faculty-dashboard/timetable-viewer"
            element={
              <ProtectedRoute allowedRoles={['faculty']}>
                <TimetableViewer />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/hod-dashboard"
            element={
              <ProtectedRoute allowedRoles={['hod']}>
                <HODDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/coordinator-dashboard"
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/timetable-builder"
            element={
              <ProtectedRoute allowedRoles={['coordinator']}>
                <TimetableBuilder />
              </ProtectedRoute>
            }
          />

          <Route
            path="/timetable-coordinator-dashboard"
            element={
              <ProtectedRoute allowedRoles={['timetable_coordinator']}>
                <TimetableCoordinatorDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="/faculty" element={<Faculty />} />
          <Route path="/faculty/class-schedule/:facultyId" element={<FacultyClassSchedule />} />
          <Route path="/faculty/workload-summary/:facultyId" element={<FacultyWorkloadSummary />} />
          <Route path="/faculty-course-assignments" element={<FacultyCourseAssignments />} />
          <Route path="/about" element={<AboutUs />} />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Catch all route - redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App; 