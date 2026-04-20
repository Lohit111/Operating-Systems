import { useRef } from "react";
import { FileRecord } from "../types";

interface Props {
  files: FileRecord[];
  folders: Set<string>;
  currentPath: string;
  selectedFileIds: Set<string>;
  isLoading: boolean;
  onAddFile: (filename: string, path: string, size: number) => void;
  onDeleteFile: (filename: string) => void;
  onSelectFile: (id: string, selected: boolean) => void;
  onNavigate: (path: string) => void;
  onMkdir: (folder: string) => void;
}

export default function FileTree({
  files,
  folders,
  currentPath,
  selectedFileIds,
  isLoading,
  onAddFile,
  onDeleteFile,
  onSelectFile,
  onNavigate,
  onMkdir,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Normalise path: always starts with /, no trailing slash
  const normPath = currentPath === "/" ? "/" : currentPath.replace(/\/$/, "");

  // Files whose path matches the current directory
  const visibleFiles = files.filter((f) => {
    const filedir = f.path.includes("/")
      ? "/" + f.path.split("/").slice(0, -1).join("/").replace(/^\//, "")
      : "/";
    const normalised = filedir === "" ? "/" : filedir;
    return normalised === normPath;
  });

  // Sub-folders that are direct children of currentPath
  const childFolders = Array.from(folders).filter((folder) => {
    // folder is stored as absolute path e.g. "/docs" or "/docs/sub"
    const parent = folder.substring(0, folder.lastIndexOf("/")) || "/";
    return parent === normPath;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Store path as currentPath/filename
    const filePath =
      normPath === "/" ? file.name : `${normPath.slice(1)}/${file.name}`;
    onAddFile(file.name, filePath, file.size);
    e.target.value = "";
  };

  const handleDelete = () => {
    const filename = window.prompt("Enter filename to delete:");
    if (filename?.trim()) onDeleteFile(filename.trim());
  };

  const handleNewFolder = () => {
    const name = window.prompt("Enter folder name:");
    if (!name?.trim()) return;
    const folderPath =
      normPath === "/" ? `/${name.trim()}` : `${normPath}/${name.trim()}`;
    onMkdir(folderPath);
  };

  const handleGoUp = () => {
    if (normPath === "/") return;
    const parent = normPath.substring(0, normPath.lastIndexOf("/")) || "/";
    onNavigate(parent);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: "#8b949e",
            fontFamily: "monospace",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          📂 {normPath}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "4px 8px",
              background: "#238636",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            + File
          </button>
          <button
            onClick={handleNewFolder}
            style={{
              padding: "4px 8px",
              background: "#1f6feb",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            + Folder
          </button>
          <button
            onClick={handleDelete}
            style={{
              padding: "4px 8px",
              background: "#da3633",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 11,
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
                />
                <th style={{ textAlign: "left", padding: "4px 8px" }}>Name</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>Size</th>
                <th style={{ textAlign: "right", padding: "4px 8px" }}>
                  Start
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Back row */}
              {normPath !== "/" && (
                <tr
                  style={{
                    borderBottom: "1px solid #21262d",
                    cursor: "pointer",
                  }}
                  onClick={handleGoUp}
                >
                  <td style={{ padding: "4px 8px" }} />
                  <td style={{ padding: "4px 8px", color: "#8b949e" }}>⬆ ..</td>
                  <td />
                  <td />
                </tr>
              )}

              {/* Child folders */}
              {childFolders.map((folder) => {
                const name = folder.split("/").pop()!;
                return (
                  <tr
                    key={folder}
                    style={{
                      borderBottom: "1px solid #21262d",
                      cursor: "pointer",
                      color: "#c9d1d9",
                    }}
                    onClick={() => onNavigate(folder)}
                  >
                    <td style={{ padding: "4px 8px" }} />
                    <td style={{ padding: "4px 8px", color: "#e3b341" }}>
                      📁 {name}
                    </td>
                    <td />
                    <td />
                  </tr>
                );
              })}

              {/* Files */}
              {visibleFiles.length === 0 &&
                childFolders.length === 0 &&
                normPath === "/" && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: "12px 8px",
                        color: "#8b949e",
                        fontSize: 13,
                      }}
                    >
                      No files in this directory.
                    </td>
                  </tr>
                )}
              {visibleFiles.map((file) => (
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
