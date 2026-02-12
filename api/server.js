const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const storage = multer.memoryStorage(); // Vercel requires RAM storage
const upload = multer({ storage: storage });
app.use(cors());

// 1. FIREBASE ADMIN INIT
// Only initialize if not already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                // Handle newlines in private key for Vercel/Render deployments
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            }),
            databaseURL: process.env.FIREBASE_DB_URL // Must match your .env
        });
        console.log("Firebase Admin Initialized Successfully");
    } catch (error) {
        console.error("Firebase Admin Init Error:", error);
    }
}
const db = admin.database();

// 2. AUTODESK SETUP
const { SdkManagerBuilder } = require('@aps_sdk/autodesk-sdkmanager');
const { AuthenticationClient, Scopes } = require('@aps_sdk/authentication');
const sdk = SdkManagerBuilder.create().build();
const authClient = new AuthenticationClient(sdk);

// Unique bucket name based on your Client ID
const BUCKET_KEY = 'civil_app_pro_' + process.env.APS_CLIENT_ID.toLowerCase().substring(0, 8);

async function getAccessToken() {
    return await authClient.getTwoLeggedToken(process.env.APS_CLIENT_ID, process.env.APS_CLIENT_SECRET, [
        Scopes.DataRead, Scopes.DataWrite, Scopes.BucketCreate, Scopes.BucketRead
    ]);
}

// 3. ROUTES

// Route: Get Access Token (for Viewer)
app.get('/api/token', async (req, res) => {
    try {
        const token = await getAccessToken();
        res.json(token);
    } catch (err) { 
        console.error("Token Error:", err);
        res.status(500).send(err.message); 
    }
});

// Route: Upload File & Save Metadata
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).send("No file uploaded.");

        // Clean up filename for Firebase Key (Firebase doesn't like ., #, $, [, ])
        const safeKey = file.originalname.replace(/[.#$[\]]/g, '_'); 

        // Extract the new fields sent from Frontend
        const { clientName, projectTitle, location } = req.body;

        const ref = db.ref('drawings/' + safeKey);
        const snapshot = await ref.once('value');

        // CHECK IF FILE ALREADY EXISTS
        if (snapshot.exists()) {
            console.log("File exists, updating metadata...");
            // Update the existing record with new Client/Location info
            await ref.update({ 
                clientName: clientName || snapshot.val().clientName,
                projectTitle: projectTitle || snapshot.val().projectTitle,
                location: location || snapshot.val().location,
                lastAccessed: new Date().toISOString()
            });
            // Return existing URN (saves translation tokens)
            return res.json({ urn: snapshot.val().urn, status: 'existing' });
        }

        // --- NEW FILE UPLOAD FLOW ---
        console.log("Uploading new file to Autodesk...");
        const token = (await getAccessToken()).access_token;

        // 1. Ensure Bucket Exists
        try { 
            await axios.post('https://developer.api.autodesk.com/oss/v2/buckets', 
                { bucketKey: BUCKET_KEY, policyKey: 'persistent' }, 
                { headers: { Authorization: `Bearer ${token}` } }
            ); 
        } catch (e) {
            // Bucket likely exists, ignore error
        }

        // 2. Get Upload URL (S3 Direct)
        const uploadUrlRes = await axios.get(
            `https://developer.api.autodesk.com/oss/v2/buckets/${BUCKET_KEY}/objects/${file.originalname}/signeds3upload`, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 3. Upload actual file buffer
        await axios.put(uploadUrlRes.data.urls[0], file.buffer);

        // 4. Finalize Upload
        const completeRes = await axios.post(
            `https://developer.api.autodesk.com/oss/v2/buckets/${BUCKET_KEY}/objects/${file.originalname}/signeds3upload`, 
            { uploadKey: uploadUrlRes.data.uploadKey }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        // 5. Convert ObjectID to Base64 URN
        const urn = Buffer.from(completeRes.data.objectId).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        // 6. Start Translation Job (SVF for Viewer)
        await axios.post(
            'https://developer.api.autodesk.com/modelderivative/v2/designdata/job', 
            { input: { urn }, output: { formats: [{ type: 'svf', views: ['2d', '3d'] }] } }, 
            { headers: { Authorization: `Bearer ${token}` } }
        );

        // 7. SAVE ALL DATA TO FIREBASE
        await ref.set({ 
            urn, 
            uploadedAt: new Date().toISOString(), 
            originalName: file.originalname,
            clientName: clientName || "Unknown Client",
            projectTitle: projectTitle || file.originalname,
            location: location || "Kerala"
        });

        console.log("Upload Complete:", urn);
        res.json({ urn, status: 'new' });

    } catch (err) { 
        console.error("Upload Failed:", err.message);
        res.status(500).send(err.message); 
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Backend running on ${port}`));