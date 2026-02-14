import React, { useState } from 'react';
import { auth, googleProvider } from './firebase';
import { 
    signInWithPopup, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword 
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const navigate = useNavigate();

    // 1. Google Login Logic
    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            navigate('/dashboard');
        } catch (error) {
            alert(error.message);
        }
    };

    // 2. Email/Password Logic
    const handleEmailAuth = async (e) => {
        e.preventDefault();
        try {
            if (isRegistering) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            navigate('/dashboard');
        } catch (error) {
            alert(error.message);
        }
    };

    const containerStyle = {
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
        fontFamily: 'Arial, sans-serif'
    };

    const cardStyle = {
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        width: '350px',
        textAlign: 'center'
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        margin: '10px 0',
        borderRadius: '6px',
        border: '1px solid #ddd',
        boxSizing: 'border-box'
    };

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                <h2 style={{ color: '#1a73e8' }}>Civil Estimator Pro</h2>
                <p style={{ color: '#666' }}>{isRegistering ? 'Create your professional account' : 'Sign in to your projects'}</p>
                
                <form onSubmit={handleEmailAuth}>
                    <input 
                        type="email" 
                        placeholder="Email Address" 
                        style={inputStyle} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        style={inputStyle} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                    />
                    <button type="submit" style={{ 
                        width: '100%', padding: '12px', background: '#1a73e8', color: 'white', 
                        border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' 
                    }}>
                        {isRegistering ? 'Sign Up' : 'Login'}
                    </button>
                </form>

                <div style={{ margin: '20px 0', color: '#999' }}>OR</div>

                <button onClick={handleGoogleLogin} style={{ 
                    width: '100%', padding: '12px', background: 'white', color: '#444', 
                    border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}>
                    <img src="https://www.gstatic.com/firebase/anonymous/google.png" alt="G" width="20"/>
                    Sign in with Google
                </button>

                <p style={{ marginTop: '20px', fontSize: '14px' }}>
                    {isRegistering ? 'Already have an account?' : 'Need a professional account?'}
                    <span 
                        onClick={() => setIsRegistering(!isRegistering)} 
                        style={{ color: '#1a73e8', cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
                    >
                        {isRegistering ? 'Login' : 'Sign Up'}
                    </span>
                </p>
            </div>
        </div>
    );
};

export default Login;