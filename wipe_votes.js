import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField, deleteDoc } from "firebase/firestore";
import fs from "fs";

const content = fs.readFileSync("js/firebase-config.js", "utf-8");
const configStr = content.split("const firebaseConfig = ")[1].split("};")[0] + "}";
const firebaseConfig = eval("(" + configStr + ")");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function wipeVotes() {
    console.log("Starting vote wipe...");
    
    // 1. Reset all venue voteCounts and delete audit records
    const venuesSnap = await getDocs(collection(db, "venues"));
    let venueCount = 0;
    let auditCount = 0;
    
    console.log(`Found ${venuesSnap.size} venues to reset.`);
    for (const venueDoc of venuesSnap.docs) {
        await updateDoc(venueDoc.ref, { voteCount: 0 });
        venueCount++;
        
        const auditSnap = await getDocs(collection(db, "venues", venueDoc.id, "votes"));
        for (const auditDoc of auditSnap.docs) {
            await deleteDoc(auditDoc.ref);
            auditCount++;
        }
    }
    console.log(`Reset ${venueCount} venues and deleted ${auditCount} audit records.`);
    
    // 2. Clear votes from all users
    const usersSnap = await getDocs(collection(db, "users"));
    let userCount = 0;
    for (const userDoc of usersSnap.docs) {
        // Only update if they actually have a votes field to save writes, but for safety we'll just try to delete it
        try {
             await updateDoc(userDoc.ref, { votes: deleteField() });
             userCount++;
        } catch(e) {
             // Field might not exist, ignore
        }
    }
    console.log(`Cleared voting history for ${userCount} users.`);
    
    console.log("Vote wipe complete!");
    process.exit(0);
}

wipeVotes().catch(err => {
    console.error(err);
    process.exit(1);
});
