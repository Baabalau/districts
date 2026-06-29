import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Check-ins table UI update
content = content.replace('<th>Photo</th>\n                    </tr>', '<th>Photo</th>\n                        <th>Actions</th>\n                    </tr>')

# Check-ins map rows to include uid and venueId
old_all_data = '''                    allData.push({
                        id: `${venueId}_${custDoc.id}`,
                        business: venueName,
                        user: custData.displayName || custData.email || "Unknown User",
                        email: custData.email || "",'''

new_all_data = '''                    allData.push({
                        id: `${venueId}_${custDoc.id}`,
                        venueId: venueId,
                        userId: custDoc.id,
                        business: venueName,
                        user: custData.displayName || custData.email || "Unknown User",
                        email: custData.email || "",'''
content = content.replace(old_all_data, new_all_data)

old_table_row = '''                        <td style="text-align: center;">${row.visits}</td>
                        <td>${photoHTML}</td>
                    </tr>'''

new_table_row = '''                        <td style="text-align: center;">${row.visits}</td>
                        <td>${photoHTML}</td>
                        <td style="font-size: 0.8rem;">
                            <button onclick="window.invalidateCheckin('${row.venueId}', '${row.userId}')" style="margin-bottom: 5px; background: #6b3333; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; width: 100%;">Invalidate Check-in</button><br>
                            <button onclick="window.banUser('${row.userId}')" style="background: #333; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; width: 100%;">Ban User</button>
                        </td>
                    </tr>'''
content = content.replace(old_table_row, new_table_row)

# Votes table UI update
content = content.replace('<th>Total Votes</th>\n                    </tr>', '<th>Total Votes</th>\n                        <th>Actions</th>\n                    </tr>')

# Since Votes are just grouped by venue right now, we need to add an expand function
old_votes_row = '''            votesTbody.innerHTML = filtered.map(v => `
                <tr>
                    <td>${v.district}</td>
                    <td>${v.name}</td>
                    <td><strong>${v.votes}</strong></td>
                </tr>
            `).join('');'''

new_votes_row = '''            votesTbody.innerHTML = filtered.map(v => `
                <tr style="cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'" onclick="window.expandVotes('${v.id}')">
                    <td>${v.district}</td>
                    <td>${v.name}</td>
                    <td><strong>${v.votes}</strong></td>
                    <td><button style="background: transparent; color: var(--text-primary); border: 1px solid var(--text-secondary); padding: 4px 10px; border-radius: 4px; cursor: pointer;">View All Votes</button></td>
                </tr>
                <tr id="votes-expand-${v.id}" style="display: none; background: rgba(0,0,0,0.3);">
                    <td colspan="4" style="padding: 0;">
                        <div id="votes-content-${v.id}" style="padding: 15px;">Loading votes...</div>
                    </td>
                </tr>
            `).join('');'''
content = content.replace(old_votes_row, new_votes_row)

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard UI updated with Action buttons")
