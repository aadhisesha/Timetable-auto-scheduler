import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { facultyService } from '../../services/facultyService';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FacultyManagement = () => {
  const [faculties, setFaculties] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [file, setFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);

  useEffect(() => {
    fetchFaculties();
  }, []);

  const fetchFaculties = async () => {
    try {
      const data = await facultyService.getAllFaculty();
      setFaculties(data || []);
    } catch (err) {
      toast.error('Unable to fetch faculties');
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name || !email) return toast.error('Name and email required');
    try {
      await facultyService.addFacultyManual({ name, email });
      toast.success('Faculty added');
      setName(''); setEmail('');
      fetchFaculties();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    }
  };

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    try {
      const data = await f.arrayBuffer();
      const workbook = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
      // Expecting columns: name, email (case-insensitive)
      const normalized = rows.map(r => ({
        name: r.name || r.Name || r['Faculty Name'] || r['Name'] || '',
        email: (r.email || r.Email || r['Email ID'] || r['Email Id'] || '').toString()
      }));

      // Keep all rows initially so user can edit; filter later on upload
      setUploadPreview(normalized);
    } catch (err) {
      toast.error('Failed to parse file');
    }
  };

  const handleUpload = async () => {
    if (!uploadPreview.length) return toast.error('No records to upload');

    // Validate and prepare rows: require name and email
    const toUpload = uploadPreview.map(r => ({
      name: (r.name || '').toString().trim(),
      email: (r.email || '').toString().trim().toLowerCase()
    })).filter(r => r.name && r.email);

    if (!toUpload.length) return toast.error('No valid rows (name+email) to upload');

    try {
      const res = await facultyService.uploadFacultyExcel(toUpload);
      // res may contain inserted, skipped, errors
      toast.success(res.message || 'Uploaded faculties');
      if (res.errors && res.errors.length) {
        console.warn('Upload errors:', res.errors);
        toast.info(`${res.errors.length} rows had errors, check console.`);
      }
      setFile(null);
      setUploadPreview([]);
      await fetchFaculties();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    }
  };

  return (
    <DashboardLayout role="admin" title="Faculty Management">
      <div className="p-6">
        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Add Faculty (Manual)</h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="p-2 border rounded text-black" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="p-2 border rounded text-black" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <div className="flex items-center">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" type="submit">Add Faculty</button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded shadow p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Upload Faculties (Excel)</h2>
          <p className="text-sm text-gray-600 mb-2">Excel should contain columns with faculty name and email.</p>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
          {uploadPreview.length > 0 && (
              <div className="mt-3">
              <h3 className="font-medium">Preview ({uploadPreview.length})</h3>
              <div className="max-h-60 overflow-y-auto border mt-2">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left text-gray-700 font-medium">#</th>
                      <th className="p-2 text-left text-gray-700 font-medium">Name (editable)</th>
                      <th className="p-2 text-left text-gray-700 font-medium">Email (editable)</th>
                      <th className="p-2 text-left text-gray-700 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadPreview.map((r,i) => (
                      <tr key={i} className="border-t bg-white text-gray-900 hover:bg-gray-50">
                        <td className="p-2">{i+1}</td>
                        <td className="p-2">
                          <input
                            className="w-full p-1 border rounded"
                            value={r.name || ''}
                            onChange={e => {
                              const copy = [...uploadPreview];
                              copy[i] = { ...copy[i], name: e.target.value };
                              setUploadPreview(copy);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            className="w-full p-1 border rounded"
                            value={r.email || ''}
                            onChange={e => {
                              const copy = [...uploadPreview];
                              copy[i] = { ...copy[i], email: e.target.value };
                              setUploadPreview(copy);
                            }}
                          />
                        </td>
                        <td className="p-2">
                          <button
                            className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                            onClick={() => {
                              const copy = uploadPreview.filter((_, idx) => idx !== i);
                              setUploadPreview(copy);
                            }}
                          >Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleUpload}>Upload</button>
                <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => { setUploadPreview([]); setFile(null); }}>Clear</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">All Faculties</h2>
          <div className="flex space-x-2 mb-3">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500"
              onClick={() => {
                try {
                  const data = faculties.map(f => ({ 'Faculty ID': f.userId || '', Name: f.name || '', Email: f.email || '' }));
                  const ws = XLSX.utils.json_to_sheet(data);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Faculties');
                  XLSX.writeFile(wb, 'faculties.xlsx');
                } catch (err) {
                  toast.error('Failed to export Excel');
                }
              }}
            >
              Export Excel
            </button>
            <button
              className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
              onClick={() => {
                try {
                  const doc = new jsPDF();
                  const rows = faculties.map(f => [f.userId || '', f.name || '', f.email || '']);
                  autoTable(doc, {
                    head: [['Faculty ID', 'Name', 'Email']],
                    body: rows,
                    startY: 10,
                  });
                  doc.save('faculties.pdf');
                } catch (err) {
                  console.error(err);
                  toast.error('Failed to export PDF');
                }
              }}
            >
              Export PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left text-gray-700 font-medium">Name</th>
                  <th className="p-2 text-left text-gray-700 font-medium">Email</th>
                  <th className="p-2 text-left text-gray-700 font-medium">Login ID</th>
                  <th className="p-2 text-left text-gray-700 font-medium">Department</th>
                  <th className="p-2 text-left text-gray-700 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculties.map(f => (
                  <tr key={f._id} className="border-t bg-white text-gray-900 hover:bg-gray-50">
                    <td className="p-2">{f.name}</td>
                    <td className="p-2">{f.email}</td>
                    <td className="p-2">{f.userId}</td>
                    <td className="p-2">{f.department}</td>
                    <td className="p-2">
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500"
                        onClick={async () => {
                          if (!window.confirm(`Delete faculty ${f.name} (${f.email})?`)) return;
                          try {
                            await facultyService.deleteFaculty(f._id);
                            toast.success('Faculty deleted');
                            fetchFaculties();
                          } catch (err) {
                            const msg = err.response?.data?.message || err.message;
                            toast.error(msg);
                          }
                        }}
                      >Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FacultyManagement;
