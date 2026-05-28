const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkVenues() {
  try {
    const querySnapshot = await getDocs(collection(db, "venues"));
    console.log(`Found ${querySnapshot.size} venues in Firestore.`);
    if (querySnapshot.size > 0) {
      const first = querySnapshot.docs[0].data();
      console.log("Sample venue:", first);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkVenues();