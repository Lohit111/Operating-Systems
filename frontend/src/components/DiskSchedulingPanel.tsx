import { useState } from "react";
import { FileRecord, QUOTA, SchedulerResult } from "../types";
import { runFCFS, runSSTF, runSCAN } from "../lib/scheduler";

interface Props {
  files: FileRecord[];
  selectedFileIds: Set<string>;
  lastHead: number;
  onUpdateLastHead: (newHead: number) => Promise<void>;
}

type Algorithm = "FCFS" | "SSTF" | "SCAN";

export default function DiskSchedulingPanel({
  files,
  selectedFileIds,
  lastHead,
  onUpdateLastHead,
}: Props) {
  const [algorithm, setAlgorithm] = useState<Algorithm>("FCFS");
  const [result, setResult] = useState<SchedulerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const selectedFiles = files.filter((f) => selectedFileIds.has(f.id));

  const handleRun = async () => {
    setError(null);
    if (selectedFiles.length === 0) {
      setError("Select at least one file to run the simulation.");
      return;
    }

    setRunning(true);
    try {
      // Sort by createdAt for FCFS
      const sortedByCreated = [...selectedFiles].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const positions = sortedByCreated.map((f) => f.start);

      let res: SchedulerResult;
      if (algorithm === "FCFS") {
        res = runFCFS(positions, lastHead);
      } else if (algorithm === "SSTF") {
        res = runSSTF(positions, lastHead);
      } else {
        res = runSCAN(positions, lastHead, QUOTA - 1);
      }

      setResult(res);
      await onUpdateLastHead(res.finalHead);
    } finally {
      setRunning(false);
    }
  };

  const formatBytes = (b: number) =>
    b < 1024
      ? `${b}B`
      : b < 1048576
        ? `${(b / 1024).toFixed(1)}KB`
        : `${(b / 1048576).toFixed(2)}MB`;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 13, color: "#8b949e" }}>
          Head:{" "}
          <strong style={{ color: "#58a6ff" }}>{formatBytes(lastHead)}</strong>
        </span>
        <span style={{ fontSize: 13, color: "#8b949e" }}>
          Selected:{" "}
          <strong style={{ color: "#c9d1d9" }}>{selectedFiles.length}</strong>{" "}
          file(s)
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {(["FCFS", "SSTF", "SCAN"] as Algorithm[]).map((algo) => (
            <label
              key={algo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                cursor: "pointer",
                fontSize: 13,
                color: algorithm === algo ? "#58a6ff" : "#8b949e",
              }}
            >
              <input
                type="radio"
                name="algorithm"
                value={algo}
                checked={algorithm === algo}
                onChange={() => setAlgorithm(algo)}
              />
              {algo}
            </label>
          ))}
        </div>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: "6px 16px",
            background: "#1f6feb",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {running ? "Running..." : "▶ Run Simulation"}
        </button>
      </div>

      {error && (
        <div
          style={{
            background: "#3d1a1a",
            border: "1px solid #f85149",
            borderRadius: 4,
            padding: "8px 12px",
            color: "#f85149",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 6,
            padding: 16,
          }}
        >
          <div style={{ marginBottom: 8, fontSize: 13, color: "#8b949e" }}>
            Algorithm: <strong style={{ color: "#58a6ff" }}>{algorithm}</strong>{" "}
            &nbsp;|&nbsp; Total Seek Distance:{" "}
            <strong style={{ color: "#3fb950" }}>
              {formatBytes(result.seekDistance)}
            </strong>
          </div>
          <div
            style={{ fontSize: 12, color: "#c9d1d9", fontFamily: "monospace" }}
          >
            {formatBytes(lastHead)} →{" "}
            {result.sequence.map(formatBytes).join(" → ")}
          </div>
          <div
            style={{
              marginTop: 12,
              position: "relative",
              height: 20,
              background: "#21262d",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            {result.sequence.map((pos, i) => (
              <div
                key={i}
                title={`Step ${i + 1}: ${formatBytes(pos)}`}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${(pos / QUOTA) * 100}%`,
                  width: 2,
                  background:
                    i === result.sequence.length - 1 ? "#58a6ff" : "#3fb950",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
