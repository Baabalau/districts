import re

with open('/Users/baabalau/.cursor/plans/election_management_&_state_automation_da8ed0ea.plan.md', 'r') as f:
    plan = f.read()

# Replace Top 5 with Top 10
plan = plan.replace('Top 5', 'Top 10')
plan = plan.replace('slice(0, 5)', 'slice(0, 10)')

# Update dashboard references
plan = plan.replace('admin.html', 'dashboard.html')
plan = plan.replace('Create `admin.html` dashboard', 'Expand existing `dashboard.html`')
plan = plan.replace('Dedicated Admin Dashboard (`dashboard.html`)', 'Expand Admin Dashboard (`dashboard.html`)')
plan = plan.replace('- Build an authenticated, user-friendly interface to manage the variables without touching the database directly.',
                    '- **Preserve Check-ins:** Maintain the existing functionality to view "check-ins" from users at participating businesses.\\n- **Vote Viewer:** Add a new tab/view to easily view all votes cast for a business (including who voted and when).\\n- **Schedule & Variables Management:** Build a user-friendly interface to manage the election variables without touching the database directly.')

with open('/Users/baabalau/.cursor/plans/election_management_&_state_automation_da8ed0ea.plan.md', 'w') as f:
    f.write(plan)
