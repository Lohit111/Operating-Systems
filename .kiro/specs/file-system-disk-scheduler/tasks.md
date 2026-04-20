# Implementation Plan: File System Disk Scheduler

## Overview

Build a full-stack web application from scratch using React (Vite + TypeScript) on the frontend, FastAPI on the backend, and MongoDB as the database. The app simulates a file system with disk scheduling algorithms. Implementation proceeds in layers: project scaffolding → backend API → frontend state and components → scheduler/allocator logic → integration and wiring.

Property-based tests use **fast-check** (frontend) and **Hypothesis** (backend). Unit tests use **Vitest** (frontend) and **pytest** (backend).

---

## Tasks

- [x] 1. Scaffold the project structure
  - Create a monorepo-style root with two subdirectories: `frontend/` and `backend/`
  - **Frontend:** initialise a Vite + React + TypeScript project (`npm create vite@latest frontend -- --template react-ts`); install dependencies: `react`, `react-dom`, `axios`, `fast-check`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@vitejs/plugin-react`
  - **Backend:** create `backend/` with a Python virtual environment; install `fastapi`, `uvicorn[standard]`, `motor` (async MongoDB driver), `bcrypt`, `python-dotenv`, `hypothesis`, `pytest`, `pytest-asyncio`, `httpx`
  - Add a root `README.md` and a `.gitignore` covering `node_modules/`, `__pycache__/`, `.env`, `venv/`
  - Configure `vitest.config.ts` with jsdom environment and `@testing-library/jest-dom` setup file
  - Configure `pytest.ini` (or `pyproject.toml`) with `asyncio_mode = auto`
  - _Requirements: none (scaffolding only)_

- [x] 2. Define shared types and constants
  - [x] 2.1 Create `frontend/src/types.ts` with `FileRecord` and `AppState` interfaces as specified in the design
    - Export `QUOTA = 104_857_600`
    - Export `SchedulerResult` interface (`sequence: number[]`, `seekDistance: number`, `finalHead: number`)
    - _Requirements: 5.1, 7.9_

  - [x] 2.2 Create `backend/models.py` with Pydantic models for request/response bodies
    - `AuthRequest` (`action`, `email`, `password`)
    - `AuthResponse` (`uid`, `lastHead`)
    - `FileCreateRequest` (`uid`, `filename`, `path`, `size`, `start`, `end`)
    - `FileRecord` (all fields including `id`, `createdAt`, `uid`)
    - `UserResponse` (`uid`, `email`, `lastHead`, `createdAt`)
    - _Requirements: 9.1–9.5_

- [x] 3. Set up MongoDB connection and database layer
  - [x] 3.1 Create `backend/database.py` that reads `MONGO_URI` and `DB_NAME` from `.env` and exposes an async Motor client with `users` and `files` collections
    - Add startup/shutdown lifespan hooks in `backend/main.py`
    - _Requirements: 8.1, 9.6_

  - [ ]\* 3.2 Write unit test for database connectivity
    - Test that the Motor client connects and the collections are accessible (use a test database)
    - _Requirements: 10.3_

- [x] 4. Implement the auth router (`POST /auth`)
  - [x] 4.1 Create `backend/routers/auth_router.py`
    - `action = "register"`: hash password with bcrypt, insert user document (`uid` = UUID v4, `email`, `password`, `lastHead = 0`, `createdAt`), return `{ uid, lastHead }`; return HTTP 400 if email already exists
    - `action = "login"`: find user by email, verify bcrypt hash, return `{ uid, lastHead }`; return HTTP 401 on mismatch
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]\* 4.2 Write property test for registration completeness (Property 1)
    - **Property 1: Registration produces a complete user document**
    - Use Hypothesis to generate valid `(email, password)` pairs; assert response contains `uid`, `email`, `lastHead == 0`, `createdAt`
    - Tag: `# Feature: file-system-disk-scheduler, Property 1: Registration produces a complete user document`
    - **Validates: Requirements 1.2**

  - [ ]\* 4.3 Write property test for duplicate email rejection (Property 2)
    - **Property 2: Duplicate email registration is always rejected**
    - Register once, attempt again with same email; assert error response every time
    - Tag: `# Feature: file-system-disk-scheduler, Property 2: Duplicate email registration is always rejected`
    - **Validates: Requirements 1.3**

  - [ ]\* 4.4 Write property test for login returning uid and lastHead (Property 3)
    - **Property 3: Login returns uid and lastHead for any registered user**
    - Register a user, then login; assert `uid` and `lastHead` match
    - Tag: `# Feature: file-system-disk-scheduler, Property 3: Login returns uid and lastHead for any registered user`
    - **Validates: Requirements 1.4**

  - [ ]\* 4.5 Write property test for invalid credentials rejection (Property 4)
    - **Property 4: Invalid credentials always return an error**
    - Generate email/password pairs never registered; assert error response
    - Tag: `# Feature: file-system-disk-scheduler, Property 4: Invalid credentials always return an error`
    - **Validates: Requirements 1.5**

  - [ ]\* 4.6 Write unit tests for auth router
    - Successful registration returns 200 with uid and lastHead
    - Duplicate email returns 400
    - Successful login returns 200 with uid and lastHead
    - Wrong password returns 401
    - _Requirements: 1.1–1.5_

- [x] 5. Implement the user router (`GET /user`)
  - [x] 5.1 Create `backend/routers/user_router.py`
    - `GET /user?uid=<uid>`: look up user by uid; return `{ uid, email, lastHead, createdAt }`; return HTTP 401 if uid missing or not found
    - Support optional `set_head=<number>` query parameter: if present, update `lastHead` in the database before returning (used by the frontend after scheduling simulation)
    - _Requirements: 8.4, 8.5, 9.2, 9.6_

  - [ ]\* 5.2 Write property test for GET /user completeness (Property 22)
    - **Property 22: GET /user returns all required fields for any registered user**
    - Use Hypothesis to generate registered users; assert response contains `uid`, `email`, `lastHead`, `createdAt`
    - Tag: `# Feature: file-system-disk-scheduler, Property 22: GET /user returns all required fields for any registered user`
    - **Validates: Requirements 9.2**

  - [ ]\* 5.3 Write property test for invalid uid returning HTTP 401 (Property 24)
    - **Property 24: Any endpoint with an invalid uid returns HTTP 401**
    - Generate random strings as uid; call `GET /user`; assert HTTP 401
    - Tag: `# Feature: file-system-disk-scheduler, Property 24: Any endpoint with an invalid uid returns HTTP 401`
    - **Validates: Requirements 9.6**

- [x] 6. Implement the file router (`POST /file`, `GET /files`, `DELETE /file`)
  - [x] 6.1 Create `backend/routers/file_router.py` — `POST /file`
    - Validate uid exists (HTTP 401 if not)
    - Check that `sum(existing sizes) + new size <= QUOTA`; return HTTP 400 with `"Storage quota exceeded"` if not
    - Insert file document with UUID v4 id and `createdAt`
    - Update user's `lastHead` to `start` of the new file
    - Return the created `FileRecord`
    - _Requirements: 5.3, 5.4, 5.6, 9.4_

  - [x] 6.2 Add `GET /files` to `file_router.py`
    - Validate uid (HTTP 401 if missing/invalid)
    - Return all `FileRecord`s for the user
    - _Requirements: 2.1, 9.3_

  - [x] 6.3 Add `DELETE /file` to `file_router.py`
    - Validate uid (HTTP 401 if missing/invalid)
    - Find file by `uid` + `filename`; return HTTP 404 if not found
    - Delete the document; update user's `lastHead` to the deleted file's `start`
    - Return `{ success: true, deletedFile: FileRecord }`
    - _Requirements: 6.2, 6.3, 6.5, 9.5_

  - [ ]\* 6.4 Write property test for POST /file storing a complete FileRecord (Property 11)
    - **Property 11: POST /file stores a complete FileRecord for any valid input**
    - Use Hypothesis to generate valid file payloads; assert response contains all required fields
    - Tag: `# Feature: file-system-disk-scheduler, Property 11: POST /file stores a complete FileRecord for any valid input`
    - **Validates: Requirements 5.3, 9.4**

  - [ ]\* 6.5 Write property test for lastHead after file addition (Property 12)
    - **Property 12: lastHead equals the added file's start byte after any file addition**
    - After `POST /file`, call `GET /user`; assert `lastHead == start`
    - Tag: `# Feature: file-system-disk-scheduler, Property 12: lastHead equals the added file's start byte after any file addition`
    - **Validates: Requirements 5.4, 8.2**

  - [ ]\* 6.6 Write property test for quota overflow rejection (Property 13)
    - **Property 13: Quota overflow is always rejected**
    - Fill storage to near-quota, then attempt to add a file that would exceed it; assert HTTP 400
    - Tag: `# Feature: file-system-disk-scheduler, Property 13: Quota overflow is always rejected`
    - **Validates: Requirements 5.6**

  - [ ]\* 6.7 Write property test for deleted file absent from GET /files (Property 14)
    - **Property 14: Deleted file is absent from subsequent GET /files responses**
    - Add a file, delete it, call `GET /files`; assert the record is not present
    - Tag: `# Feature: file-system-disk-scheduler, Property 14: Deleted file is absent from subsequent GET /files responses`
    - **Validates: Requirements 6.2, 9.5**

  - [ ]\* 6.8 Write property test for lastHead after file deletion (Property 15)
    - **Property 15: lastHead equals the deleted file's start byte after any file deletion**
    - After `DELETE /file`, call `GET /user`; assert `lastHead == deletedFile.start`
    - Tag: `# Feature: file-system-disk-scheduler, Property 15: lastHead equals the deleted file's start byte after any file deletion`
    - **Validates: Requirements 6.3, 8.3**

  - [ ]\* 6.9 Write property test for deleting a non-existent file (Property 16)
    - **Property 16: Deleting a non-existent file always returns an error**
    - Generate filenames not in the user's file list; assert HTTP 404
    - Tag: `# Feature: file-system-disk-scheduler, Property 16: Deleting a non-existent file always returns an error`
    - **Validates: Requirements 6.5**

  - [ ]\* 6.10 Write property test for GET /files user isolation (Property 23)
    - **Property 23: GET /files returns exactly the files belonging to the requesting user**
    - Create two users with different files; assert each user's `GET /files` returns only their own records
    - Tag: `# Feature: file-system-disk-scheduler, Property 23: GET /files returns exactly the files belonging to the requesting user`
    - **Validates: Requirements 9.3**

  - [ ]\* 6.11 Write unit tests for file router
    - `POST /file` with valid data returns 200 and FileRecord
    - `POST /file` exceeding quota returns 400
    - `GET /files` returns all user files
    - `DELETE /file` removes record and returns success
    - `DELETE /file` for non-existent file returns 404
    - Missing uid on any endpoint returns 401
    - _Requirements: 5.3–5.6, 6.2–6.5, 9.3–9.6_

- [x] 7. Checkpoint — backend complete
  - Wire all routers into `backend/main.py` with `app.include_router(...)`
  - Confirm all backend tests pass: `pytest backend/`
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement the byte allocation module (frontend)
  - [x] 8.1 Create `frontend/src/lib/allocate.ts`
    - Export `allocate(files: FileRecord[], newSize: number): { start: number; end: number } | null`
    - Sort by `start`, check gap before first file, iterate gaps between consecutive files, fall back to space after last file, return `null` if quota exceeded
    - Handle zero-byte files: `size = 0` → `start = afterLast`, `end = start - 1`
    - _Requirements: 5.1_

  - [ ]\* 8.2 Write property test for allocation non-overlap and earliest-gap (Property 10)
    - **Property 10: Byte allocation never overlaps and always uses the earliest gap**
    - Use fast-check `arbFileSet` and `arbSize` arbitraries; assert (a) no overlap with existing records, (b) `end - start + 1 == size`, (c) earliest valid gap is chosen
    - Tag: `// Feature: file-system-disk-scheduler, Property 10: Byte allocation never overlaps and always uses the earliest gap`
    - **Validates: Requirements 5.1**

  - [ ]\* 8.3 Write unit tests for `allocate`
    - Empty file list → `{ start: 0, end: size - 1 }`
    - Gap between two files is used when large enough
    - Falls back to space after last file when no gap fits
    - Returns `null` when quota would be exceeded
    - Zero-byte file allocation
    - _Requirements: 5.1_

- [x] 9. Implement the scheduler module (frontend)
  - [x] 9.1 Create `frontend/src/lib/scheduler.ts`
    - Export `runFCFS(positions: number[], initialHead: number): SchedulerResult`
      - Sort positions by `createdAt` order (caller passes positions already sorted by createdAt)
      - Compute `seekDistance` as sum of absolute differences
    - Export `runSSTF(positions: number[], initialHead: number): SchedulerResult`
      - At each step pick the unvisited position with minimum `|current - pos|`
    - Export `runSCAN(positions: number[], initialHead: number, maxByte: number): SchedulerResult`
      - Move ascending, service positions ≤ maxByte, reach boundary, reverse, service remaining positions
    - _Requirements: 7.6, 7.7, 7.8, 7.9_

  - [ ]\* 9.2 Write property test for FCFS sequence order (Property 17)
    - **Property 17: FCFS sequence matches createdAt order for any file set**
    - Use fast-check to generate arrays of positions; assert output sequence equals input order
    - Tag: `// Feature: file-system-disk-scheduler, Property 17: FCFS sequence matches createdAt order for any file set`
    - **Validates: Requirements 7.6**

  - [ ]\* 9.3 Write property test for SSTF nearest-unvisited selection (Property 18)
    - **Property 18: SSTF always selects the nearest unvisited position**
    - At each step verify the chosen position has minimum absolute distance from current head among remaining positions
    - Tag: `// Feature: file-system-disk-scheduler, Property 18: SSTF always selects the nearest unvisited position`
    - **Validates: Requirements 7.7**

  - [ ]\* 9.4 Write property test for SCAN directional sweep (Property 19)
    - **Property 19: SCAN visits all positions in a directional sweep**
    - Assert all positions are visited exactly once; assert ascending positions are visited before reversal
    - Tag: `// Feature: file-system-disk-scheduler, Property 19: SCAN visits all positions in a directional sweep`
    - **Validates: Requirements 7.8**

  - [ ]\* 9.5 Write property test for seek distance formula (Property 20)
    - **Property 20: Seek distance equals the sum of absolute differences in the sequence**
    - For any scheduler result, assert `seekDistance == Σ |sequence[i+1] - sequence[i]|`
    - Tag: `// Feature: file-system-disk-scheduler, Property 20: Seek distance equals the sum of absolute differences in the sequence`
    - **Validates: Requirements 7.9**

  - [ ]\* 9.6 Write unit tests for scheduler functions
    - FCFS with 3 files returns positions in input order
    - SSTF with known positions returns expected greedy sequence
    - SCAN with positions on both sides of head returns correct sweep
    - Single file selected: seek distance = `|lastHead - start|`
    - _Requirements: 7.6–7.9_

- [x] 10. Checkpoint — core logic complete
  - Run `npx vitest --run` and confirm all frontend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement the `AuthScreen` component
  - [x] 11.1 Create `frontend/src/components/AuthScreen.tsx`
    - Render email input, password input, Login button, Register button
    - On Login: call `POST /auth` with `action: "login"`; on success call `onAuthSuccess(uid, lastHead)`
    - On Register: call `POST /auth` with `action: "register"`; on success call `onAuthSuccess(uid, lastHead)`
    - Display dismissible error banner on API error
    - _Requirements: 1.6, 1.7, 10.1, 10.2_

  - [ ]\* 11.2 Write unit tests for `AuthScreen`
    - Renders all four elements (email, password, login button, register button)
    - Successful login calls `onAuthSuccess` with uid and lastHead
    - Failed login shows dismissible error message
    - _Requirements: 1.6, 1.7, 10.1, 10.2_

- [x] 12. Implement the `StorageDisplay` component
  - [x] 12.1 Create `frontend/src/components/StorageDisplay.tsx`
    - Accept `files: FileRecord[]` as prop
    - Render a full-width container div (grey background)
    - For each file render a red absolutely-positioned span: `left = (start / QUOTA) * 100%`, `width = (size / QUOTA) * 100%`
    - Display `"X MB / 100 MB"` numeric label (convert bytes to MB, 2 decimal places)
    - Show quota-full indicator when `sum(sizes) >= QUOTA`
    - _Requirements: 4.1–4.7_

  - [ ]\* 12.2 Write property test for storage bar coverage (Property 9)
    - **Property 9: Storage bar coverage is complete and numerically accurate**
    - Use fast-check `arbFileSet`; for each rendered file assert `left` and `width` match formula; assert numeric label matches `sum(sizes)` and `QUOTA`
    - Tag: `// Feature: file-system-disk-scheduler, Property 9: Storage bar coverage is complete and numerically accurate`
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]\* 12.3 Write unit tests for `StorageDisplay`
    - Adding a file updates the bar (new red segment appears)
    - Deleting a file removes the segment
    - Full quota shows quota-full indicator
    - _Requirements: 4.5, 4.6, 4.7_

- [x] 13. Implement the `FileTree` component
  - [x] 13.1 Create `frontend/src/components/FileTree.tsx`
    - Accept `files`, `currentPath`, `selectedFileIds`, `onAddFile`, `onDeleteFile`, `onSelectFile`, `onNavigate` as props
    - Filter files by `currentPath`; display filename and size for each
    - Show loading spinner while `isLoading` prop is true
    - Show empty-state message when filtered list is empty
    - "Add File" button: trigger hidden `<input type="file">` → extract `name`, `webkitRelativePath || name`, `size` → call `onAddFile(filename, path, size)`
    - "Delete File" button: prompt for filename → call `onDeleteFile(filename)`
    - Checkbox on each row for scheduling selection
    - _Requirements: 2.1–2.8_

  - [ ]\* 13.2 Write property test for FileTree rendering filename and size (Property 5)
    - **Property 5: File_Tree renders filename and size for any FileRecord**
    - Use fast-check `arbFileRecord`; render `FileTree` with that record; assert both `filename` and `size` appear in the DOM
    - Tag: `// Feature: file-system-disk-scheduler, Property 5: File_Tree renders filename and size for any FileRecord`
    - **Validates: Requirements 2.2**

  - [ ]\* 13.3 Write property test for file metadata capture completeness (Property 6)
    - **Property 6: File metadata capture is complete for any selected file**
    - Use fast-check to generate mock File objects; assert the capture function returns `filename`, `path`, and `size` without mutation
    - Tag: `// Feature: file-system-disk-scheduler, Property 6: File metadata capture is complete for any selected file`
    - **Validates: Requirements 2.5**

  - [ ]\* 13.4 Write unit tests for `FileTree`
    - Renders loading indicator while fetching
    - Renders empty-state message when list is empty
    - "Add File" triggers file picker
    - "Delete File" shows confirmation prompt
    - _Requirements: 2.3, 2.4, 2.7, 2.8_

- [x] 14. Implement the `CLIPanel` component
  - [x] 14.1 Create `frontend/src/lib/cliParser.ts`
    - Export `parseCommand(input: string): ParsedCommand | null`
    - Recognise `open <folder>`, `del <filename>`, `touch <filename> [size]`
    - Return `null` for unrecognised input
    - _Requirements: 3.1_

  - [x] 14.2 Create `frontend/src/components/CLIPanel.tsx`
    - Text input + submit button
    - Call `parseCommand`; dispatch to `onNavigate`, `onDeleteFile`, or `onAddFile` accordingly
    - Display success confirmation on completion
    - Display inline error listing valid commands for unrecognised input
    - Display file-not-found error when `onDeleteFile` rejects with 404
    - _Requirements: 3.1–3.7_

  - [ ]\* 14.3 Write property test for CLI parser recognising valid commands (Property 7)
    - **Property 7: CLI parser recognizes all valid commands for any valid input**
    - Use fast-check to generate strings starting with `open`, `del`, or `touch` followed by a valid argument; assert `parseCommand` returns a non-null result
    - Tag: `// Feature: file-system-disk-scheduler, Property 7: CLI parser recognizes all valid commands for any valid input`
    - **Validates: Requirements 3.1**

  - [ ]\* 14.4 Write property test for unrecognised CLI commands (Property 8)
    - **Property 8: Unrecognized CLI commands always produce an error listing valid commands**
    - Use fast-check to generate strings not starting with `open`, `del`, or `touch`; assert `parseCommand` returns `null` and the panel displays an error listing valid commands
    - Tag: `// Feature: file-system-disk-scheduler, Property 8: Unrecognized CLI commands always produce an error listing valid commands`
    - **Validates: Requirements 3.6**

  - [ ]\* 14.5 Write unit tests for `CLIPanel`
    - `open myfolder` triggers `onNavigate`
    - `del myfile.txt` triggers `onDeleteFile`
    - `touch newfile.txt` triggers `onAddFile` with size 0
    - Successful command shows confirmation
    - `del nonexistent.txt` shows file-not-found error
    - Unrecognised command shows error listing valid commands
    - _Requirements: 3.1–3.7_

- [x] 15. Implement the `DiskSchedulingPanel` component
  - [x] 15.1 Create `frontend/src/components/DiskSchedulingPanel.tsx`
    - Accept `selectedFiles`, `lastHead`, `onUpdateLastHead` as props
    - Algorithm selector: radio group or dropdown with FCFS, SSTF, SCAN
    - "Run Simulation" button: validate at least one file selected (show error if not); call the appropriate scheduler function with `selectedFiles.map(f => f.start)` sorted by `createdAt` for FCFS; display traversal sequence and total seek distance
    - After simulation: call `onUpdateLastHead(result.finalHead)` which triggers `GET /user?uid=...&set_head=<finalHead>` to persist
    - _Requirements: 7.1–7.11, 10.4_

  - [ ]\* 15.2 Write unit tests for `DiskSchedulingPanel`
    - Algorithm selector contains FCFS, SSTF, SCAN
    - Simulation with no files selected shows error message
    - Simulation result displays sequence and seek distance
    - _Requirements: 7.1, 7.2, 7.11, 10.4_

- [x] 16. Implement the `Dashboard` component and wire shared state
  - [x] 16.1 Create `frontend/src/components/Dashboard.tsx`
    - Hold shared state: `files`, `lastHead`, `uid`, `currentPath`, `selectedFileIds`, `isLoading`, `error`
    - On mount: call `GET /files?uid=<uid>` to populate `files`; call `GET /user?uid=<uid>` to confirm `lastHead`
    - `onAddFile(filename, path, size)`: call `allocate(files, size)` → if null show quota error; else call `POST /file` → on success update `files` and `lastHead`
    - `onDeleteFile(filename)`: call `DELETE /file?uid=<uid>&filename=<filename>` → on success update `files` and `lastHead`
    - `onUpdateLastHead(newHead)`: call `GET /user?uid=<uid>&set_head=<newHead>` → update `lastHead` in state
    - `onNavigate(folder)`: update `currentPath`
    - Render `FileTree`, `CLIPanel`, `StorageDisplay`, `DiskSchedulingPanel` in a four-panel layout
    - Global dismissible error banner for API errors
    - _Requirements: 1.7, 2.1, 4.5, 4.6, 5.2, 5.5, 6.1, 6.4, 7.10, 8.5, 10.1, 10.2_

  - [ ]\* 16.2 Write property test for lastHead after scheduling simulation (Property 21)
    - **Property 21: lastHead equals the final position after any scheduling simulation**
    - Use fast-check to generate file sets and initial head positions; run a scheduler; call `onUpdateLastHead`; assert `GET /user` returns the correct `lastHead`
    - Tag: `// Feature: file-system-disk-scheduler, Property 21: lastHead equals the final position after any scheduling simulation`
    - **Validates: Requirements 7.10, 8.4**

  - [ ]\* 16.3 Write property test for any backend error producing a frontend message (Property 25)
    - **Property 25: Any backend error response produces a human-readable frontend message**
    - Mock API responses with 4xx/5xx status codes; assert the error banner renders a non-empty string
    - Tag: `// Feature: file-system-disk-scheduler, Property 25: Any backend error response produces a human-readable frontend message`
    - **Validates: Requirements 10.1**

- [x] 17. Implement the top-level `App` component
  - [x] 17.1 Create `frontend/src/App.tsx`
    - Hold `authState: { uid: string; lastHead: number } | null`
    - Render `AuthScreen` when `authState` is null; render `Dashboard` with `uid` and initial `lastHead` when authenticated
    - Transition is in-place (no page reload) — update React state only
    - _Requirements: 1.6, 1.7_

- [x] 18. Checkpoint — full integration
  - Start the backend: `uvicorn backend.main:app --reload` (run manually)
  - Start the frontend: `npm run dev` inside `frontend/` (run manually)
  - Verify the following flows work end-to-end:
    - Register → login → dashboard loads with empty file list
    - Add file via file picker → storage bar updates → `lastHead` updates
    - Add file via `touch` CLI command → same result
    - Delete file via GUI → storage bar updates → `lastHead` updates
    - Delete file via `del` CLI command → same result
    - Select files → run FCFS/SSTF/SCAN → sequence and seek distance displayed → `lastHead` persisted
    - Reload page → `lastHead` restored from database
  - Run full test suites: `pytest backend/` and `npx vitest --run`
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints (tasks 7, 10, 18) ensure incremental validation at meaningful milestones
- Property tests validate universal correctness invariants; unit tests cover specific examples and edge cases
- The `lastHead` update after scheduling is persisted via `GET /user?set_head=<value>` — an intentional side-effectful GET documented in the design
- Zero-byte files (`touch <filename>`) are valid: `size = 0`, `end = start - 1`; the storage bar renders no visible segment for them
- The `allocate` function runs entirely on the frontend; the backend stores the `start`/`end` values it receives without recomputing
