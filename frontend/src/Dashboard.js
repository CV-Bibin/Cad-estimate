import React, { useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { ref, onValue, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import FileUpload from './FileUpload';

const Dashboard = () => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHidden, setShowHidden] = useState(false);
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
        // Sort: Favorites first, then newest first
        setProjects(list.sort((a, b) => {
          if (a.isFavorite === b.isFavorite) {
            return new Date(b.uploadedAt) - new Date(a.uploadedAt);
          }
          return a.isFavorite ? -1 : 1;
        }));
      } else {
        setProjects([]);
      }
    });
  }, []);

  // --- DATABASE ACTIONS ---
  const toggleFavorite = (id, currentState) => {
    update(ref(db, `drawings/${id}`), { isFavorite: !currentState });
  };

  const toggleHide = (id, currentState) => {
    update(ref(db, `drawings/${id}`), { isHidden: !currentState });
  };

  // --- FILTERING LOGIC ---
  const filteredProjects = projects.filter((proj) => {
    const matchesSearch =
      proj.projectTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proj.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVisibility = showHidden ? true : !proj.isHidden;

    return matchesSearch && matchesVisibility;
  });

  return (
    <div style={{ padding: '40px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, color: '#2c3e50' }}>Civil Estimator Pro</h1>
            <p style={{ margin: '5px 0 0', color: '#7f8c8d' }}>Professional Estimation Dashboard</p>
          </div>
          <button onClick={() => { auth.signOut(); navigate('/'); }}
            style={{ padding: '10px 20px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            Logout
          </button>
        </header>

       

        {/* UPLOAD SECTION */}
        <div style={{ background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '40px', border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '15px', color: '#34495e' }}>Start New Project</h3>
          <FileUpload onUrnReceived={(urn) => navigate(`/editor/${encodeURIComponent(urn)}`)} />
        </div>

         {/* SEARCH AND TOOLS BAR */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search projects, clients, or locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ flex: 1, padding: '12px 20px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', outline: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
          />
          <button
            onClick={() => setShowHidden(!showHidden)}
            style={{ padding: '0 20px', background: showHidden ? '#95a5a6' : '#ecf0f1', border: '1px solid #ddd', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', color: showHidden ? 'white' : '#34495e' }}
          >
            {showHidden ? '👀 Showing Hidden' : '🙈 Show Hidden'}
          </button>
        </div>

        {/* PROJECTS GRID */}
        <h3 style={{ color: '#2c3e50', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Your Projects
          <span style={{ fontSize: '14px', background: '#3498db', color: 'white', padding: '2px 10px', borderRadius: '20px' }}>{filteredProjects.length}</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {filteredProjects.map((proj) => (
            <div key={proj.id} style={{
              background: 'white',
              borderRadius: '15px',
              padding: '20px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
              border: proj.isFavorite ? '2px solid #f1c40f' : '1px solid #eee',
              position: 'relative',
              transition: 'transform 0.2s',
              opacity: proj.isHidden ? 0.6 : 1
            }}>

              {/* FAVORITE AND HIDE BUTTONS */}
              <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => toggleFavorite(proj.id, proj.isFavorite)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', padding: 0 }}
                  title="Favorite"
                >
                  {proj.isFavorite ? '⭐' : '☆'}
                </button>
                <button
                  onClick={() => toggleHide(proj.id, proj.isHidden)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', padding: 0 }}
                  title={proj.isHidden ? 'Unhide' : 'Hide'}
                >
                  {proj.isHidden ? '👁️' : '🚫'}
                </button>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '18px', color: '#2c3e50', paddingRight: '50px' }}>{proj.projectTitle}</h4>
                <span style={{ fontSize: '11px', background: '#e1f5fe', color: '#0288d1', padding: '3px 10px', borderRadius: '20px', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {proj.location}
                </span>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#555' }}>
                  <span style={{ color: '#999' }}>Client:</span> <strong>{proj.clientName}</strong>
                </p>
                <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                  File: {proj.originalName}
                </p>
              </div>

              <div style={{ fontSize: '12px', color: '#bdc3c7', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Uploaded: {new Date(proj.uploadedAt).toLocaleDateString()}</span>
                {proj.isHidden && <span style={{ color: '#e67e22', fontWeight: 'bold' }}>HIDDEN</span>}
              </div>

              <button
                onClick={() => navigate(`/editor/${encodeURIComponent(proj.urn)}`)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: proj.isHidden ? '#95a5a6' : '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 10px rgba(52, 152, 219, 0.2)'
                }}
              >
                Open Estimation
              </button>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#95a5a6' }}>
            <p style={{ fontSize: '18px' }}>No projects found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;