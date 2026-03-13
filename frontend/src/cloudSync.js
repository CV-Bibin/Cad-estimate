import { ref, set, get, child } from "firebase/database";
import { db } from './firebase'; // Adjust path if your firebase.js is in a different folder

// 🌟 1. Helper to clean the URN so Firebase accepts it
export const getSafeProjectId = (urn) => {
    if (!urn) return "default_project";
    return decodeURIComponent(urn).replace(/[.#$[\]]/g, '_');
};

// 🌟 2. REUSABLE SAVE FUNCTION
// You can pass ANY data to this from ANY screen!
export const saveProjectData = async (urn, data) => {
    try {
        const safeProjectId = getSafeProjectId(urn);
        const projectRef = ref(db, `estimations/${safeProjectId}`);
        
        await set(projectRef, {
            ...data,
            lastSaved: new Date().toISOString()
        });
        
        return true; // Returns true if successful
    } catch (error) {
        console.error("Firebase Save Error:", error);
        return false; // Returns false if it fails
    }
};

// 🌟 3. REUSABLE LOAD FUNCTION
export const loadProjectData = async (urn) => {
    try {
        const safeProjectId = getSafeProjectId(urn);
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, `estimations/${safeProjectId}`));
        
        if (snapshot.exists()) {
            return snapshot.val(); // Returns the saved JSON object
        }
        return null; // Returns null if no previous save exists
    } catch (error) {
        console.error("Firebase Load Error:", error);
        return null;
    }
};