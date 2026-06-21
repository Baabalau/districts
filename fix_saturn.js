import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDf-vGCbNNKa6xayqCJXSJc_JDWR8atJ_4",
  authDomain: "districts-after-dark.firebaseapp.com",
  projectId: "districts-after-dark"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const querySnapshot = await getDocs(collection(db, "venues"));
    let docId = null;
    querySnapshot.forEach((docSnap) => {
        if (docSnap.data().name === 'SATURN BAR') {
            docId = docSnap.id;
        }
    });

    if (docId) {
        console.log("Updating document: ", docId);
        await updateDoc(doc(db, "venues", docId), {
            lat: 29.9679094,
            lng: -90.0442228,
            district: "C"
        });
        console.log("Success");
    } else {
        console.log("Not found");
    }
    process.exit(0);
}
run();
