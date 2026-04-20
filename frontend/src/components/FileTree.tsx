import { useRef } from "react";
import { FileRecord } from "../types";

interface Props {
  files: FileRecord[];
  currentPath: string;
  selectedFileIds: Set<string>;
  isLoading: boolean;
  onAddFile: (filename: string, path: string, size: number) => void;
  onDeleteFile: (filename: string) => void;
  onSelectFile: (id: string, selected: boolean) => void;
  onNavigate: (folder: string) => void;
}

export default function FileTree({
  files,
  currentPath,
  selectedFileIds,
  isLoading,
  onAddFile,
  onDeleteFile,
  onSelectFile,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = (file as any).webkitRelativePath || file.name;
    onAddFile(file.name, path, file.size);
    e.target.value = "";
  };

  const handleDelete = () => {
    const filename = window.prompt("Enter filename to delete:");
    if (filename?.trim()) onDeleteFile(filename.trim());
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 13, color: "#8b949e" }}>
          📂 {currentPath || "/"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "4px 10px",
              background: "#238636",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            + Add File
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: "4px 10px",
              background: "#da3633",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Delete
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {isLoading ? (
        <div style={{ color: "#8b949e", fontSize: 13 }}>Loading...</div>
      ) : files.length === 0 ? (
        <div style={{ color: "#8b949e", fontSize: 13 }}>
          No files in this directory.
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr
                style={{ color: "#8b949e", borderBottom: "1px solid #30363d" }}
              >
                <th
                  style={{ textAlign: "left", padding: "4px 8px", width: 24 }}
                ></th>
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Name</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>Size</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>
                  Start
                </th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.id}
                  style={{
                    borderBottom: "1px solid #21262d",
                    color: "#c9d1d9",
                  }}
                >
                  <td style={{ padding: "4px 8px" }}>
                    <input
                      type="checkbox"
                      checked={selectedFileIds.has(file.id)}
                      onChange={(e) => onSelectFile(file.id, e.target.checked)}
                    />
                  </td>
                  <td style={{ padding: "4px 8px" }}>📄 {file.filename}</td>
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "right",
                      color: "#8b949e",
                    }}
                  >
                    {file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1048576
                        ? `${(file.size / 1024).toFixed(1)} KB`
                        : `${(file.size / 1048576).toFixed(2)} MB`}
                  </td>
                  <td
                    style={{
                      padding: "4px 8px",
                      textAlign: "right",
                      color: "#8b949e",
                    }}
                  >
                    {file.start}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
