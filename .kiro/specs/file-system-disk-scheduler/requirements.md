# Requirements Document

## Introduction

A web-based file system disk scheduler simulation built with React, FastAPI, and MongoDB. Users register and log in, then interact with a single home page divided into four sections: a file tree explorer, a CLI panel, a memory/storage display, and a disk scheduling algorithm panel. The system manages file metadata (name, path, size, start/end bytes) per user within a 100 MB simulated storage space, and simulates disk head movement using classic scheduling algorithms. No actual files are written to disk — this is purely a metadata simulation.

## Glossary

- **System**: The full web application (React frontend + FastAPI backend + MongoDB).
- **Frontend**: The React-based single-page web UI.
- **Backend**: The FastAPI server handling business logic and data persistence.
- **Database**: The MongoDB instance storing user and file metadata.
- **Auth_Service**: The backend component responsible for user registration and login.
- **File_Manager**: The backend component responsible for file metadata CRUD operations.
- **Scheduler**: The frontend/backend component that implements disk scheduling algorithms.
- **CLI_Panel**: The frontend component that accepts and processes text commands.
- **Storage_Display**: The frontend component that renders the memory usage bar.
- **File_Tree**: The frontend component that displays files in the current directory.
- **User**: A person interacting with the System through the browser.
- **File_Record**: A stored document containing id, filename, path, size, start byte, end byte, and createdAt for a given user.
- **Disk_Head**: The simulated read/write head whose position (in bytes) is tracked during scheduling simulation.
- **lastHead**: The last known byte position of the Disk_Head, stored per user and updated after every add, delete, or algorithm execution.
- **Storage_Quota**: The fixed per-user storage limit of 100 MB (104,857,600 bytes).
- **Start_Byte**: The byte offset at which a file begins in the simulated storage space.
- **End_Byte**: The byte offset at which a file ends in the simulated storage space (Start_Byte + size - 1).

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a User, I want to register and log in with my email and password, so that my files and disk head state are saved and isolated from other users.

#### Acceptance Criteria

1. THE Auth_Service SHALL expose a single `POST /auth` endpoint that handles both registration and login based on the action field in the request body.
2. WHEN a registration request is received with a unique email and password, THE Auth_Service SHALL create a new user document containing uid, email, password, lastHead (defaulting to 0), and createdAt, and return a success response.
3. IF a registration request is received with an email that already exists in the Database, THEN THE Auth_Service SHALL return an error response indicating the email is already registered.
4. WHEN a login request is received with a matching email and password, THE Auth_Service SHALL return the user's uid and lastHead.
5. IF a login request is received with an email or password that does not match any user record, THEN THE Auth_Service SHALL return an error response indicating invalid credentials.
6. THE Frontend SHALL display a home page with an email input, a password input, a login button, and a registration button before the user is authenticated.
7. WHEN authentication succeeds, THE Frontend SHALL navigate the user to the main application view without a full page reload.

---

### Requirement 2: File Tree Display

**User Story:** As a User, I want to see the files in my current directory, so that I can browse and manage my simulated file system like a traditional file explorer.

#### Acceptance Criteria

1. WHEN the main application view loads, THE File_Tree SHALL fetch and display all File_Records belonging to the current User from the `GET /files` endpoint.
2. THE File_Tree SHALL display each File_Record showing at minimum the filename and size.
3. THE File_Tree SHALL display an "Add File" button and a "Delete File" button.
4. WHEN the User clicks "Add File", THE Frontend SHALL open the operating system's native file picker dialog so the User can select a file from their local machine.
5. WHEN the User selects a file through the file picker, THE Frontend SHALL capture the filename, path, and file size in bytes from the selected file's metadata.
6. WHEN the User clicks "Delete File", THE Frontend SHALL prompt the User to provide or confirm the filename to delete.
7. WHILE the file list is being fetched, THE File_Tree SHALL display a loading indicator.
8. IF the Backend returns an empty file list, THEN THE File_Tree SHALL display a message indicating no files exist in the current directory.

---

### Requirement 3: CLI Panel

**User Story:** As a User, I want a command-line panel, so that I can perform file operations using text commands as an alternative to the GUI.

#### Acceptance Criteria

1. THE CLI_Panel SHALL accept the following commands: `open <foldername>`, `del <filename>`, and `touch <filename>`.
2. WHEN the User enters `open <foldername>`, THE CLI_Panel SHALL navigate the File_Tree to display the contents of the specified folder, equivalent to clicking into that folder in the File_Tree.
3. WHEN the User enters `del <filename>`, THE CLI_Panel SHALL trigger the same delete flow as clicking "Delete File" in the File_Tree for the specified filename.
4. WHEN the User enters `touch <filename>`, THE CLI_Panel SHALL add a new file entry with the given filename in the current directory, equivalent to using "Add File" in the File_Tree, using a size of 0 bytes if no size is provided.
5. WHEN a CLI command completes successfully, THE CLI_Panel SHALL display a confirmation message.
6. IF the User enters an unrecognized command, THEN THE CLI_Panel SHALL display an error message listing the valid commands.
7. IF the User enters `del <filename>` for a file that does not exist, THEN THE CLI_Panel SHALL display an error message indicating the file was not found.

---

### Requirement 4: Memory and Storage Display

**User Story:** As a User, I want to see a visual representation of my storage usage, so that I understand how much of my 100 MB quota is used and available.

#### Acceptance Criteria

1. THE Storage_Display SHALL render a horizontal bar representing the full 100 MB Storage_Quota as a proportional visual map of the entire simulated storage space.
2. THE Storage_Display SHALL render each File_Record as a distinct red segment on the bar, positioned and sized proportionally to its Start_Byte and End_Byte relative to the 100 MB total.
3. THE Storage_Display SHALL render all byte ranges not occupied by any File_Record as grey segments on the bar, including gaps between files and space after the last file.
4. THE Storage_Display SHALL display the used and total values numerically alongside the bar (e.g., "42 MB / 100 MB").
5. WHEN a file is added, THE Storage_Display SHALL update the bar to add the new file's red segment at its allocated byte range without a full page reload.
6. WHEN a file is deleted, THE Storage_Display SHALL update the bar to remove the deleted file's red segment and restore that range to grey without a full page reload.
7. IF the User's used storage reaches the Storage_Quota, THEN THE Storage_Display SHALL visually indicate that the quota is full.

---

### Requirement 5: Add File (Storage Allocation)

**User Story:** As a User, I want to add a file to my simulated storage, so that the system allocates space for it and tracks its byte range.

#### Acceptance Criteria

1. WHEN the User submits a file via the file picker or `touch` command, THE Frontend SHALL sort the existing File_Records by End_Byte and find the first gap between consecutive records large enough to fit the new file's size, falling back to the space after the last End_Byte if no gap is found.
2. WHEN the Frontend has determined the Start_Byte and End_Byte for the new file, THE Frontend SHALL send a `POST /file` request containing the filename, path, size, start, and end to the Backend.
3. WHEN the Backend receives a valid `POST /file` request, THE File_Manager SHALL store a File_Record containing id, filename, path, size, start, end, and createdAt in the Database using the start and end values provided by the Frontend.
4. WHEN a file is successfully added, THE File_Manager SHALL update the User's lastHead to the Start_Byte of the newly added file and persist the updated lastHead to the Database.
5. WHEN a file is successfully added, THE Backend SHALL return the created File_Record and THE Frontend SHALL add it to the File_Tree and update the Storage_Display without a full page reload.
6. IF the file's size would cause the User's total used storage to exceed the Storage_Quota of 100 MB, THEN THE File_Manager SHALL reject the request and return an error message indicating the quota has been exceeded.

---

### Requirement 6: Delete File (Storage Reclamation)

**User Story:** As a User, I want to delete a file from my simulated storage, so that the space it occupied is reclaimed and available for future files.

#### Acceptance Criteria

1. WHEN the User requests deletion of a file by filename (via GUI or CLI), THE Frontend SHALL send a `DELETE /file` request with the filename to the Backend.
2. WHEN the Backend receives a valid `DELETE /file` request, THE File_Manager SHALL remove the corresponding File_Record from the Database.
3. WHEN a file is successfully deleted, THE File_Manager SHALL update the User's lastHead to the Start_Byte of the deleted file and persist the updated lastHead to the Database.
4. WHEN a file is successfully deleted, THE Frontend SHALL remove the file from the File_Tree and update the Storage_Display to reflect the reclaimed space without a full page reload.
5. IF the User requests deletion of a file that does not exist, THEN THE File_Manager SHALL return an error response indicating the file was not found.

---

### Requirement 7: Disk Scheduling Algorithms

**User Story:** As a User, I want to select multiple files and run a disk scheduling algorithm on them, so that I can observe how the disk head traverses the simulated storage.

#### Acceptance Criteria

1. THE Frontend SHALL allow the User to select multiple File_Records from the File_Tree for scheduling simulation.
2. THE Frontend SHALL allow the User to choose a scheduling algorithm from the following options: FCFS, SSTF, and SCAN.
3. WHERE the LOOK algorithm is enabled, THE Frontend SHALL include LOOK as a selectable algorithm option.
4. WHERE the C-SCAN algorithm is enabled, THE Frontend SHALL include C-SCAN as a selectable algorithm option.
5. WHEN the User triggers a simulation, THE Scheduler SHALL retrieve the Start_Byte values of the selected File_Records and use the User's current lastHead as the initial Disk_Head position.
6. WHEN the FCFS algorithm is selected, THE Scheduler SHALL process the Start_Byte positions in the order the files were added (by createdAt).
7. WHEN the SSTF algorithm is selected, THE Scheduler SHALL always move the Disk_Head to the Start_Byte nearest to the current Disk_Head position.
8. WHEN the SCAN algorithm is selected, THE Scheduler SHALL move the Disk_Head in one direction servicing Start_Byte positions until reaching the boundary of the allocated storage space, then reverse direction.
9. WHEN a simulation completes, THE Scheduler SHALL return the ordered sequence of Start_Byte positions visited and the total seek distance (sum of absolute differences between consecutive positions).
10. WHEN a simulation completes, THE File_Manager SHALL update the User's lastHead to the last Start_Byte position reached by the Disk_Head and persist the updated lastHead to the Database.
11. WHEN a simulation completes, THE Frontend SHALL display the traversal sequence and total seek distance to the User.

---

### Requirement 8: Disk Head State Persistence

**User Story:** As a User, I want the disk head position to persist across operations, so that each simulation starts from a realistic position reflecting prior activity.

#### Acceptance Criteria

1. THE Database SHALL store a lastHead field on each user document representing the current byte position of the Disk_Head.
2. WHEN a file is added, THE File_Manager SHALL set lastHead to the Start_Byte of the added file and persist it to the Database.
3. WHEN a file is deleted, THE File_Manager SHALL set lastHead to the Start_Byte of the deleted file and persist it to the Database.
4. WHEN a scheduling algorithm finishes executing, THE Scheduler SHALL set lastHead to the last Start_Byte position reached and persist it to the Database.
5. WHEN the Frontend loads or refreshes, THE Frontend SHALL fetch the current User's lastHead via `GET /user` and display it in the disk scheduling section.

---

### Requirement 9: API Endpoints

**User Story:** As a developer, I want a minimal and well-defined set of API endpoints, so that the frontend and backend communicate consistently.

#### Acceptance Criteria

1. THE Backend SHALL expose exactly the following endpoints: `POST /auth`, `GET /user`, `POST /file`, `GET /files`, and `DELETE /file`.
2. WHEN `GET /user` is called with a valid user identifier, THE Backend SHALL return the user's uid, email, lastHead, and createdAt.
3. WHEN `GET /files` is called with a valid user identifier, THE Backend SHALL return all File_Records belonging to that user.
4. WHEN `POST /file` is called with valid file data and a valid user identifier, THE Backend SHALL create and return the new File_Record.
5. WHEN `DELETE /file` is called with a valid filename and user identifier, THE Backend SHALL delete the matching File_Record and return a success response.
6. IF any endpoint receives a request with a missing or invalid user identifier, THEN THE Backend SHALL return an HTTP 401 response.
7. IF any endpoint encounters an unexpected error, THEN THE Backend SHALL return an HTTP 500 response with a descriptive error message.

---

### Requirement 10: Error Handling and User Feedback

**User Story:** As a User, I want clear feedback when operations succeed or fail, so that I always know the current state of the system.

#### Acceptance Criteria

1. IF the Backend returns an error response, THEN THE Frontend SHALL display a human-readable error message to the User.
2. WHEN the Frontend displays an error message, THE Frontend SHALL make the message dismissible by the User.
3. IF the Database is unreachable, THEN THE Backend SHALL return an HTTP 503 response with a descriptive error message.
4. IF a scheduling simulation is triggered with no files selected, THEN THE Frontend SHALL display an error message indicating that at least one file must be selected.
