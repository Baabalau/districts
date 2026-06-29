const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDf-vGCbNNKa6xayqCJXSJc_JDWR8atJ_4",
  authDomain: "districts-after-dark.firebaseapp.com",
  projectId: "districts-after-dark",
  storageBucket: "districts-after-dark.firebasestorage.app",
  messagingSenderId: "111193459737",
  appId: "1:111193459737:web:8531d3c7405e374af96e88"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initSchedule() {
  const scheduleRef = doc(db, "settings", "schedule");
  
  // We'll set arbitrary future dates for now that the admin can adjust
  const now = new Date();
  
  const defaultDistrictSchedule = {
      roundOneStart: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      runOffStart: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      winnerAnnounce: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      postEvent: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 3 weeks from now
      winnerId: null
  };

  try {
    await setDoc(scheduleRef, {
        A: defaultDistrictSchedule,
        B: defaultDistrictSchedule,
        C: defaultDistrictSchedule,
        D: defaultDistrictSchedule,
        E: defaultDistrictSchedule,
        globalRoundOneOpen: false // Fallback toggle
    });
    console.log("Schedule initialized successfully!");
  } catch (error) {
    console.error("Error setting schedule:", error);
  }
}

initSchedule();
