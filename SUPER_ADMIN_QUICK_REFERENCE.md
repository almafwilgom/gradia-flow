# Super Admin Schools Management - Quick Reference

## Access Point
- **Sidebar Menu:** Click "Management" (⚙️) in Super Admin layout
- **Direct URL:** `/super-admin/schools-management`
- **Requires:** Super Admin role

## Main Views

### 1. All Schools Tab
**What You See:**
- Statistics cards (Total, Approved, Pending, Disabled counts)
- Table with all schools
- Quick approval/disable buttons

**What You Can Do:**
- Click any school row to see details
- Click "Approve" to approve pending schools
- Click "Disable" to disable active schools
- Search/filter (if needed)

### 2. School Details Tab
**What You See:**
- School ID, Code, Status, Subscription Plan
- Disabled reason (if applicable)
- Students table with performance metrics
- Detailed results by subject/term

**What You Can Do:**
- View all students in the school
- See individual student performance
- View their grades and scores
- Navigate back to schools list

## Key Metrics Displayed

### School Summary
| Metric | Shows |
|--------|-------|
| Total Schools | Count of all schools |
| Approved | Schools with "approved" status |
| Pending | Schools awaiting approval |
| Disabled | Schools that are disabled |

### Student Performance
| Metric | Shows |
|--------|-------|
| Total Students | Active students in school |
| With Results | Students who have grades |
| Avg Performance | Average score across all students |
| A Grade Count | Total excellent grades |

### Individual Student Data
| Column | Shows |
|--------|-------|
| Student Name | First + Last Name |
| Student ID | UUID (shortened) |
| Student Code | STU-XXXXXXXX format |
| Class | Class/Level name |
| Avg Score | Average across all subjects |
| Subjects | Number of subjects with grades |
| A Grades | Count of excellent grades |

## Actions

### Approve a School
1. From "All Schools" tab
2. Find school with "pending" status (yellow badge)
3. Click the "Approve" button
4. Status changes to "approved" (green badge)

### Disable a School
1. From "All Schools" tab (or School Details if viewing)
2. Click the "Disable" button
3. Enter reason in dialog box
4. Confirm - status changes to "disabled" (red badge)
5. Reason is now stored and visible

### View School Details
1. Click on any school row
2. Automatically switches to "School Details" tab
3. Scroll to see all data
4. Click "All Schools" tab to go back

## Color Meanings

### Status Badges
- 🟢 **Green** - Approved
- 🟡 **Yellow** - Pending
- 🔴 **Red** - Disabled

### Performance Grades
- 🟢 **Green** - A Grade (Excellent)
- 🔵 **Blue** - B Grade (Good)
- 🟡 **Yellow** - C Grade (Average)
- 🔴 **Red** - D/F Grade (Poor)

### Stat Cards
- Blue = Information
- Green = Positive/Approved
- Yellow = Pending/Attention needed
- Red = Disabled/Issues

## Data Displayed for Each School

### Basic Info
- School Name
- School Code (EDU-XXXXXX)
- Status (Pending/Approved/Disabled)
- Subscription Plan
- Disabled Reason (if applicable)
- Creation Date

### Student Performance
- Count of total students
- Count of students with results
- School-wide average score
- Total excellent grades

### Student Details (Table)
- Student name and ID
- Student code
- Class assignment
- Individual average score
- Number of subjects
- A grades count

### Results (Detailed Table)
- Student name
- Subject name
- Academic term
- Session year
- CA score
- Exam score
- Total score
- Final grade

## Tips

1. **Click school row to see details** - Don't need separate details button
2. **Approve before students can access system** - Pending schools show "pending" status
3. **Add reason when disabling** - Helps with audit trail
4. **Check average performance** - Green stat cards show school is performing well
5. **A Grade count** - Shows excellence level in the school
6. **Multiple tabs** - Use tabs to switch between schools without going back

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No schools showing | Wait for data to load (loading state shows) |
| Can't approve/disable | Check if school status is correct for that action |
| No students shown | School may not have active students yet |
| No results data | Students may not have grades entered yet |
| Error messages | Check error box at top - read the specific error |

## Keyboard Shortcuts

- **Enter** - Confirm action after clicking button
- **Escape** - Close reason dialog without disabling
- **Arrow keys** - Navigate table rows (if enabled)
- **Tab** - Move between buttons and elements

## Best Practices

1. ✅ Approve schools after they meet requirements
2. ✅ Document reason for disabling schools
3. ✅ Review student performance regularly
4. ✅ Check average scores to identify struggling schools
5. ✅ Monitor A grade counts to identify high performers

## Common Tasks

### Monitor a School's Performance
1. Go to Management tab
2. Click on school name
3. Check "Avg Performance" card - should be 50+ for healthy schools
4. Review "A Grade Count" - shows excellence level
5. Scroll through detailed results for subject analysis

### Approve New School
1. Look for yellow "pending" badges
2. Click the corresponding "Approve" button
3. Status immediately changes to green "approved"

### Track School Status Changes
1. Visit Management page regularly
2. Statistics cards show distribution
3. Pending schools need approval
4. Disabled schools show reason in details

### Find Top Performing Students
1. Select a school
2. Look at "A Grades" column in students table
3. Click that row if you need more details
4. Check detailed results section below

### Investigate Poor Performance
1. Select school
2. Check "Avg Performance" card - if below 50, investigate
3. Review "A Grade Count" - should be more than half of total
4. Scroll to detailed results to find struggling subjects
5. Note which students have low scores (below 40)
