import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Listen to auth state changes to update the UI globally
document.addEventListener("DOMContentLoaded", () => {
    const authLink = document.getElementById("authLink");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in.
            if (authLink) {
                authLink.href = "profile.html";
                authLink.textContent = "Profile";
            }
            
            // Check if user document exists in Firestore, if not, create it
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
                try {
                    await setDoc(userRef, {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || "Crawler",
                        totalPoints: 0,
                        rsvps: [],
                        unlockedPromos: []
                    });
                } catch(e) {
                    console.error("Error creating user document: ", e);
                }
            }

            // Expose a global logout function
            window.logoutUser = () => {
                signOut(auth).then(() => {
                    window.location.href = "index.html";
                }).catch((error) => {
                    console.error("Error signing out: ", error);
                });
            };
            
        } else {
            // No user is signed in.
            if (authLink) {
                authLink.href = "login.html";
                authLink.textContent = "Log In / Sign Up";
            }
        }
    });
});
