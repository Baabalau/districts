import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs } from "firebase/firestore";
import fs from "fs";

const content = fs.readFileSync("js/firebase-config.js", "utf-8");
const configStr = content.split("const firebaseConfig = ")[1].split("};")[0] + "}";
const firebaseConfig = eval("(" + configStr + ")");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    try {
        const snap = await getDocs(collectionGroup(db, "customers"));
        console.log("Check-ins found:", snap.size);
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
run();
