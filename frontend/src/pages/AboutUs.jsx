import React from 'react';
import yImg from '../assets/y.jpg';
import aImg from '../assets/a.jpg';

 // Use the provided image or a similar placeholder
const bImg = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';
const team = [
  { name: 'Yazhvendhan K M', qualification: '3rd year CSE', img: yImg, role: 'Team Leader' },
  { name: 'Aadhisesha D', qualification: '3rd year CSE', img: aImg, role: 'Team Member' },
  { name: 'Roshan Kumar K', qualification: '3rd year CSE', img: bImg, role: 'Team Member' },
  { name: 'Sheik Fazil Hussain', qualification: '3rd year CSE', img: bImg, role: 'Team Member' },
];

const AboutUs = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-blue-100 p-8">
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full mb-8">
      <h1 className="text-3xl font-bold mb-4 text-blue-700">About Us</h1>
      <p className="text-gray-700 mb-4">
        <strong>Timetable and Workload Management System</strong> is a comprehensive platform designed to streamline the scheduling and workload management process for academic institutions. 
      </p>
      <p className="text-gray-700 mb-4">
        This project is developed by a team of students and educators to improve education administration. We welcome your feedback and suggestions!
      </p>
      <p className="text-gray-700">&copy; {new Date().getFullYear()} Timetable Management Team</p>
    </div>
    <div className="w-full max-w-4xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
        {/* Team Leader */}
        <div className="flex flex-col items-center bg-white rounded-lg shadow p-4 col-span-1">
          <div className="mb-2 text-blue-700 font-bold uppercase tracking-wide">Team Leader</div>
          <img
            src={team[0].img}
            alt={team[0].name}
            className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 mb-4"
          />
          <div className="text-center mt-2">
            <div className="font-semibold text-lg text-gray-800">{team[0].name}</div>
            <div className="text-blue-600 text-sm font-medium mt-1">{team[0].qualification}</div>
          </div>
        </div>
        {/* Team Members - each with their own title */}
        {team.slice(1).map((member, idx) => (
          <div key={idx} className="flex flex-col items-center bg-white rounded-lg shadow p-4 flex-1">
            <div className="mb-2 text-blue-700 font-bold uppercase tracking-wide">Team Member</div>
            <img
              src={member.img}
              alt={member.name}
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 mb-4"
            />
            <div className="text-center mt-2">
              <div className="font-semibold text-lg text-gray-800">{member.name}</div>
              <div className="text-blue-600 text-sm font-medium mt-1">{member.qualification}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default AboutUs; 