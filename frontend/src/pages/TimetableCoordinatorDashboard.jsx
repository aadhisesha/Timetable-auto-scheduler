import React from 'react';
import HODDashboard from './HODDashboard';
import CoordinatorDashboard from './CoordinatorDashboard/index.jsx';

const TimetableCoordinatorDashboard = () => (
  <div>
    <CoordinatorDashboard />
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">HOD Functionalities</h2>
      <HODDashboard role="timetable_coordinator" />
    </div>
  </div>
);

export default TimetableCoordinatorDashboard; 