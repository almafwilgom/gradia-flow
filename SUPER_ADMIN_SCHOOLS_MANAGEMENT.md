# Super Admin Schools Management System

## Overview
Complete school management interface for Super Admin role with approval/disapproval functionality, student tracking, and performance analytics.

## Features Implemented

### 1. **Schools List View**
- **Display all schools** in a paginated, sortable table
- **School information columns:**
  - School Name (clickable to view details)
  - School Code
  - Status (Pending/Approved/Disabled) with color-coded badges
  - Creation Date
  
- **Statistics Summary Cards:**
  - Total Schools count
  - Approved Schools count (Green)
  - Pending Schools count (Yellow)
  - Disabled Schools count (Red)

### 2. **School Approval System**
- **Approve Schools:** Super Admin can approve pending schools with one click
  - Changes status from "pending" to "approved"
  - Automatically sets `approved_at` timestamp
  - Refreshes the schools list

- **Disable Schools:** Super Admin can disable any active school
  - Requires reason for disabling (prompt dialog)
  - Changes status to "disabled"
  - Sets `disabled_at` timestamp and stores the reason
  - Disabled reason visible in school details
  - Option to view why a school was disabled

### 3. **School Details Tab**
When a school is selected, displays comprehensive information:

#### School Info Card:
- **School ID** - Unique UUID identifier
- **School Code** - EDU-XXXXXX format (auto-generated)
- **Status** - Color-coded badge (Approved/Pending/Disabled)
- **Subscription Plan** - Current plan tier
- **Disabled Reason** - If applicable, shown in red alert box

### 4. **Students & Performance Analytics**
Displays all active students for the selected school with:

#### Performance Summary Cards:
- **Total Students** - Count of all active students
- **Students with Results** - How many have submitted results
- **Average Performance** - Calculated from all student results
- **Total A Grades** - Count of excellent grades across all students

#### Student Performance Table:
Columns for each student:
- **Student Name** - First and Last Name
- **Student ID** - Unique UUID (shortened display)
- **Student Code** - STU-XXXXXXXX format
- **Class** - Class/Level name
- **Average Score** - Calculated from all subjects (highlighted in blue)
- **Number of Subjects** - Total subjects with results
- **A Grades Count** - Number of excellent grades (green badge)

### 5. **Detailed Results Report**
Comprehensive results table showing:
- **Student** - Student name
- **Subject** - Subject name
- **Term** - Academic term
- **Session Year** - Academic year
- **CA Score** - Continuous Assessment score
- **Exam Score** - Examination score
- **Total** - CA + Exam (highlighted)
- **Grade** - Letter grade (A/B/C/D/F) with color-coding:
  - A = Green (Excellent)
  - B = Blue (Good)
  - C = Yellow (Average)
  - D/F = Red (Poor)

## User Interface

### Tab Navigation
Two main tabs:
1. **All Schools** - Main view with all schools list
2. **{School Name} - Details** - Only appears when a school is selected

### Actions Available

#### From Schools List:
- Click on a school row to view detailed analytics
- **Approve Button** (appears for pending schools only)
- **Disable Button** (appears for non-disabled schools)
- Both buttons have loading states during action execution

#### From School Details:
- View comprehensive student performance data
- Navigate back to schools list via tab

### Navigation
- **Sidebar Menu:** "Management" section (⚙️) in Super Admin layout
- **URL:** `/super-admin/schools-management`
- **Route:** Protected - Super Admin role only

## Data Flow

### Initialization
1. Page loads and fetches all schools
2. Displays schools list with statistics
3. Super Admin can click on a school to view details

### When School Selected
1. Fetches all active students for that school
2. Fetches all results for those students
3. Calculates performance metrics
4. Displays in multiple views (summary, table, detailed results)

### When Action Performed
1. **Approve:** Updates school status to "approved" with timestamp
2. **Disable:** Updates school status to "disabled" with reason and timestamp
3. Both actions refresh the schools list
4. If current school is disabled, clears school selection

## Technical Implementation

### Component Structure
```
SchoolsManagement.jsx
├── State Management
│   ├── schools[] - All schools
│   ├── selectedSchool - Currently selected school
│   ├── students[] - Students in selected school
│   ├── results[] - Results for those students
│   └── UI States (loading, errors, messages, activeTab)
├── API Functions
│   ├── loadSchools() - Fetch all schools
│   ├── loadStudents() - Fetch students for school
│   ├── loadResults() - Fetch results for students
│   ├── handleApproveSchool() - Approve action
│   └── handleDisableSchool() - Disable action
└── UI Sections
    ├── Schools List Tab
    ├── School Details Tab
    │   ├── School Info Card
    │   ├── Students & Performance
    │   └── Detailed Results
```

### Database Queries
- `schools` table (read/update)
- `students` table (read) - filters by school_id and status = 'active'
- `results` table (read) - includes related subjects and students
- Uses nested select to get class names and subject names

### RLS Policies
Super Admin has full access:
- Can read all schools
- Can update school status/metadata
- Can read all students across all schools
- Can read all results

## Features Added Beyond Requirements

1. **Statistics Cards** - Quick overview of school status distribution
2. **Performance Analytics** - Aggregated student performance metrics
3. **Color-Coded Grades** - Visual distinction of academic performance
4. **Disable Reason Tracking** - Audit trail for why schools were disabled
5. **Real-time Status Updates** - List refreshes after actions
6. **Loading States** - User feedback during async operations
7. **Error Handling** - Comprehensive error messages
8. **Success Messages** - Confirmation of completed actions
9. **Shortened UUIDs** - Student IDs truncated for readability
10. **Responsive Grid Layout** - Works on mobile to desktop

## Error Handling

- Network errors displayed in alert box
- Query errors show specific Supabase error message
- Action failures prevent data corruption
- All errors are logged to browser console
- User can retry operations

## Performance Considerations

1. **Lazy Loading:** Students and results only load when school selected
2. **Efficient Queries:** Selects only needed columns
3. **Aggregation:** Client-side calculation for averages (minimal data)
4. **Pagination Ready:** Table structure supports future pagination

## Future Enhancements

1. Export students/results to CSV/Excel
2. Bulk approve/disable schools
3. Search and filter functionality
4. Advanced analytics charts
5. Student individual details page
6. Subject-wise performance breakdown
7. Attendance correlation with performance
8. Fee payment tracking
9. Teacher assignment verification
10. Class roster management

## How to Use

### Access
1. Login as Super Admin
2. Navigate to sidebar → "Management" (⚙️)
3. Or go to `/super-admin/schools-management`

### Approve a School
1. Find the school in the list with "pending" status
2. Click the "Approve" button
3. Confirm in the success message

### Disable a School
1. Click the "Disable" button for any active school
2. Enter reason when prompted
3. Confirm in the success message

### View School Details
1. Click on any school row (or anywhere in the row)
2. The details tab opens automatically
3. View students, their performance, and detailed results
4. Click back to "All Schools" tab to see the list again

### Analyze Student Performance
1. Select a school to view its details
2. Review performance summary cards
3. Scroll through students table to see individual scores
4. Scroll down for detailed results by subject/term
5. Color-coded grades make it easy to spot excellent/poor performers
