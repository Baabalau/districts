import re

with open('dashboard.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Add styles for tabs
new_styles = '''
        .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(203, 160, 82, 0.2);
            padding-bottom: 10px;
        }
        .tab-btn {
            padding: 10px 20px;
            background: transparent;
            color: var(--text-secondary);
            border: none;
            font-family: var(--font-header);
            font-size: 1.1rem;
            text-transform: uppercase;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s ease;
        }
        .tab-btn:hover {
            color: var(--text-primary);
        }
        .tab-btn.active {
            color: var(--text-primary);
            border-bottom: 2px solid var(--text-primary);
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        /* Toggle Switch Styles */
        .switch {
            position: relative;
            display: inline-block;
            width: 40px;
            height: 20px;
        }
        .switch input { 
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #333;
            transition: .4s;
            border-radius: 20px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 2px;
            bottom: 2px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: var(--brand-red, #B32424);
        }
        input:checked + .slider:before {
            transform: translateX(20px);
        }
'''
content = content.replace('    </style>', new_styles + '    </style>')

# Add Tab UI
tabs_html = '''    <div class="tabs">
        <button class="tab-btn active" data-target="checkins-view">Check-Ins</button>
        <button class="tab-btn" data-target="votes-view">Votes</button>
        <button class="tab-btn" data-target="runoff-view">Run-Off Admin</button>
        <button class="tab-btn" data-target="schedule-view">Schedule</button>
    </div>

    <div id="checkins-view" class="tab-content active">
        <div class="controls">
            <input type="text" id="search-input" placeholder="Search user or business..." style="width: 250px;">
            <button id="refresh-btn" class="btn">Refresh Data</button>
            <span id="record-count" style="color: var(--text-secondary); font-size: 0.9rem;"></span>
        </div>

        <div id="loading">Loading check-in data...</div>

        <div class="table-container" style="display: none;" id="table-wrapper">
            <table id="data-table">
                <thead>
                    <tr>
                        <th data-sort="time">Last Visit <span class="sort-icon">▼</span></th>
                        <th data-sort="business">Business <span class="sort-icon"></span></th>
                        <th data-sort="user">User <span class="sort-icon"></span></th>
                        <th data-sort="visits">Total Visits <span class="sort-icon"></span></th>
                        <th>Photo</th>
                    </tr>
                </thead>
                <tbody id="table-body">
                </tbody>
            </table>
        </div>
    </div>

    <div id="votes-view" class="tab-content">
        <div class="controls">
            <input type="text" id="votes-search" placeholder="Search venue..." style="width: 250px;">
            <button id="votes-refresh-btn" class="btn">Refresh Votes</button>
            <span id="votes-record-count" style="color: var(--text-secondary); font-size: 0.9rem;"></span>
        </div>
        <div id="votes-loading">Loading voting data...</div>
        <div class="table-container" style="display: none;" id="votes-table-wrapper">
            <table id="votes-table">
                <thead>
                    <tr>
                        <th>District</th>
                        <th>Venue</th>
                        <th>Total Votes</th>
                    </tr>
                </thead>
                <tbody id="votes-table-body"></tbody>
            </table>
        </div>
    </div>

    <div id="runoff-view" class="tab-content">
        <div class="controls">
            <select id="runoff-district-select">
                <option value="A">District A</option>
                <option value="B">District B</option>
                <option value="C">District C</option>
                <option value="D">District D</option>
                <option value="E">District E</option>
            </select>
            <button id="runoff-refresh-btn" class="btn">Load Venues</button>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Use the toggle to disqualify a venue from entering the Top 10 Run-Off.</p>
        <div id="runoff-loading" style="display:none;">Loading venues...</div>
        <div class="table-container" style="display: none;" id="runoff-table-wrapper">
            <table id="runoff-table">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Venue</th>
                        <th>Votes</th>
                        <th>Disqualify (Opt-Out)</th>
                    </tr>
                </thead>
                <tbody id="runoff-table-body"></tbody>
            </table>
        </div>
    </div>

    <div id="schedule-view" class="tab-content">
        <div class="controls">
            <select id="schedule-district-select">
                <option value="A">District A</option>
                <option value="B">District B</option>
                <option value="C">District C</option>
                <option value="D">District D</option>
                <option value="E">District E</option>
            </select>
            <button id="schedule-refresh-btn" class="btn">Load Schedule</button>
            <button id="schedule-save-btn" class="btn" style="background: var(--brand-red, #B32424);">Save Changes</button>
            <span id="schedule-save-msg" style="color: #45B7D1; display: none; margin-left: 10px;">Saved!</span>
        </div>
        
        <div id="schedule-form" style="display: none; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; max-width: 600px;">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px;">Round 1 Opens:</label>
                <input type="datetime-local" id="sched-round-1" style="width: 100%;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px;">Run-Off Starts (Top 10):</label>
                <input type="datetime-local" id="sched-run-off" style="width: 100%;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px;">Winner Announced:</label>
                <input type="datetime-local" id="sched-winner" style="width: 100%;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px;">Event Concludes (Post-Event State):</label>
                <input type="datetime-local" id="sched-post" style="width: 100%;">
            </div>
            <hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 20px 0;">
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px; color: var(--text-primary);">Official Winner (Venue ID):</label>
                <input type="text" id="sched-winner-id" placeholder="Paste venue document ID here" style="width: 100%;">
            </div>
        </div>
    </div>
'''

# Find the old controls and table, replace with new tabs structure
start_idx = content.find('<div class="controls">')
end_idx = content.find('<!-- Image Modal -->')

content = content[:start_idx] + tabs_html + content[end_idx:]

with open('dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Dashboard UI restructured")
