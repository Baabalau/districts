import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField, deleteDoc } from "firebase/firestore";
import fs from "fs";

const content = fs.readFileSync("js/firebase-config.js", "utf-8");
const configStr = content.split("const firebaseConfig = ")[1].split("};")[0] + "}";
const firebaseConfig = eval("(" + configStr + ")");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeVotes() {
    console.log("Starting vote wipe FAST...");
    
    // 1. Reset all venue voteCounts and delete audit records
    const venuesSnap = await getDocs(collection(db, "venues"));
    let venueCount = 0;
    
    const updatePromises = [];
    console.log(`Found ${venuesSnap.size} venues to reset.`);
    for (const venueDoc of venuesSnap.docs) {
        if (venueDoc.data().voteCount !== 0) {
            updatePromises.push(updateDoc(venueDoc.ref, { voteCount: 0 }));
            venueCount++;
        }
    }
    await Promise.all(updatePromises);
    console.log(`Reset ${venueCount} venues.`);
    
    // 2. Clear votes from all users
    const usersSnap = await getDocs(collection(db, "users"));
    let userCount = 0;
    const userPromises = [];
    for (const userDoc of usersSnap.docs) {
        if (userDoc.data().votes) {
            userPromises.push(updateDoc(userDoc.ref, { votes: deleteField() }));
            userCount++;
        }
    }
    await Promise.all(userPromises);
    console.log(`Cleared voting history for ${userCount} users.`);
    
    console.log("Vote wipe complete!");
    process.exit(0);
}

wipeVotes().catch(err => {
    console.error(err);
    process.exit(1);
});
