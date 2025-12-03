import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useNavigate } from 'react-router-dom';

const CoordinatorDashboard = () => {
  const navigate = useNavigate();
  return (
    <DashboardLayout role="coordinator" title="Timetable Coordinator Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Timetable Management Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Timetable Management</h3>
          <p className="text-gray-600 mb-4">Create and manage timetables for all departments.</p>
          <div className="space-y-4">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
              onClick={() => navigate('/timetable-builder')}
            >
              Create New Timetable
            </button>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full">
              Edit Existing Timetable
            </button>
            <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 w-full">
              View All Timetables
            </button>
          </div>
        </div>

        {/* Workload Management Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Workload Management</h3>
          <p className="text-gray-600 mb-4">Manage and balance faculty workloads across departments.</p>
          <div className="space-y-4">
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full">
              Assign Workloads
            </button>
            <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full">
              View Workload Distribution
            </button>
            <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 w-full">
              Generate Reports
            </button>
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-50 p-4 rounded-lg hover:bg-blue-100 transition-colors">
              <p className="font-medium text-blue-700">Finalize Timetable</p>
              <p className="text-sm text-blue-600">Approve and publish timetable</p>
            </button>
            <button className="bg-green-50 p-4 rounded-lg hover:bg-green-100 transition-colors">
              <p className="font-medium text-green-700">Review Conflicts</p>
              <p className="text-sm text-green-600">Check for scheduling conflicts</p>
            </button>
            <button className="bg-purple-50 p-4 rounded-lg hover:bg-purple-100 transition-colors">
              <p className="font-medium text-purple-700">Export Data</p>
              <p className="text-sm text-purple-600">Export timetable and workload data</p>
            </button>
          </div>
        </div>

        {/* Status Overview Card */}
        <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Status Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Departments</p>
              <p className="text-2xl font-bold text-blue-600">8</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Active Timetables</p>
              <p className="text-2xl font-bold text-green-600">6</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-yellow-600">2</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Conflicts</p>
              <p className="text-2xl font-bold text-red-600">3</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CoordinatorDashboard; 