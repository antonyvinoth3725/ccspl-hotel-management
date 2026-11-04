# Report Permission Management - Complete Flow & Testing Guide

## 📋 System Overview

This document outlines the complete frontend-to-backend flow for the Report Permission Management system.

---

## 🏗️ Architecture

### Backend Stack
- **Framework**: ASP.NET Core 10.0
- **Database**: SQL Server 2019+
- **Pattern**: 3-Tier Repository (Interface → Repository → Controller)
- **Data Access**: DataFactory pattern with stored procedures

### Frontend Stack
- **Views**: Razor (.cshtml)
- **Client**: jQuery 3.x + Bootstrap 5
- **Styles**: Custom CSS with responsive design

---

## 📡 API Endpoints

### 1. GET `/Admin/ReportPermission`
**Purpose**: Render main page  
**Method**: HTTP GET  
**Response**: ReportPermission.cshtml view  
**Controller**: `ReportPermissionController.Index()`  

### 2. GET `/Admin/ReportPermission/roles`
**Purpose**: Load all roles into dropdown  
**Method**: HTTP GET  
**Response**: JSON array of roles
```json
[
  { "id": 1, "name": "Admin" },
  { "id": 2, "name": "Manager" },
  { "id": 3, "name": "User" }
]
```
**Controller**: `ReportPermissionController.GetRoles()`  
**Repository**: `IRolesRepository.GetAll()`  
**Table**: RoleMaster  

### 3. GET `/Admin/ReportPermission/reports?roleId={id}`
**Purpose**: Get all reports with current permission status for role  
**Method**: HTTP GET  
**Query Params**: `roleId` (int, required, > 0)  
**Response**: JSON array of reports with permissions
```json
[
  {
    "reportId": 1,
    "reportName": "SalesReport",
    "displayName": "Sales Report",
    "description": "Daily sales summary",
    "categoryId": 1,
    "categoryName": "Sales",
    "canView": true,
    "canPrint": true,
    "exportPdf": true,
    "exportExcel": false
  }
]
```
**Controller**: `ReportPermissionController.GetReportsWithPermissions(int roleId)`  
**Repository**: `IReportsRepository.GetReportsWithPermissions(int roleId)`  
**Database**: 
  - Stored Procedure: `SP_Report_GetReports` (with @RoleId, @CategoryId=NULL)
  - Tables: ReportMaster, ReportCategory, ReportPermission  
**Performance**: Joins handle permission filtering at database level

### 4. POST `/Admin/ReportPermission/save-bulk`
**Purpose**: Save multiple permission changes at once  
**Method**: HTTP POST  
**Content-Type**: application/json  
**Request Body**:
```json
{
  "roleId": 1,
  "permissions": [
    {
      "reportId": 1,
      "canView": true,
      "canPrint": true,
      "exportPdf": true,
      "exportExcel": true
    },
    {
      "reportId": 2,
      "canView": true,
      "canPrint": false,
      "exportPdf": false,
      "exportExcel": false
    }
  ]
}
```
**Response Success** (200):
```json
{
  "message": "Saved 2 permissions successfully"
}
```
**Response Error** (400/500):
```json
{
  "message": "Unable to save bulk permissions: {error details}"
}
```
**Controller**: `ReportPermissionController.SaveBulkPermissions()`  
**Repository**: `IReportsRepository.SaveReportPermission()` (called for each permission)  
**Database**: 
  - Stored Procedure: `SP_Report_SavePermission`
  - Parameters: @RoleId, @ReportId, @CanView, @CanPrint, @ExportPdf, @ExportExcel
  - Table: ReportPermission (Insert/Update)
  - Behavior: Transaction with automatic insert/update based on existence

### 5. POST `/Admin/ReportPermission/save`
**Purpose**: Save single permission  
**Method**: HTTP POST  
**Content-Type**: application/json  
**Request Body**:
```json
{
  "roleId": 1,
  "reportId": 5,
  "canView": true,
  "canPrint": true,
  "exportPdf": false,
  "exportExcel": false
}
```
**Response Success** (200):
```json
{
  "message": "Permission saved successfully"
}
```
**Controller**: `ReportPermissionController.SavePermission()`  
**Repository**: `IReportsRepository.SaveReportPermission()`  

---

## 🔄 Complete Flow Diagram

```
User navigates to /Admin/ReportPermission
           ↓
   ReportPermissionController.Index()
           ↓
   Renders ReportPermission.cshtml
           ↓
   report-permission.js initializes
           ↓
   AJAX: GET /Admin/ReportPermission/roles
           ↓
   ReportPermissionController.GetRoles()
           ↓
   RolesRepository.GetAll()
           ↓
   Returns: [{ id, name }, ...]
           ↓
   JavaScript populates role dropdown
           ↓
   User selects a role
           ↓
   AJAX: GET /Admin/ReportPermission/reports?roleId=X
           ↓
   ReportPermissionController.GetReportsWithPermissions(X)
           ↓
   ReportsRepository.GetReportsWithPermissions(X)
           ↓
   Execute: SP_Report_GetReports @RoleId=X, @CategoryId=NULL
           ↓
   Returns: Reports with current permissions
           ↓
   JavaScript renders permission grid table
           ↓
   User toggles checkboxes
           ↓
   User clicks "Save Permissions" button
           ↓
   AJAX: POST /Admin/ReportPermission/save-bulk
           ↓
   ReportPermissionController.SaveBulkPermissions()
           ↓
   For each permission:
     ↓
   ReportsRepository.SaveReportPermission(roleId, reportId, ...)
     ↓
   Execute: SP_Report_SavePermission with parameters
     ↓
   Database: Insert or Update ReportPermission record
           ↓
   Return: Success message
           ↓
   JavaScript shows toast notification
           ↓
   Complete!
```

---

## 📁 Files Involved

### Backend Files
1. **Controllers/Admin/ReportPermissionController.cs** (Main controller)
2. **Interfaces/IReportsRepository.cs** (Interface - 2 new methods)
3. **Repositories/ReportsRepository.cs** (Implementation)
4. **Interfaces/IRolesRepository.cs** (Role interface)
5. **Repositories/RolesRepository.cs** (Role implementation)

### Frontend Files
1. **Views/Admin/ReportPermission.cshtml** (Main view - role selector + table + buttons)
2. **wwwroot/js/admin/report-permission.js** (Client logic - AJAX calls, DOM manipulation)
3. **wwwroot/css/admin/reports.css** (Styling shared with reports module)

### Database Files
1. **SQL/ReportPermission_Setup.sql** (Table creation script)
2. **ReportPermission Table** (Stores role-report permissions)
3. **SP_Report_SavePermission** (Stored procedure - insert/update)
4. **SP_Report_GetReports** (Existing stored procedure - used for reading)

---

## 🧪 Manual Testing Checklist

### Step 1: Database Setup
- [ ] Execute `SQL/ReportPermission_Setup.sql` on SQL Server
- [ ] Verify `ReportPermission` table created
- [ ] Check indexes on RoleId, ReportId, and composite

### Step 2: Application Build & Run
```powershell
cd C:\Antony\CCSPL\Projects\GayatriCateringPortal_New
dotnet build --configuration Debug
dotnet run
```
- [ ] Build completes without errors
- [ ] Application starts successfully

### Step 3: Navigate to Page
- [ ] Open browser to `http://localhost:PORT/Admin/ReportPermission`
- [ ] Page loads with role selector dropdown
- [ ] Content loader appears briefly, then disappears
- [ ] "Select a role to manage report permissions" message displays

### Step 4: Load Roles
- [ ] Click role dropdown
- [ ] Verify roles load from database (Admin, Manager, etc.)
- [ ] Roles appear as options

### Step 5: Select Role & View Permissions
- [ ] Select a role from dropdown
- [ ] Content loader appears
- [ ] Permission grid renders with columns: FUNCTION, ALL, VIEW, PRINT, EXPORT PDF, EXPORT EXCEL
- [ ] Verify reports display with their current permissions
- [ ] Permissions show as checked/unchecked based on database values

### Step 6: Toggle Permissions
- [ ] Click individual checkboxes (VIEW, PRINT, etc.)
- [ ] Verify "ALL" checkbox updates (checks if all are checked)
- [ ] Click "SELECT ALL" checkbox
- [ ] Verify all checkboxes in that row toggle

### Step 7: Save Permissions
- [ ] Modify some permissions
- [ ] Click "Save Permissions" button
- [ ] Button shows "Saving..." state
- [ ] Success toast appears: "Saved X permissions successfully"
- [ ] Button returns to normal state

### Step 8: Verify Database Persistence
- [ ] Query ReportPermission table:
```sql
SELECT * FROM dbo.ReportPermission WHERE RoleId = 1;
```
- [ ] Verify saved permissions are in database with correct values

### Step 9: Reload Page & Verify Persistence
- [ ] Refresh browser (F5)
- [ ] Select same role again
- [ ] Verify permissions show as previously saved
- [ ] Confirms data persists correctly

### Step 10: Test Error Handling
- [ ] Select role, modify permissions
- [ ] Stop database connection (or simulate error)
- [ ] Click Save
- [ ] Error toast appears with meaningful message
- [ ] No unhandled exceptions

### Step 11: Test with Different Roles
- [ ] Repeat steps 5-9 with different roles
- [ ] Verify each role maintains separate permissions
- [ ] Confirm no data corruption or mixing

### Step 12: Test Reset Button
- [ ] Select role
- [ ] Click "Reset" button
- [ ] Form clears, permission grid hides
- [ ] "Select a role..." message displays

---

## 🔍 Key Integration Points

### Controller Layer
**File**: Controllers/Admin/ReportPermissionController.cs

```csharp
[HttpGet("")]
public async Task<IActionResult> Index()
// Purpose: Render view

[HttpGet("roles")]
public async Task<IActionResult> GetRoles()
// Returns: List<RoleMaster>
// Calls: _rolesRepository.GetAll()

[HttpGet("reports")]
public async Task<IActionResult> GetReportsWithPermissions(int roleId)
// Returns: List<dynamic> with report + permission data
// Calls: _reportsRepository.GetReportsWithPermissions(roleId)

[HttpPost("save-bulk")]
public async Task<IActionResult> SaveBulkPermissions(dynamic bulkData)
// Iterates permissions array
// Calls: _reportsRepository.SaveReportPermission() for each
```

### Repository Layer
**File**: Repositories/ReportsRepository.cs

```csharp
public async Task SaveReportPermission(int roleId, int reportId, bool canView, ...)
// Calls: SP_Report_SavePermission
// Pattern: DataFactory.CreateParameter() for null safety
// Action: Insert or Update in ReportPermission table

public async Task<IEnumerable<object>> GetReportsWithPermissions(int roleId)
// Calls: SP_Report_GetReports with @RoleId and @CategoryId=NULL
// Returns: Merged report + permission objects
// Efficient: Single DB call with join at database level
```

### View Layer
**File**: Views/Admin/ReportPermission.cshtml

```html
<select id="roleSelect" class="form-control role-dropdown">
  <!-- Populated by JavaScript -->
</select>

<table class="permission-table">
  <thead>
    <tr>
      <th>FUNCTION</th>
      <th>ALL</th>
      <th>VIEW</th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody id="permissionTableBody">
    <!-- Populated by JavaScript -->
  </tbody>
</table>

<button id="btnSavePermissions" class="btn btn-success">
  Save Permissions
</button>
```

### JavaScript Layer
**File**: wwwroot/js/admin/report-permission.js

Key functions:
- `loadRoles()` - GET /roles
- `loadReportsForRole(roleId)` - GET /reports?roleId=X
- `renderPermissionGrid()` - Render table UI
- `saveAllPermissions()` - POST /save-bulk
- Event handlers for checkbox changes

---

## 🚀 Performance Considerations

1. **Database**: Single SP_Report_GetReports call returns all reports + permissions
   - Optimization: Joins at database level (ReportMaster + ReportCategory + ReportPermission)
   - Result: O(n) single query instead of O(n*2) multiple queries

2. **Frontend**: Bulk save sends all changes in single POST
   - Optimization: JavaScript collects changes, sends once
   - Result: Reduced HTTP overhead

3. **Caching**: Browser caches permissions in session state
   - JavaScript maintains `state.permissions` object
   - Reduces redundant UI refreshes

4. **Validation**: Early validation on both client and server
   - Client: Checks roleId > 0
   - Server: Validates roleId > 0 and reportId > 0

---

## ⚠️ Error Handling

### Client-Side
- Invalid roleId → Show warning "Please select a role first"
- Network error → Show error toast "Unable to load roles"
- Save failure → Show error toast with server message

### Server-Side
- roleId ≤ 0 → HTTP 400 Bad Request
- reportId ≤ 0 → HTTP 400 Bad Request
- Database error → HTTP 500 with error message
- SQL exception → Caught and wrapped in InvalidOperationException

---

## 🔐 Security & Validation

1. **Input Validation**
   - Client: roleId > 0 check before API calls
   - Server: roleId > 0 and reportId > 0 on all endpoints
   - Database: Unique constraint (RoleId, ReportId)

2. **Access Control**
   - Controller requires authenticated user (implicit via ASP.NET Core)
   - roleId passed by user, validated against session

3. **Data Integrity**
   - Transaction in SP_Report_SavePermission
   - Unique constraint prevents duplicate permissions
   - Foreign keys ensure referential integrity (when enabled)

---

## 📝 Deployment Checklist

- [ ] Execute SQL/ReportPermission_Setup.sql on production database
- [ ] Verify ReportPermission table created
- [ ] Verify SP_Report_SavePermission exists
- [ ] Deploy compiled DLL (Controllers, Repositories)
- [ ] Deploy views (ReportPermission.cshtml)
- [ ] Deploy JavaScript (report-permission.js)
- [ ] Test with production data
- [ ] Monitor logs for errors
- [ ] Document menu item location (to be added to sidebar menus in future)

---

## 📌 Future Enhancements

1. **Menu Integration**: Add menu item to admin sidebar
2. **Audit Trail**: Track who changed permissions and when
3. **Batch Operations**: Import/export permissions as CSV
4. **Permission Templates**: Save permission sets as templates
5. **Reports by Department**: Filter reports by department/location
6. **Permission History**: View historical permission changes

---

## 🎯 Quick Links

- **Backend Controller**: [ReportPermissionController.cs](../Controllers/Admin/ReportPermissionController.cs)
- **Repository**: [ReportsRepository.cs](../Repositories/ReportsRepository.cs)
- **View**: [ReportPermission.cshtml](../Views/Admin/ReportPermission.cshtml)
- **JavaScript**: [report-permission.js](../wwwroot/js/admin/report-permission.js)
- **Database Setup**: [ReportPermission_Setup.sql](../SQL/ReportPermission_Setup.sql)

---

**Last Updated**: 2026-07-21  
**Status**: Ready for Testing
