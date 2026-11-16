# **Phase 0 – Project Management Tool (MVP Foundation)**

## **1. Objective**

Build the foundational version of a minimal project management and task tracking system.

The purpose is to allow a small team to create projects, organize tasks, assign responsibilities, and track task progress.

Focus on core functionality, simplicity, and usability.

## **2. Scope**

### **2.1 Authentication & Users**

- User login and logout.
- User management (create, edit, deactivate users).
- Basic user profile.
- Password management.
- Three user roles:
  - Admin
  - Project Manager
  - Member
- Role-based access control.

### **2.2 Projects Management**

- Create, edit, view, and archive projects.
- Project information:
  - Project name.
  - Description.
  - Owner / Project Manager.
  - Start date.
  - Due date.
  - Priority (Low, Medium, High).
  - Status (Planning, Active, On Hold, Completed, Archived).
- Add and remove project members.
- View all tasks belonging to a project.
- Filter projects by status and owner.
- Automatically calculate project progress based on completed tasks.

### **2.3 Task Management**

- Create, edit, view, and delete tasks.
- Tasks must belong to a project.
- Task information:
  - Title.
  - Description.
  - Project.
  - Created by.
  - Assigned user(s).
  - Priority (Low, Medium, High, Urgent).
  - Status (Backlog, To Do, In Progress, Review, Done).
  - Start date (optional).
  - Due date (optional).
  - Parent task (optional, for subtasks).
  - Created date.
  - Last updated date.
- Assign and reassign tasks.
- Update task status and priority.
- Support multiple assignees.
- Support subtasks.
- Display overdue tasks.
- Record important task modifications.

### **2.4 Task Views**

Implement three views:

**List View**

- Display tasks in a table.
- Search tasks.
- Filter by status, priority, assignee, and due date.
- Sort by due date, priority, and creation date.

**Kanban View**

- Display tasks grouped by status.
- Drag and drop tasks between statuses.
- Update task status when moved.

**My Tasks**

- Display tasks assigned to the logged-in user across all projects.
- Group tasks by status.
- Highlight overdue and upcoming tasks.

### **2.5 Task Collaboration**

- Add comments to tasks.
- Display comments in chronological order.
- Display task activity history.
- Attach files to tasks.
- Display task details and associated information.

### **2.6 Dashboard**

Provide a simple dashboard with:

**Overview Statistics**

- Active projects.
- Total open tasks.
- Completed tasks.
- Overdue tasks.
- Tasks due today.

**My Work**

- My assigned tasks.
- My overdue tasks.
- My upcoming tasks.
- Recently updated tasks.

**Project Overview**

- Project name.
- Project status.
- Completion percentage.
- Total tasks.
- Completed tasks.

### **2.7 Notifications**

Implement basic in-app notifications for:

- New task assignment.
- Task reassignment.
- New comment.
- User mention.
- Upcoming task deadline.
- Overdue task.

### **2.8 Activity Logging**

Record important system activities:

- Project creation and updates.
- Project membership changes.
- Task creation and updates.
- Task assignment changes.
- Task status changes.
- Task comments.

## **3. User Roles & Permissions**

**Admin**

- Full access to the system.
- Manage users.
- Manage all projects and tasks.
- View all activities.

**Project Manager**

- Create and manage projects.
- Add and remove project members.
- Create and manage project tasks.
- Assign tasks to project members.
- View project progress.

**Member**

- View projects they belong to.
- View project tasks.
- Update assigned tasks.
- Add task comments.
- View their personal task list.

## **4. Database Requirements**

Implement the following core tables:

- users
- roles
- projects
- project_members
- tasks
- task_assignees
- task_comments
- task_attachments
- task_activities
- notifications

Use relational constraints and indexes appropriately.

Important relationships:

- A project has multiple members.
- A project contains multiple tasks.
- A task can have multiple assignees.
- A task can have multiple comments.
- A task can have multiple attachments.
- A task can have multiple activity records.
- A task can optionally have a parent task.

## **5. Non-Functional Requirements**

- Responsive web interface.
- Secure authentication.
- Server-side validation.
- Role-based authorization.
- Pagination for large lists.
- Search and filtering.
- File upload validation.
- Consistent timezone handling.
- Database backup support.
- Soft deletion where appropriate.
- Activity logging for important operations.

## **6. Out of Scope**

The following features are explicitly excluded from Phase 0:

- Gantt charts.
- Time tracking.
- Timesheets.
- Budget and expense management.
- Invoicing.
- Resource planning.
- Recurring tasks.
- Advanced workflow automation.
- Custom fields.
- Advanced reporting.
- AI features.
- External integrations.
- Client portals.
- Mobile applications.

## **7. Phase 0 Completion Criteria**

Phase 0 is considered complete when:

1. Admin can manage system users.
2. Project managers can create and manage projects.
3. Projects support multiple members.
4. Users can create, assign, and manage tasks.
5. Tasks support priorities, deadlines, and statuses.
6. Users can view their assigned tasks across projects.
7. Tasks can be managed through List and Kanban views.
8. Users can comment on tasks and attach files.
9. Task activities are recorded.
10. In-app notifications work.
11. Dashboard statistics are accurate.
12. Access permissions are enforced consistently.

**Development principle:** Prioritize a functional, stable, and easy-to-use application. Avoid unnecessary complexity and implement only the requirements explicitly included in Phase 0.
