import { useState, useRef, useEffect } from "react";
import { parseCommand } from "../lib/cliParser";

interface Props {
  onNavigate: (folder: string) => void;
  onDeleteFile: (filename: string) => Promise<void>;
  onAddFile: (filename: string, path: string, size: number) => Promise<void>;
}

interface LogEntry {
  id: number;
  text: string;
  type: "input" | "success" | "error" | "info";
}

export default function CLIPanel({
  onNavigate,
  onDeleteFile,
  onAddFile,
}: Props) {
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogEntry[]>([
    { id: 0, text: 'File System CLI — type "help" for commands', type: "info" },
  ]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(1);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const addLog = (text: string, type: LogEntry["type"]) => {
    setLog((prev) => [...prev, { id: idRef.current++, text, type }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    addLog(`> ${trimmed}`, "input");
    setInput("");

    if (trimmed === "help") {
      addLog(
        "Commands: open <folder> | del <filename> | touch <filename> [size]",
        "info",
      );
      return;
    }

    const cmd = parseCommand(trimmed);
    if (!cmd) {
      addLog(
        "Unknown command. Valid commands: open <folder>, del <filename>, touch <filename> [size]",
        "error",
      );
      return;
    }

    try {
      if (cmd.type === "open") {
        onNavigate(cmd.folder);
        addLog(`Navigated to ${cmd.folder}`, "success");
      } else if (cmd.type === "del") {
        await onDeleteFile(cmd.filename);
        addLog(`Deleted ${cmd.filename}`, "success");
      } else if (cmd.type === "touch") {
        await onAddFile(cmd.filename, cmd.filename, cmd.size);
        addLog(`Created ${cmd.filename} (${cmd.size} bytes)`, "success");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail || err?.message || "Operation failed";
      addLog(`Error: ${msg}`, "error");
    }
  };

  const colorMap: Record<LogEntry["type"], string> = {
    input: "#58a6ff",
    success: "#3fb950",
    error: "#f85149",
    info: "#8b949e",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{ flex: 1, overflowY: "auto", padding: "8px 0", minHeight: 0 }}
      >
        {log.map((entry) => (
          <div
            key={entry.id}
            style={{
              fontSize: 12,
              color: colorMap[entry.type],
              padding: "1px 0",
              whiteSpace: "pre-wrap",
            }}
          >
            {entry.text}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: 6,
          borderTop: "1px solid #30363d",
          paddingTop: 8,
        }}
      >
        <span style={{ color: "#3fb950", fontSize: 12, lineHeight: "28px" }}>
          $
        </span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="open <folder> | del <file> | touch <file>"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#c9d1d9",
            fontSize: 12,
            fontFamily: "monospace",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "4px 10px",
            background: "#21262d",
            border: "1px solid #30363d",
            borderRadius: 4,
            color: "#c9d1d9",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Run
        </button>
      </form>
    </div>
  );
}
