import React, { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { ref, onValue } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const drawingsRef = ref(db, 'drawings/');
    onValue(drawingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]) => ({
          id: key,
          ...value
        }));
        // Sort newest first
        setProjects(list.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)));
      }
    });
  }, []);

  return (
    <div style={{ padding: '40px', background: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#2c3e50' }}>Civil Estimator Pro</h1>
            <p style={{ margin: '5px 0 0', color: '#7f8c8d' }}>Professional Estimation Dashboard</p>
          </div>
          <button onClick={() => { auth.signOut(); navigate('/'); }} 
            style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Logout
          </button>
        </header>

        {/* UPLOAD SECTION */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '50px' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Start New Project</h3>
          <FileUpload onUrnReceived={(urn) => navigate(`/editor/${encodeURIComponent(urn)}`)} />
        </div>

        {/* PROJECTS GRID */}
        <h3 style={{ color: '#2c3e50' }}>Your Projects</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
          {projects.map((proj) => (
            <div key={proj.id} style={{ background: 'white', borderRadius: '10px', padding: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                <h4 style={{ margin: 0, fontSize: '18px', color: '#2c3e50' }}>{proj.projectTitle}</h4>
                <span style={{ fontSize: '12px', background: '#e1f5fe', color: '#0288d1', padding: '3px 8px', borderRadius: '10px' }}>
                    {proj.location}
                </span>
              </div>
              
              <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Client:</strong> {proj.clientName}
              </p>
              
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '15px' }}>
                File: {proj.originalName}<br/>
                Date: {new Date(proj.uploadedAt).toLocaleDateString()}
              </div>

              <button 
                onClick={() => navigate(`/editor/${encodeURIComponent(proj.urn)}`)} 
                style={{ width: '100%', padding: '10px', background: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Open Estimation
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;