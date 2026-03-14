import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Editor from './Editor';
import StructuralEditor from './StructuralEditor';

function App() {
  // Hooks like useNavigate must be inside components (like Login), NOT here.
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/editor/:urn" element={<Editor />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/structure/:urn" element={<StructuralEditor />} />
      </Routes>
    </Router>
  );
}

export default App;