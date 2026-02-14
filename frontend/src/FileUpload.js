import React, { useState } from 'react';
import axios from 'axios';

const FileUpload = ({ onUrnReceived }) => {
    const [file, setFile] = useState(null);
    const [clientName, setClientName] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [location, setLocation] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please select a file first!");

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('clientName', clientName);
        formData.append('projectTitle', projectTitle);
        formData.append('location', location);

        try {
            // Send to your backend
            const res = await axios.post('http://localhost:3001/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUrnReceived(res.data.urn);
        } catch (err) {
            console.error(err);
            alert("Upload failed. Check backend console.");
        }
        setUploading(false);
    };

    const inputStyle = {
        width: '100%', padding: '10px', marginBottom: '10px', 
        borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box'
    };

    return (
        <form onSubmit={handleUpload} style={{ maxWidth: '400px' }}>
            <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Project Title</label>
                <input type="text" placeholder="e.g. Modern Villa Estimation" style={inputStyle} 
                    value={projectTitle} onChange={e => setProjectTitle(e.target.value)} required />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Client Name</label>
                    <input type="text" placeholder="e.g. Mr. Rahul" style={inputStyle} 
                        value={clientName} onChange={e => setClientName(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Location</label>
                    <input type="text" placeholder="e.g. Kottayam" style={inputStyle} 
                        value={location} onChange={e => setLocation(e.target.value)} required />
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>CAD File (.dwg)</label>
                <input type="file" accept=".dwg,.dxf" onChange={e => setFile(e.target.files[0])} />
            </div>

            <button type="submit" disabled={uploading} style={{
                width: '100%', padding: '12px', background: uploading ? '#ccc' : '#28a745', 
                color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer'
            }}>
                {uploading ? 'Processing...' : 'Upload & Start Estimation'}
            </button>
        </form>
    );
};

export default FileUpload;