import { FileRecord, QUOTA } from "../types";

interface Props {
  files: FileRecord[];
}

function bytesToMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

export default function StorageDisplay({ files }: Props) {
  const usedBytes = files.reduce((sum, f) => sum + f.size, 0);
  const isFull = usedBytes >= QUOTA;

  return (
    <div style={{ padding: "16px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          fontSize: 13,
          color: "#8b949e",
        }}
      >
        <span>Storage</span>
        <span style={{ color: isFull ? "#f85149" : "#c9d1d9" }}>
          {bytesToMB(usedBytes)} MB / {bytesToMB(QUOTA)} MB
          {isFull && " — FULL"}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 28,
          background: "#21262d",
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid #30363d",
        }}
      >
        {files.map((file) => (
          <div
            key={file.id}
            title={`${file.filename}: ${bytesToMB(file.size)} MB (bytes ${file.start}–${file.end})`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${(file.start / QUOTA) * 100}%`,
              width: `${Math.max((file.size / QUOTA) * 100, 0.2)}%`,
              background: "#f85149",
              borderRight: "1px solid #0d1117",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
        {files.map((file) => (
          <span
            key={file.id}
            style={{
              fontSize: 11,
              color: "#8b949e",
              background: "#21262d",
              padding: "2px 6px",
              borderRadius: 3,
            }}
          >
            {file.filename}: {bytesToMB(file.size)}MB
          </span>
        ))}
      </div>
    </div>
  );
}
