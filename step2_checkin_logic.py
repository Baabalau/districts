import re

with open('checkin.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add a check for banned users right after we get the userData
old_user_query = '''            try {
                // 1. Get User Profile
                const userRef = doc(db, "users", user.uid);
                let userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        displayName: user.displayName || "Crawler",
                        email: user.email,
                        points: 0,
                        checkins: []
                    });
                    userSnap = await getDoc(userRef); // re-fetch
                }
                const userData = userSnap.data();'''

new_user_query = '''            try {
                // 1. Get User Profile
                const userRef = doc(db, "users", user.uid);
                let userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        displayName: user.displayName || "Crawler",
                        email: user.email,
                        points: 0,
                        checkins: []
                    });
                    userSnap = await getDoc(userRef); // re-fetch
                }
                const userData = userSnap.data();

                // Ban check
                if (userData.isBanned) {
                    statusMsg.innerHTML = "Your account has been suspended.";
                    homeBtn.style.display = "inline-block";
                    return;
                }'''

content = content.replace(old_user_query, new_user_query)

with open('checkin.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Checkin logic updated to block suspended accounts")
