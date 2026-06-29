import { initializeApp } from "firebase/app";
import { getFirestore, collectionGroup, getDocs } from "firebase/firestore";
import fs from "fs";

const content = fs.readFileSync("js/firebase-config.js", "utf-8");
const configStr = content.split("const firebaseConfig = ")[1].split("};")[0] + "}";
const firebaseConfig = eval("(" + configStr + ")");

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const snap = await getDocs(collectionGroup(db, "customers"));
    if (snap.size > 0) {
        console.log("Check-in data:", snap.docs[0].data());
        console.log("Path:", snap.docs[0].ref.path);
    }
    process.exit(0);
}
run();
