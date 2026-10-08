import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Trash2, FileText, PlusCircle } from 'lucide-react';
import './App.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const API_BASE_URL = 'http://localhost:8000/api';

function App() {
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  //form state for editing/saving
  const [vendor, setVendor] = useState('');
  const [total, setTotal] = useState('');
  const [category, setCategory] = useState('General');

  //fetch saved records on initial render
  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/records`);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  //upload image to fastapi for ocr extraction
  const handleExtract = async (e) => {
    e.preventDefault();
    if (!file) return;

    //file validation for supported formats
    if (!ALLOWED_TYPES.includes(file.type)) {
      alert('Unsupported file format! Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/extract`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setExtractedData(response.data);
      setVendor(response.data.vendor);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Error extracting image data:', error);
    } finally {
      setLoading(false);
    }
  };

  //save reviewed record into SQLite database
  const handleSaveRecord = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_BASE_URL}/records?vendor=${encodeURIComponent(vendor)}&total=${total}&category=${encodeURIComponent(category)}`
      );
      //reset extraction state and refresh table
      setExtractedData(null);
      setFile(null);
      setVendor('');
      setTotal('');
      fetchRecords();
    } catch (error) {
      console.error('Error saving record:', error);
    }
  };

  //delete record by ID
  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/records/${id}`);
      fetchRecords();
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <h1>OCR Optical Extractor & Dashboard</h1>

      {/* Upload Section */}
      <div style={{ border: '2px dashed #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h2>Upload Receipt Image</h2>
        <form onSubmit={handleExtract}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={(e) => setFile(e.target.files[0])} 
            style={{ marginBottom: '10px' }}
          />
          <button type="submit" disabled={!file || loading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
            <Upload size={18} /> {loading ? 'Extracting Text...' : 'Process Image'}
          </button>
        </form>
      </div>

      {/* Review & Save Form */}
      {extractedData && (
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h2>Review Extracted Data</h2>
          <form onSubmit={handleSaveRecord}>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
              <div>
                <label>Vendor:</label>
                <input 
                  type="text" 
                  value={vendor} 
                  onChange={(e) => setVendor(e.target.value)} 
                  required 
                  style={{ display: 'block', padding: '6px' }}
                />
              </div>
              <div>
                <label>Total (£):</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={total} 
                  onChange={(e) => setTotal(e.target.value)} 
                  required 
                  style={{ display: 'block', padding: '6px' }}
                />
              </div>
              <div>
                <label>Category:</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ display: 'block', padding: '6px' }}>
                  <option value="General">General</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Dining">Dining</option>
                  <option value="Software">Software</option>
                </select>
              </div>
            </div>
            <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
              <PlusCircle size={18} /> Save to Dashboard
            </button>
          </form>
        </div>
      )}

      {/* Dashboard Records Table */}
      <h2>Saved Receipts</h2>
      <table border="1" cellPadding="10" cellSpacing="0" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#eee' }}>
            <th>ID</th>
            <th>Vendor</th>
            <th>Total (£)</th>
            <th>Category</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center' }}>No saved receipts yet.</td>
            </tr>
          ) : (
            records.map((rec) => (
              <tr key={rec.id}>
                <td>{rec.id}</td>
                <td>{rec.vendor}</td>
                <td>£{rec.total.toFixed(2)}</td>
                <td>{rec.category}</td>
                <td>
                  <button onClick={() => handleDelete(rec.id)} style={{ color: 'red', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;