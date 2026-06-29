import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Currently, if you log in, it triggers fetchData() on onAuthStateChanged. But it doesn't trigger fetchVotes() etc.
# But even checkins table seems to be loading forever.
# Let's add better error handling to fetchData()
old_catch = '''            } catch (error) {
                console.error("Error fetching data:", error);
                loadingEl.innerHTML = `<span style="color:#ff6b6b">Error loading data: ${error.message}</span>`;
            }'''

new_catch = '''            } catch (error) {
                console.error("Error fetching data:", error);
                loadingEl.innerHTML = `<span style="color:#ff6b6b">Error loading data: ${error.message}</span>`;
                loadingEl.style.display = "block";
                tableWrapper.style.display = "none";
            }'''

content = content.replace(old_catch, new_catch)

# Also check for empty venues returning empty data resulting in no fetchPromises resolving.
# If no venues have customers, it won't crash but maybe it hangs.
old_promise = '''                await Promise.all(fetchPromises);
                
                // Initial sort (newest first)
                sortData();
                renderTable();'''

new_promise = '''                await Promise.all(fetchPromises);
                
                // Initial sort (newest first)
                if (allData.length === 0) {
                    loadingEl.innerHTML = `<span>No check-in data found.</span>`;
                    loadingEl.style.display = "block";
                    tableWrapper.style.display = "none";
                } else {
                    sortData();
                    renderTable();
                }'''

content = content.replace(old_promise, new_promise)

# Votes handling
old_votes_catch = '''            } catch(e) {
                console.error(e);
                votesLoading.innerHTML = "Error loading votes";
            }'''
            
new_votes_catch = '''            } catch(e) {
                console.error(e);
                votesLoading.innerHTML = "Error loading votes: " + e.message;
                votesLoading.style.display = 'block';
            }'''
content = content.replace(old_votes_catch, new_votes_catch)

old_votes_render = '''                allVotes.sort((a, b) => b.votes - a.votes);
                renderVotesTable();'''

new_votes_render = '''                if (allVotes.length === 0) {
                    votesLoading.innerHTML = "No voting data found.";
                    votesLoading.style.display = 'block';
                    votesTableWrapper.style.display = 'none';
                } else {
                    allVotes.sort((a, b) => b.votes - a.votes);
                    renderVotesTable();
                }'''
content = content.replace(old_votes_render, new_votes_render)

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard logic fortified")
