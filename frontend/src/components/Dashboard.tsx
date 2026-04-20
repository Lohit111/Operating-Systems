import { useState, useEffect, useCallback } from "react";
import { FileRecord } from "../types";
import { allocate } from "../lib/allocate";
import { getFiles, getUser, createFile, deleteFile } from "../api";
import FileTree from "./FileTree";
import CLIPanel from "./CLIPanel";
import StorageDisplay from "./StorageDisplay";
import DiskSchedulingPanel from "./DiskSchedulingPanel";

interface Props {
  uid: string;
  email: string;
  initialLastHead: number;
}

export default function Dashboard({ uid, email, initialLastHead }: Props) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [lastHead, setLastHead] = useState(initialLastHead);
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load files on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [fetchedFiles, user] = await Promise.all([
          getFiles(uid),
          getUser(uid),
        ]);
        setFiles(fetchedFiles);
        setLastHead(user.lastHead);
      } catch (err: any) {
        setError(err?.response?.data?.detail || "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [uid]);

  const handleAddFile = useCallback(
    async (filename: string, path: string, size: number) => {
      setError(null);
      const allocation = allocate(files, size);
      if (!allocation) {
        setError("Storage quota exceeded. Delete some files to free space.");
        throw new Error("Storage quota exceeded");
      }
      try {
        const newFile = await createFile({
          uid,
          filename,
          path,
          size,
          start: allocation.start,
          end: allocation.end,
        });
        setFiles((prev) => [...prev, newFile]);
        setLastHead(allocation.start);
      } catch (err: any) {
        const msg = err?.response?.data?.detail || "Failed to add file";
        setError(msg);
        throw err;
      }
    },
    [files, uid],
  );

  const handleDeleteFile = useCallback(
    async (filename: string) => {
      setError(null);
      try {
        const res = await deleteFile(uid, filename);
        setFiles((prev) => prev.filter((f) => f.filename !== filename));
        setLastHead(res.deletedFile.start);
        setSelectedFileIds((prev) => {
          const next = new Set(prev);
          next.delete(res.deletedFile.id);
          return next;
        });
      } catch (err: any) {
        const msg = err?.response?.data?.detail || "Failed to delete file";
        setError(msg);
        throw err;
      }
    },
    [uid],
  );

  const handleUpdateLastHead = useCallback(
    async (newHead: number) => {
      try {
        await getUser(uid, newHead);
        setLastHead(newHead);
      } catch (err: any) {
        setError(
          err?.response?.data?.detail || "Failed to update head position",
        );
      }
    },
    [uid],
  );

  const handleSelectFile = useCallback((id: string, selected: boolean) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((folder: string) => {
    setCurrentPath(folder.startsWith("/") ? folder : `/${folder}`);
  }, []);

  const panelStyle = {
    background: "#161b22",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: 16,
    overflow: "hidden" as const,
    display: "flex",
    flexDirection: "column" as const,
  };

  const labelStyle = {
    fontSize: 11,
    fontWeight: 600,
    color: "#8b949e",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: 12,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d1117",
        color: "#c9d1d9",
        padding: 16,
        boxSizing: "border-box" as const,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, color: "#58a6ff" }}>
          📁 File System Simulator
        </h1>
        <span style={{ fontSize: 13, color: "#8b949e" }}>{email}</span>
      </div>

      {/* Global error banner */}
      {error && (
        <div
          style={{
            background: "#3d1a1a",
            border: "1px solid #f85149",
            borderRadius: 4,
            padding: "8px 12px",
            marginBottom: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#f85149", fontSize: 13 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#f85149",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* 4-panel grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 12,
        }}
      >
        {/* Section 1: File Tree */}
        <div style={{ ...panelStyle, minHeight: 300 }}>
          <div style={labelStyle}>File Explorer</div>
          <FileTree
            files={files}
            currentPath={currentPath}
            selectedFileIds={selectedFileIds}
            isLoading={isLoading}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            onSelectFile={handleSelectFile}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Section 2: CLI */}
        <div style={{ ...panelStyle, minHeight: 300 }}>
          <div style={labelStyle}>CLI Terminal</div>
          <CLIPanel
            onNavigate={handleNavigate}
            onDeleteFile={handleDeleteFile}
            onAddFile={handleAddFile}
          />
        </div>

        {/* Section 3: Storage */}
        <div style={panelStyle}>
          <div style={labelStyle}>Storage Map</div>
          <StorageDisplay files={files} />
        </div>

        {/* Section 4: Disk Scheduling */}
        <div style={panelStyle}>
          <div style={labelStyle}>Disk Scheduling</div>
          <DiskSchedulingPanel
            files={files}
            selectedFileIds={selectedFileIds}
            lastHead={lastHead}
            onUpdateLastHead={handleUpdateLastHead}
          />
        </div>
      </div>
    </div>
  );
}
