import { useState, useEffect, useRef, useCallback } from "react";
import { FileRecord, QUOTA, SchedulerResult } from "../types";
import { runFCFS, runSSTF, runSCAN } from "../lib/scheduler";

interface Props {
  files: FileRecord[];
  selectedFileIds: Set<string>;
  lastHead: number;
  onUpdateLastHead: (newHead: number) => Promise<void>;
}

type Algorithm = "FCFS" | "SSTF" | "SCAN";

const STEP_MS = 700; // ms per seek step

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1048576).toFixed(2)} MB`;
}

function formatBytesShort(b: number): string {
  if (b < 1024) return `${b}B`;
  if (b < 1048576) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1048576).toFixed(1)}MB`;
}

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

  // Animation state
  const [animStep, setAnimStep] = useState(-1); // which step we're on (-1 = not started)
  const [animating, setAnimating] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const stopRef = useRef(false);

  // The full sequence including initial head as step 0
  const fullSequence = result ? [lastHead, ...result.sequence] : [];

  // Current head position during animation
  const currentAnimHead =
    animStep >= 0 && fullSequence.length > 0
      ? fullSequence[Math.min(animStep, fullSequence.length - 1)]
      : lastHead;

  // Remaining requests (not yet visited)
  const visitedSet = new Set(
    animStep >= 0 ? fullSequence.slice(1, animStep + 1) : [],
  );
  const pendingRequests = result
    ? result.sequence.filter((_, i) => i >= animStep)
    : [];

  const selectedFiles = files.filter((f) => selectedFileIds.has(f.id));

  const handleRun = async () => {
    setError(null);
    if (selectedFiles.length === 0) {
      setError("Select at least one file to run the simulation.");
      return;
    }

    setRunning(true);
    stopRef.current = true; // stop any existing animation
    setAnimating(false);
    setPaused(false);
    pausedRef.current = false;

    try {
      const sortedByCreated = [...selectedFiles].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const positions = sortedByCreated.map((f) => f.start);

      let res: SchedulerResult;
      if (algorithm === "FCFS") res = runFCFS(positions, lastHead);
      else if (algorithm === "SSTF") res = runSSTF(positions, lastHead);
      else res = runSCAN(positions, lastHead, QUOTA - 1);

      setResult(res);
      setAnimStep(0);
    } finally {
      setRunning(false);
    }
  };

  // Start animation when result is set
  useEffect(() => {
    if (!result || animStep !== 0) return;
    startAnimation(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const startAnimation = useCallback(
    async (res: SchedulerResult) => {
      stopRef.current = false;
      pausedRef.current = false;
      setAnimating(true);
      setPaused(false);

      const total = res.sequence.length; // steps = number of requests
      for (let step = 1; step <= total; step++) {
        if (stopRef.current) break;

        // Wait while paused
        while (pausedRef.current) {
          await sleep(100);
          if (stopRef.current) break;
        }
        if (stopRef.current) break;

        setAnimStep(step);
        await sleep(STEP_MS);
      }

      if (!stopRef.current) {
        setAnimating(false);
        await onUpdateLastHead(res.finalHead);
      }
    },
    [onUpdateLastHead],
  );

  const handlePauseResume = () => {
    if (!animating) return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const handleReset = () => {
    stopRef.current = true;
    setAnimating(false);
    setPaused(false);
    pausedRef.current = false;
    setAnimStep(-1);
    setResult(null);
  };

  // Seek distance so far (up to current step)
  const seekSoFar = (() => {
    if (animStep <= 0 || !result) return 0;
    let dist = 0;
    const seq = [lastHead, ...result.sequence];
    for (let i = 1; i <= Math.min(animStep, seq.length - 1); i++) {
      dist += Math.abs(seq[i] - seq[i - 1]);
    }
    return dist;
  })();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Controls row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
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
                onChange={() => {
                  setAlgorithm(algo);
                  handleReset();
                }}
                disabled={animating}
              />
              {algo}
            </label>
          ))}
        </div>

        <button
          onClick={handleRun}
          disabled={running || animating}
          style={{
            padding: "5px 14px",
            background: running || animating ? "#21262d" : "#1f6feb",
            border: "none",
            borderRadius: 4,
            color: "#fff",
            cursor: running || animating ? "not-allowed" : "pointer",
            fontSize: 13,
          }}
        >
          {running ? "Computing..." : "▶ Run"}
        </button>

        {animating && (
          <button
            onClick={handlePauseResume}
            style={{
              padding: "5px 14px",
              background: "#e3b341",
              border: "none",
              borderRadius: 4,
              color: "#0d1117",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        )}

        {result && (
          <button
            onClick={handleReset}
            style={{
              padding: "5px 14px",
              background: "#21262d",
              border: "1px solid #30363d",
              borderRadius: 4,
              color: "#8b949e",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ✕ Reset
          </button>
        )}
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

      {/* Status bar */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
        <Stat
          label="Head Position"
          value={formatBytes(currentAnimHead)}
          color="#58a6ff"
        />
        <Stat
          label="Seek Distance"
          value={formatBytes(seekSoFar)}
          color="#3fb950"
        />
        {result && (
          <Stat
            label="Progress"
            value={
              animStep < 0
                ? "—"
                : `${Math.min(animStep, result.sequence.length)} / ${result.sequence.length}`
            }
            color="#e3b341"
          />
        )}
        {result && !animating && animStep > 0 && (
          <Stat
            label="Total Seek"
            value={formatBytes(result.seekDistance)}
            color="#f0883e"
          />
        )}
      </div>

      {/* Requests queue */}
      {result && (
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 6,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#8b949e",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 8,
            }}
          >
            Request Queue
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {result.sequence.map((pos, i) => {
              const visited = i < animStep;
              const current = i === animStep - 1;
              return (
                <span
                  key={i}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "monospace",
                    background: current
                      ? "#1f6feb"
                      : visited
                        ? "#21262d"
                        : "#0d1117",
                    color: current ? "#fff" : visited ? "#484f58" : "#c9d1d9",
                    border: `1px solid ${current ? "#58a6ff" : visited ? "#21262d" : "#30363d"}`,
                    textDecoration:
                      visited && !current ? "line-through" : "none",
                    transition: "all 0.3s",
                  }}
                >
                  {formatBytesShort(pos)}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Disk track visualizer */}
      {result && (
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 6,
            padding: "12px 14px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#8b949e",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 10,
            }}
          >
            Disk Track (0 → {formatBytesShort(QUOTA)})
          </div>

          {/* Track bar */}
          <div
            style={{
              position: "relative",
              height: 36,
              background: "#0d1117",
              borderRadius: 4,
              border: "1px solid #30363d",
              overflow: "visible",
              marginBottom: 8,
            }}
          >
            {/* Visited path segments */}
            {animStep > 0 &&
              (() => {
                const seq = [lastHead, ...result.sequence];
                const segments = [];
                for (let i = 0; i < Math.min(animStep, seq.length - 1); i++) {
                  const from = (seq[i] / QUOTA) * 100;
                  const to = (seq[i + 1] / QUOTA) * 100;
                  const left = Math.min(from, to);
                  const width = Math.abs(to - from);
                  segments.push(
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        top: "50%",
                        transform: "translateY(-50%)",
                        left: `${left}%`,
                        width: `${Math.max(width, 0.1)}%`,
                        height: 3,
                        background: "#3fb950",
                        opacity: 0.6,
                      }}
                    />,
                  );
                }
                return segments;
              })()}

            {/* Pending request markers */}
            {result.sequence.map((pos, i) => {
              const visited = i < animStep;
              return (
                <div
                  key={i}
                  title={`Request ${i + 1}: ${formatBytes(pos)}`}
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: `${(pos / QUOTA) * 100}%`,
                    width: 2,
                    background: visited ? "#484f58" : "#e3b341",
                    transition: "background 0.3s",
                  }}
                />
              );
            })}

            {/* Animated disk head */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${(currentAnimHead / QUOTA) * 100}%`,
                transform: "translate(-50%, -50%)",
                width: 14,
                height: 14,
                borderRadius: "50%",
                background: "#58a6ff",
                border: "2px solid #0d1117",
                boxShadow: "0 0 8px #58a6ff",
                transition: `left ${STEP_MS * 0.85}ms ease-in-out`,
                zIndex: 2,
              }}
            />
          </div>

          {/* Scale labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: "#484f58",
            }}
          >
            <span>0</span>
            <span>{formatBytesShort(QUOTA / 4)}</span>
            <span>{formatBytesShort(QUOTA / 2)}</span>
            <span>{formatBytesShort((QUOTA * 3) / 4)}</span>
            <span>{formatBytesShort(QUOTA)}</span>
          </div>

          {/* Step-by-step sequence log */}
          {animStep > 0 && (
            <div
              style={{
                marginTop: 10,
                fontFamily: "monospace",
                fontSize: 12,
                color: "#8b949e",
                lineHeight: 1.8,
              }}
            >
              {Array.from(
                { length: Math.min(animStep, result.sequence.length) },
                (_, i) => {
                  const from = i === 0 ? lastHead : result.sequence[i - 1];
                  const to = result.sequence[i];
                  const dist = Math.abs(to - from);
                  return (
                    <div
                      key={i}
                      style={{
                        color: i === animStep - 1 ? "#c9d1d9" : "#484f58",
                        transition: "color 0.3s",
                      }}
                    >
                      <span style={{ color: "#58a6ff" }}>Step {i + 1}</span>{" "}
                      {formatBytesShort(from)}
                      <span style={{ color: "#3fb950" }}> → </span>
                      {formatBytesShort(to)}
                      <span style={{ color: "#8b949e" }}>
                        {" "}
                        ({formatBytesShort(dist)})
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontSize: 10,
          color: "#8b949e",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color,
          fontFamily: "monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
