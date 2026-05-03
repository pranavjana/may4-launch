import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { useMemo } from "react";

const colors = {
  bg: "#101312",
  bg2: "#171D1B",
  panel: "#151A18",
  panel2: "#1B2220",
  line: "rgba(231, 238, 226, 0.16)",
  text: "#F4F0E8",
  muted: "#9AA39C",
  faint: "#59625D",
  orange: "#E8713A",
  orange2: "#FF9E6E",
  green: "#88D8B0",
  blue: "#5E9CFF",
  terminal: "#111111",
};

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const fit = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], clamp);

const typeText = (text: string, frame: number, start: number, duration: number) => {
  const chars = Math.floor(interpolate(frame, [start, start + duration], [0, text.length], clamp));
  return text.slice(0, Math.max(0, chars));
};

const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.1 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity,
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.72' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
      mixBlendMode: "soft-light",
    }}
  />
);

const Background: React.FC<{ pulse?: number; dotColor?: string }> = ({ pulse = 0, dotColor = colors.orange }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bg,
        overflow: "hidden",
      }}
    >
      <HalftoneDots
        opacity={0.56 + pulse * 0.35}
        transform="translate(0px, 0px)"
        frame={frame}
        color={dotColor}
      />
      <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 1px rgba(244,240,232,.025)" }} />
    </AbsoluteFill>
  );
};

const hash = (x: number, y: number) => {
  const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const band = (value: number, center: number, halfWidth: number, feather: number) =>
  1 - smooth(halfWidth, halfWidth + feather, Math.abs(value - center));

const HalftoneDots: React.FC<{ opacity: number; transform: string; frame: number; color: string }> = ({
  opacity,
  transform,
  frame,
  color,
}) => {
  const dots = useMemo(() => {
    const items: Array<{ x: number; y: number; a: number; phase: number; speed: number }> = [];
    const step = 13;
    const width = 2200;
    const height = 1320;
    for (let y = -120; y < height; y += step) {
      for (let x = -160; x < width; x += step) {
        const nx = x / width;
        const ny = y / height;
        const diag = nx - ny;
        const diag2 = nx + ny;

        let density = 0.006;
        density += 0.55 * band(diag, -0.38, 0.085, 0.04);
        density += 0.46 * band(diag, 0.2, 0.046, 0.045);
        density += 0.42 * band(diag2, 0.34, 0.055, 0.04);
        density += 0.36 * band(diag2, 1.18, 0.07, 0.05);
        density += 0.26 * band(ny + Math.sin(nx * 9) * 0.035, 0.075, 0.026, 0.026);
        density += 0.22 * band(ny + Math.sin(nx * 7) * 0.025, 0.86, 0.03, 0.035);

        const carveA = band(diag, -0.04, 0.035, 0.035);
        const carveB = band(diag2, 0.72, 0.045, 0.04);
        density *= 1 - Math.max(carveA * 0.92, carveB * 0.84);

        const dither = hash(Math.floor(x / step), Math.floor(y / step));
        if (density > dither) {
          items.push({
            x,
            y,
            a: Math.max(0.22, Math.min(0.74, density * 0.72 + 0.12)),
            phase: hash(Math.floor(x / step) + 19, Math.floor(y / step) - 11) * Math.PI * 2,
            speed: 0.42 + hash(Math.floor(x / step) - 7, Math.floor(y / step) + 23) * 0.48,
          });
        }
      }
    }
    return items;
  }, []);

  return (
    <svg
      viewBox="0 0 1080 1350"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: "-5% -5%",
        width: "110%",
        height: "110%",
        opacity,
        transform,
      }}
    >
      <g fill={color}>
        {dots.map((dot, index) => {
          const wave = (Math.sin(frame * dot.speed + dot.phase) + 1) / 2;
          const slowWave = (Math.sin(frame * dot.speed * 0.9 + dot.phase * 1.7) + 1) / 2;
          const blinkGate = hash(index, Math.floor(frame / 2));
          const blink = blinkGate > 0.88 ? 0.18 : 1;
          const animatedOpacity = dot.a * (0.34 + wave * 0.48 + slowWave * 0.18) * blink;
          return (
            <rect
              key={index}
              x={dot.x}
              y={dot.y}
              width={3}
              height={3}
              opacity={Math.max(0.18, Math.min(1, animatedOpacity))}
            />
          );
        })}
      </g>
    </svg>
  );
};

const LogoBug = ({ small = false }: { small?: boolean }) => (
  <div style={{ position: "absolute", top: 46, left: 58, display: "flex", alignItems: "center", gap: 16 }}>
    <Img src={staticFile("fish.svg")} style={{ width: small ? 34 : 42, height: small ? 34 : 42 }} />
    <span
      style={{
        color: colors.text,
        fontFamily: "Host Grotesk",
        fontSize: small ? 20 : 24,
        fontWeight: 750,
        letterSpacing: 0,
      }}
    >
      tinyfish
    </span>
  </div>
);

const TerminalFrame: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  scale?: number;
}> = ({ title, subtitle, children, width = 1500, height = 760, scale = 1 }) => (
  <div
    style={{
      width,
      height,
      transform: `scale(${scale})`,
      border: `1px solid ${colors.line}`,
      borderRadius: 14,
      overflow: "hidden",
      background: colors.terminal,
      boxShadow: "0 36px 90px rgba(0,0,0,.5), 0 0 0 1px rgba(232,113,58,.08)",
      fontFamily: "SF Mono, Menlo, ui-monospace, monospace",
    }}
  >
    <div
      style={{
        height: 48,
        borderBottom: `1px solid ${colors.line}`,
        background: "#191919",
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 12,
      }}
    >
      <span style={{ width: 12, height: 12, borderRadius: 999, background: "#F05D55" }} />
      <span style={{ width: 12, height: 12, borderRadius: 999, background: "#F5BD4F" }} />
      <span style={{ width: 12, height: 12, borderRadius: 999, background: "#57C35F" }} />
      <span style={{ marginLeft: 18, color: colors.text, fontSize: 18, fontWeight: 700 }}>{title}</span>
      {subtitle ? <span style={{ color: colors.faint, fontSize: 15 }}>{subtitle}</span> : null}
    </div>
    {children}
  </div>
);

const ToolBlock: React.FC<{
  name: string;
  rows: string[];
  progress: number;
  accent?: string;
}> = ({ name, rows, progress, accent = colors.orange }) => {
  const frame = useCurrentFrame();
  const visible = Math.floor(progress * rows.length);
  const isSearch = name.includes("search");
  const shimmerX = interpolate((frame % 54) / 54, [0, 1], [-140, 220], clamp);
  const command = name.includes("search")
    ? `tinyfish.search("${rows[0]?.replace('query: "', "").replace('"', "") || "..."}")`
    : `tinyfish.fetch("${rows[0]?.replace('url: "', "").replace('"', "") || "..."}")`;
  const outputRows = rows.slice(2, visible);
  return (
    <div
      style={{
        position: "relative",
        margin: "18px 0 22px",
        paddingLeft: 28,
        color: colors.text,
        fontSize: 20,
        lineHeight: 1.42,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 8,
          width: 12,
          height: 12,
          borderRadius: 999,
          background: isSearch ? colors.orange : "#4CC36F",
          boxShadow: isSearch ? "0 0 14px rgba(232,113,58,.42)" : "0 0 14px rgba(76,195,111,.35)",
        }}
      />
      <div style={{ whiteSpace: "pre-wrap" }}>
        <span
          style={{
            display: "inline-block",
            color: isSearch ? colors.orange : colors.green,
            fontWeight: 900,
            backgroundImage: `linear-gradient(100deg, ${isSearch ? colors.orange : colors.green} 0%, ${isSearch ? colors.orange : colors.green} 38%, #fff6dd 48%, ${colors.orange2} 56%, ${isSearch ? colors.orange : colors.green} 68%, ${isSearch ? colors.orange : colors.green} 100%)`,
            backgroundSize: "220% 100%",
            backgroundPosition: `${shimmerX}% 0`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 14px rgba(232,113,58,.18)",
          }}
        >
          {name}
        </span>
        <span style={{ color: colors.muted }}>(</span>
        <span style={{ color: colors.text }}>{command.replace(`${name}(`, "").replace(/\)$/, "")}</span>
        <span style={{ color: colors.muted }}>)</span>
      </div>
      <div style={{ marginTop: 6, color: colors.muted }}>
        <span style={{ color: "#7C8580" }}>⎿ </span>
        <span style={{ color: colors.faint }}>{visible < rows.length ? "running..." : "done"}</span>
      </div>
      <div style={{ marginTop: 4 }}>
        {outputRows.map((row, index) => (
          <div key={`${row}-${index}`} style={{ whiteSpace: "pre", color: row.includes("✓") ? colors.green : colors.text }}>
            <span style={{ color: "#7C8580" }}>{index === 0 ? "⎿ " : "  "}</span>
            {row || " "}
          </div>
        ))}
        {visible >= rows.length ? (
          <div style={{ color: colors.faint, marginTop: 4 }}>  ... +{name.includes("search") ? "7 results" : "3 lines"} (ctrl+o to expand)</div>
        ) : null}
      </div>
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const first = spring({ fps, frame: frame - 3, config: { damping: 16, stiffness: 120 } });
  const free = spring({ fps, frame: frame - 18, config: { damping: 16, stiffness: 120 } });
  const speed = spring({ fps, frame: frame - 33, config: { damping: 16, stiffness: 120 } });
  const second = fit(frame, 50, 66);
  const headlineBlur = interpolate(frame, [3, 18], [18, 0], clamp);
  const freeBlur = interpolate(frame, [18, 33], [18, 0], clamp);
  const speedBlur = interpolate(frame, [33, 48], [18, 0], clamp);
  const secondBlur = interpolate(frame, [50, 66], [12, 0], clamp);
  const exit = 1;
  return (
    <AbsoluteFill style={{ opacity: exit, fontFamily: "Host Grotesk, General Sans, sans-serif" }}>
      <Background pulse={0.04} dotColor={colors.orange} />
      <LogoBug />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 44px",
        }}
      >
        <div
          style={{
            color: colors.text,
            fontSize: 54,
            lineHeight: 0.98,
            fontWeight: 800,
            letterSpacing: 0,
          }}
        >
          <div style={{ whiteSpace: "nowrap" }}>
            <span
              style={{
                display: "inline-block",
                transform: `translateY(${(1 - first) * 42}px)`,
                opacity: Math.min(1, first),
                filter: `blur(${headlineBlur}px)`,
              }}
            >
              Search & Fetch.
            </span>{" "}
            <span
              style={{
                display: "inline-block",
                color: colors.orange,
                position: "relative",
                transform: `translateY(${(1 - free) * 34}px)`,
                opacity: Math.min(1, free),
                filter: `blur(${freeBlur}px)`,
              }}
            >
              Free.
              <span
                style={{
                  position: "absolute",
                  left: 4,
                  right: 6,
                  bottom: -8,
                  height: 6,
                  background: colors.orange,
                  transformOrigin: "left center",
                  transform: `scaleX(${fit(frame, 28, 33)})`,
                  borderRadius: 99,
                }}
              />
            </span>
            <span> </span>
            <span
            style={{
              display: "inline-block",
              transform: `translateY(${(1 - speed) * 28}px)`,
              opacity: Math.min(1, speed),
              filter: `blur(${speedBlur}px)`,
            }}
          >
            At Light Speed.
            </span>
          </div>
        </div>
        <div
          style={{
            marginTop: 32,
            color: colors.muted,
            fontSize: 42,
            fontWeight: 420,
            opacity: second,
            transform: `translateY(${(1 - second) * 20}px)`,
            filter: `blur(${secondBlur}px)`,
          }}
        >
          For every agent. Across the galaxy.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 86,
          bottom: 72,
          color: colors.faint,
          fontFamily: "SF Mono, Menlo, monospace",
          fontSize: 20,
        }}
      >
        May 4, 2026
      </div>
    </AbsoluteFill>
  );
};

const ClaudeScene = () => {
  const frame = useCurrentFrame();
  const prompt =
    "> help me research the web search API market -- who are the main players, what do they charge, and where are the gaps?";
  const response =
    "Based on my research, here's the competitive landscape:\n\n**Pricing ranges:**\n- Exa: ~$5/1K queries after free credits\n- Tavily: ~$5-8/1K credits, 1K/mo free\n- Firecrawl: ~$1.66/1K searches, 500 free credits\n- Brave: $5/1K queries, removed free tier\n- SerpAPI: $10/1K queries...";
  const entrance = 1;
  const exit = 1;
  const typed = typeText(prompt, frame, 8, 42);
  const responseText = typeText(response, frame, 106, 54);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
      <Background />
      <div
        style={{
          transform: "translateY(0px) scale(1)",
          opacity: entrance,
        }}
      >
        <TerminalFrame title="Claude Code" subtitle="research-agent ~/launch" width={1000} height={1060}>
          <div style={{ padding: "28px 28px 180px", color: colors.text }}>
            <div style={{ color: colors.muted, fontSize: 23, lineHeight: 1.45, minHeight: 64 }}>
              {typed}
              <span style={{ color: colors.orange }}>{frame % 20 < 10 ? "▊" : ""}</span>
            </div>
            {frame > 46 ? (
              <ToolBlock
                name="tinyfish.search"
                progress={fit(frame, 48, 74)}
                rows={[
                  'query: "web search API market landscape 2026"',
                  "",
                  '  1. "The State of Web Search APIs in 2026" -- techcrunch.com',
                  '  2. "Comparing Exa, Tavily, Firecrawl, Brave..." -- dev.to',
                  '  3. "Why Search APIs Are the New Infrastructure" -- a16z.com',
                  "  ✓ 10 results · 0.5s",
                ]}
              />
            ) : null}
            {frame > 76 ? (
              <ToolBlock
                name="tinyfish.fetch"
                progress={fit(frame, 78, 104)}
                accent={colors.green}
                rows={[
                  'url: "https://firecrawl.dev/pricing"',
                  "",
                  "  # Firecrawl Pricing",
                  "  - Hobby: $16/mo -- 500 credits/mo",
                  "  - Standard: $83/mo -- 5,000 credits/mo",
                  "  - Growth: $333/mo -- 50,000 credits/mo",
                  "  ✓ rendered · markdown · 1.2s",
                ]}
              />
            ) : null}
            <TerminalMarkdown text={responseText} />
          </div>
        </TerminalFrame>
      </div>
    </AbsoluteFill>
  );
};

const TerminalMarkdown = ({ text }: { text: string }) => (
  <div
    style={{
      margin: "18px 0 0",
      color: colors.text,
      fontSize: 23,
      lineHeight: 1.42,
      whiteSpace: "pre-wrap",
      fontFamily: "SF Mono, Menlo, ui-monospace, monospace",
    }}
  >
    {text.split("\n").map((line, index) => {
      const bold = line.includes("**");
      const clean = line.replace(/\*\*/g, "");
      return (
        <div key={`${line}-${index}`} style={{ minHeight: 28, fontWeight: bold ? 800 : 500 }}>
          {clean || " "}
        </div>
      );
    })}
  </div>
);

const HermesScene = () => {
  const frame = useCurrentFrame();
  const prompt = "find me real playbooks on building a developer community from zero -- not the fluffy stuff";
  const typed = typeText(prompt, frame, 8, 38);
  const synthesis = typeText(
    "hermes ▸ Based on 3 sources, here are the real patterns:\n\n  1. Docs-first, not Discord-first (PostHog, Supabase)\n  2. GitHub Issues as community signal\n  3. Ship examples before launching spaces",
    frame,
    104,
    42
  );
  const entrance = 1;
  const exit = 1;
  const seconds = (frame / 30).toFixed(1);
  const progressWidth = 92;
  const activeTool = frame > 66 ? "mcp_tinyfish_fetch_content" : frame > 28 ? "mcp_tinyfish_search" : "ready";
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
      <Background />
      <div style={{ opacity: entrance, transform: "translateX(0px)" }}>
        <TerminalFrame title="Hermes" subtitle="agent tui · mcp session" width={1000} height={1060}>
          <div style={{ padding: "24px 30px 155px", color: colors.text, fontSize: 19, lineHeight: 1.38 }}>
            <Line dim text="main · launch-plan.md" />
            <Line
              accent
              text={'hermes ▸ searching "developer community building playbook real examples 2026"...'}
              show={frame > 28}
            />
            <ResultList show={frame > 42} />
            <Line accent text={"hermes ▸ fetching posthog.com/blog/developer-community..."} show={frame > 64} />
            {frame > 76 ? (
              <div
                style={{
                  marginTop: 14,
                  padding: "16px 20px",
                  background: "rgba(244,240,232,.035)",
                  borderLeft: `3px solid ${colors.green}`,
                  borderRadius: 8,
                  color: colors.text,
                  fontFamily: "General Sans",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 24 }}>How PostHog Built a Developer Community of 10,000</div>
                <div style={{ marginTop: 10, color: colors.green, fontWeight: 800 }}>1. Don't start with Discord</div>
                <div style={{ color: colors.muted, maxWidth: 1120 }}>
                  The biggest mistake is launching a Discord server before you have anything worth discussing...
                </div>
                <div style={{ marginTop: 8, color: colors.green, fontWeight: 800 }}>2. Your docs ARE your community</div>
                <div style={{ color: colors.muted }}>Every docs page should have a question box... ✓ rendered · markdown · 1.1s</div>
              </div>
            ) : null}
            <Line
              accent
              text={'hermes ▸ searching "new hope for open source community management 2026"... ✓ 0.5s'}
              show={frame > 98}
            />
            <pre
              style={{
                margin: "16px 0 0",
                whiteSpace: "pre-wrap",
                color: colors.text,
                fontFamily: "General Sans",
                fontSize: 21,
                lineHeight: 1.35,
              }}
            >
              {synthesis}
            </pre>
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 112, height: 3, background: colors.orange }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 56,
              height: 58,
              background: "#232323",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: 12,
              color: "#D7D1CA",
              fontFamily: "SF Mono, Menlo, ui-monospace, monospace",
              fontSize: 18,
            }}
          >
            <span style={{ color: "#D6CF24", fontWeight: 800 }}>♯ Claude Opus 4.7</span>
            <span style={{ color: "#B59A12" }}>66.4K/204.8K</span>
            <span style={{ width: 150, height: 20, border: "1px solid rgba(117,211,107,.35)", background: "#243726", display: "inline-flex" }}>
              <span style={{ width: progressWidth, height: "100%", background: "#62BA67" }} />
            </span>
            <span style={{ color: "#62BA67", fontWeight: 800 }}>32%</span>
            <span style={{ color: colors.orange }}>{activeTool}</span>
            <span style={{ color: "#B8B8B8" }}>{seconds}s</span>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 56,
              background: "#1D1D1D",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              color: colors.text,
              fontFamily: "SF Mono, Menlo, ui-monospace, monospace",
              fontSize: 19,
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              › {typed}
            </span>
          </div>
        </TerminalFrame>
      </div>
    </AbsoluteFill>
  );
};

const Line = ({ text, show = true, accent = false, dim = false }: { text: string; show?: boolean; accent?: boolean; dim?: boolean }) =>
  show ? (
    <div style={{ color: accent ? colors.orange : dim ? colors.faint : colors.text, marginTop: 8, whiteSpace: "pre" }}>{text}</div>
  ) : null;

const ResultList = ({ show }: { show: boolean }) =>
  show ? (
    <div style={{ marginTop: 12, color: colors.text }}>
      {[
        '"How PostHog Built a 10K Dev Community" -- posthog.com/blog',
        '"Building an Empire of Developer Advocates" -- devrel.co',
        '"The Pragmatic Guide to DevRel" -- swyx.io',
        '"Community-Led Growth: B2B Playbook" -- commonroom.io',
        "✓ 10 results · 0.6s",
      ].map((item) => (
        <div key={item} style={{ marginTop: 4, color: item.startsWith("✓") ? colors.green : colors.muted }}>
          {item.startsWith("✓") ? "  " : "  ● "}
          {item}
        </div>
      ))}
    </div>
  ) : null;

const TelegramScene = () => {
  const frame = useCurrentFrame();
  const entrance = 1;
  const exit = 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: exit }}>
      <Background />
      <div
        style={{
          width: 470,
          height: 910,
          borderRadius: 58,
          padding: 12,
          background: "#111",
          boxShadow: "0 46px 120px rgba(0,0,0,.68), inset 0 0 0 2px rgba(255,255,255,.035)",
          transform: "translateY(0px)",
          opacity: entrance,
          fontFamily: "General Sans",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 46,
            overflow: "hidden",
            background: "#D9ECFF",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              width: 142,
              height: 32,
              borderRadius: 999,
              background: "#050505",
              transform: "translateX(-50%)",
              zIndex: 5,
            }}
          />
          <div
            style={{
              height: 42,
              background: "#1F1F1F",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            <span>9:41</span>
            <PhoneStatus />
          </div>
          <div style={{ height: 78, background: "#4C8FBD", display: "flex", alignItems: "center", padding: "0 18px", gap: 12 }}>
            <div style={{ color: "#DDEEFF", fontSize: 34, lineHeight: 1 }}>‹</div>
            <div style={{ width: 50, height: 50, borderRadius: 999, background: colors.orange, display: "grid", placeItems: "center", fontSize: 27 }}>
              🦞
            </div>
            <div>
              <div style={{ color: "#FFFFFF", fontWeight: 850, fontSize: 25 }}>OpenClaw</div>
              <div style={{ color: "#DDEEFF", fontSize: 15 }}>{frame < 70 ? "bot · online" : "typing..."}</div>
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 120,
              bottom: 72,
              padding: "360px 16px 18px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 9,
              background: "#D9ECFF",
            }}
          >
            <Img
              src={staticFile("tinyfish-lightsaber-wallpaper.png")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.82,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(rgba(217,236,255,.22) 0%, rgba(217,236,255,.08) 58%, rgba(201,224,244,.32) 100%)",
              }}
            />
            <Bubble
              text="I'm launching next Monday -- need landing page teardowns, competitor positioning, and launch day tactics. Go."
              show={frame > 10}
            />
            {frame > 34 ? (
              <OpenClawToolTextBubble frame={frame - 34} />
            ) : null}
            {frame > 82 ? (
              <Bubble
                left
                compact
                text={
                  'Found across 3 searches + 2 fetches:\n\n• Stripe -- one sentence + live demo\n• Linear -- changelog as marketing\n• Post HN at 6am PT\n• Don\'t write "excited to announce"\n• Dark side of FOMO: don\'t fake urgency\n\nDraft launch tweet?'
                }
              />
            ) : null}
          </div>
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 72,
              background: "rgba(238,238,238,.92)",
              display: "flex",
              alignItems: "center",
              padding: "0 18px",
              gap: 12,
              color: "#777",
              fontSize: 22,
              boxShadow: "0 -14px 28px rgba(0,0,0,.12)",
            }}
          >
            <span style={{ fontSize: 28 }}>⌕</span>
            <span style={{ flex: 1 }}>Message</span>
            <span style={{ color: "#111", fontSize: 26 }}>✎</span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PhoneStatus = () => (
  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7 }}>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12 }}>
      {[5, 7, 9, 11].map((height) => (
        <span
          key={height}
          style={{
            width: 3,
            height,
            borderRadius: 2,
            background: "#FFFFFF",
            display: "block",
          }}
        />
      ))}
    </div>
    <div
      style={{
        position: "relative",
        width: 18,
        height: 12,
        overflow: "hidden",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 1,
          top: 2,
          width: 16,
          height: 16,
          border: "2px solid #FFFFFF",
          borderLeftColor: "transparent",
          borderBottomColor: "transparent",
          borderRadius: "50%",
          transform: "rotate(-45deg)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 7,
          top: 8,
          width: 4,
          height: 4,
          borderRadius: 99,
          background: "#FFFFFF",
        }}
      />
    </div>
    <div
      style={{
        width: 25,
        height: 12,
        border: "2px solid #FFFFFF",
        borderRadius: 3,
        padding: 1,
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute",
          right: -5,
          top: 3,
          width: 3,
          height: 6,
          borderRadius: 2,
          background: "#FFFFFF",
        }}
      />
      <span style={{ display: "block", width: 16, height: "100%", background: "#FFFFFF", borderRadius: 1 }} />
    </div>
  </div>
);

const ShimmerText = ({ children, color = colors.orange, frame }: { children: React.ReactNode; color?: string; frame: number }) => {
  const shimmerX = interpolate((frame % 48) / 48, [0, 1], [-130, 220], clamp);
  return (
    <span
      style={{
        color,
        fontWeight: 800,
        backgroundImage: `linear-gradient(100deg, ${color} 0%, ${color} 40%, #fff6dd 50%, ${colors.orange2} 58%, ${color} 70%, ${color} 100%)`,
        backgroundSize: "220% 100%",
        backgroundPosition: `${shimmerX}% 0`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </span>
  );
};

const OpenClawToolTextBubble = ({ frame }: { frame: number }) => {
  const lines = [
    "Searching landing page teardowns... → 10 results",
    "Searching force behind viral launches... → 10 results",
    "Searching launch day checklist... → 10 results",
    "Fetching stripe.com... ✓",
    "Fetching linear.app... ✓",
  ];
  return (
    <div
      style={{
        alignSelf: "flex-start",
        position: "relative",
        zIndex: 2,
        maxWidth: 360,
        borderRadius: "16px 16px 16px 5px",
        background: "#FFFFFF",
        color: "#15201D",
        padding: "10px 12px",
        fontSize: 18,
        lineHeight: 1.25,
        whiteSpace: "pre-wrap",
        boxShadow: "0 10px 24px rgba(0,0,0,.16)",
      }}
    >
      <div>
        using <ShimmerText frame={frame}>TinyFish search</ShimmerText> and{" "}
        <ShimmerText frame={frame + 10} color={colors.green}>
          fetch
        </ShimmerText>
        ...
      </div>
      <div style={{ marginTop: 8, display: "grid", gap: 3 }}>
        {lines.map((line, index) => (
          <div key={line} style={{ opacity: fit(frame, index * 5 + 6, index * 5 + 11), color: index >= 3 ? "#50615A" : "#15201D" }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

const Bubble = ({
  text,
  left = false,
  muted = false,
  wide = false,
  compact = false,
  show = true,
}: {
  text: string;
  left?: boolean;
  muted?: boolean;
  wide?: boolean;
  compact?: boolean;
  show?: boolean;
}) =>
  show ? (
    <div
      style={{
        alignSelf: left ? "flex-start" : "flex-end",
        position: "relative",
        zIndex: 2,
        maxWidth: compact ? 360 : wide ? 760 : 360,
        borderRadius: left ? "16px 16px 16px 5px" : "16px 16px 5px 16px",
        background: muted ? "rgba(255,255,255,.08)" : left ? "#FFFFFF" : "#D9FFB8",
        color: left ? "#15201D" : "#111",
        padding: compact ? "10px 12px" : "13px 15px",
        fontSize: 18,
        lineHeight: 1.25,
        whiteSpace: "pre-wrap",
        boxShadow: "0 10px 24px rgba(0,0,0,.16)",
      }}
    >
      {text}
      {!left ? <span style={{ display: "block", color: "#6E9465", textAlign: "right", fontSize: 12, marginTop: 4 }}>9:42 ✓✓</span> : null}
    </div>
  ) : null;

const MontageScene = () => {
  const frame = useCurrentFrame();
  const methods = ["REST API", "MCP", "CLI", "Skill", "SDK"];
  const queries = [
    ['REST API', 'search: "series A valuation benchmarks SaaS 2026"', "→ 10 results · 0.5s"],
    ["MCP", "fetch: arxiv.org/abs/2406.14283", "→ rendered · markdown · 1.4s"],
    ["CLI", 'tinyfish search "best noise-cancelling headphones under $300"', "→ 10 results · 0.5s"],
    ["Skill", 'search: "return of structured data in AI pipelines"', "→ 10 results · 0.6s"],
    ["SDK", 'search: "agent strikes back at manual research"', "→ 10 results · 0.4s"],
    ["MCP", 'search: "oauth provider comparison for agent tools"', "→ 10 results · 0.5s"],
    ["CLI", 'fetch https://docs.tinyfish.ai/search', "→ markdown · 0.9s"],
    ["REST API", 'search: "pricing pages that convert devtools"', "→ 10 results · 0.5s"],
    ["SDK", 'fetch https://linear.app/changelog', "→ markdown · 1.1s"],
    ["Skill", 'search: "agent memory retrieval best practices"', "→ 10 results · 0.4s"],
  ];
  const positions = [
    { x: 56, y: 92, w: 740, r: -1.2, dx: 110 },
    { x: 292, y: 188, w: 690, r: 0.8, dx: -120 },
    { x: 116, y: 330, w: 840, r: 0.4, dx: 150 },
    { x: 402, y: 458, w: 610, r: -1.1, dx: -170 },
    { x: 70, y: 590, w: 720, r: 1.0, dx: 120 },
    { x: 268, y: 694, w: 760, r: -0.5, dx: -130 },
    { x: 42, y: 844, w: 650, r: -0.7, dx: 160 },
    { x: 326, y: 938, w: 680, r: 0.9, dx: -110 },
    { x: 122, y: 1062, w: 720, r: 0.2, dx: 150 },
    { x: 430, y: 1158, w: 590, r: -0.9, dx: -130 },
  ];
  const stack = Math.min(
    1,
    spring({ fps: 30, frame: frame - 48, config: { damping: 32, stiffness: 135, mass: 0.9 } })
  );
  const labelsIn = spring({ fps: 30, frame: frame - 78, config: { damping: 24, stiffness: 190, mass: 0.75 } });
  return (
    <AbsoluteFill style={{ fontFamily: "Host Grotesk" }}>
      <Background pulse={0.02} />
      {queries.map((q, i) => {
        const start = i * 4;
        const pos = positions[i];
        const o = interpolate(frame, [start, start + 5], [0, 1], clamp);
        const pop = spring({ fps: 30, frame: frame - start, config: { damping: 18, stiffness: 260 } });
        const float = Math.sin((frame + i * 37) / 18) * 3 * (1 - stack);
        const stackX = 42;
        const stackY = 150 + i * 104;
        const x = interpolate(stack, [0, 1], [pos.x, stackX]);
        const y = interpolate(stack, [0, 1], [pos.y, stackY]);
        const width = interpolate(stack, [0, 1], [pos.w, 550]);
        const rotation = interpolate(stack, [0, 1], [pos.r, 0]);
        const fontSize = interpolate(stack, [0, 1], [22, 17]);
        const resultSize = interpolate(stack, [0, 1], [22, 16]);
        return (
          <div
            key={`${q[0]}-${i}`}
            style={{
              position: "absolute",
              left: x,
              top: y,
              opacity: o,
              transform: `translateY(${float}px) rotate(${rotation}deg) scale(${0.96 + Math.min(1, pop) * 0.04})`,
              padding: stack > 0.5 ? "12px 16px" : "18px 22px",
              width,
              border: "1px solid rgba(244,240,232,.16)",
              borderRadius: 12,
              background: "rgba(18,18,18,.94)",
              color: colors.text,
              fontFamily: "SF Mono, Menlo, monospace",
              fontSize,
              lineHeight: 1.28,
              boxShadow: "0 22px 60px rgba(0,0,0,.42)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span
                style={{
                  color: colors.orange,
                  fontWeight: 900,
                  fontSize: stack > 0.5 ? 15 : 20,
                  padding: "4px 8px",
                  borderRadius: 6,
                  background: "rgba(232,113,58,.12)",
                  border: "1px solid rgba(232,113,58,.22)",
                  whiteSpace: "nowrap",
                }}
              >
                {q[0]}
              </span>
              <span style={{ color: colors.faint }}>▸</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q[1]}</span>
            </div>
            <div style={{ marginTop: stack > 0.5 ? 6 : 10, color: colors.green, fontWeight: 700, fontSize: resultSize }}>{q[2]}</div>
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          right: 32,
          top: "50%",
          width: 330,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: interpolate(labelsIn, [0, 0.7], [0, 1], clamp),
          transform: `translate(${interpolate(labelsIn, [0, 1], [30, 0], clamp)}px, -50%)`,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: 12,
            borderRadius: 16,
            background: "rgba(18,18,18,.92)",
            border: "1px solid rgba(244,240,232,.16)",
            boxShadow: "0 28px 80px rgba(0,0,0,.44)",
            fontFamily: "SF Mono, Menlo, monospace",
            width: "100%",
            justifyContent: "center",
          }}
        >
          {methods.map((m, i) => (
            <span
              key={m}
              style={{
                color: i === 0 ? "#101312" : colors.text,
                background: i === 0 ? colors.orange : "rgba(244,240,232,.045)",
                border: `1px solid ${i === 0 ? "rgba(232,113,58,.9)" : "rgba(244,240,232,.12)"}`,
                borderRadius: 10,
                padding: "16px 18px",
                width: "100%",
                fontSize: 24,
                fontWeight: 850,
                lineHeight: 1,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              {m}
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderRadius: 12,
            background: "rgba(244,240,232,.045)",
            border: "1px solid rgba(244,240,232,.1)",
            color: colors.text,
            fontSize: 18,
            fontWeight: 650,
            width: "100%",
            justifyContent: "center",
          }}
        >
          <span style={{ color: colors.orange, fontFamily: "SF Mono, Menlo, monospace" }}>One API key.</span>
          <span style={{ color: colors.faint }}>Pick your way in.</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PunchlineScene = () => {
  const frame = useCurrentFrame();
  const setupPop = frame >= 10 ? 1 : 0;
  const absolutesReveal = interpolate(frame, [22, 34], [0, 100], clamp);
  return (
    <AbsoluteFill style={{ background: colors.bg, fontFamily: "Host Grotesk", alignItems: "center", justifyContent: "center" }}>
      <Grain opacity={0.07} />
      <div
        style={{
          color: "rgba(244,240,232,.94)",
          fontSize: 64,
          fontWeight: 430,
          opacity: frame < 52 ? setupPop : 0,
          transform: `scale(${setupPop ? 1 : 0.985})`,
        }}
      >
        Only a dev deals in{" "}
        <span
          style={{
            color: "rgba(244,240,232,.94)",
            ...(frame >= 22
              ? {
                  backgroundImage: `linear-gradient(90deg, #FF3B30 0%, #FF6A45 ${absolutesReveal}%, rgba(244,240,232,.94) ${absolutesReveal}%, rgba(244,240,232,.94) 100%)`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }
              : {}),
            textShadow: frame >= 22 ? `0 0 ${interpolate(frame, [22, 34], [0, 16], clamp)}px rgba(255,59,48,.45)` : "none",
          }}
        >
          absolutes.
        </span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 52,
          right: 52,
          top: 560,
          textAlign: "center",
          color: colors.text,
          fontSize: 64,
          lineHeight: 0.98,
          fontWeight: 520,
          opacity: frame >= 56 ? 1 : 0,
        }}
      >
        Free Search. Free Fetch.
        <br />
        <span style={{ color: colors.orange, fontSize: 60, fontWeight: 520, whiteSpace: "nowrap" }}>Absolutely free. Absolute power.</span>
      </div>
    </AbsoluteFill>
  );
};

const CtaScene = () => {
  const frame = useCurrentFrame();
  const web = fit(frame, 8, 28);
  const tag = fit(frame, 36, 54);
  const final = fit(frame, 58, 76);
  return (
    <AbsoluteFill style={{ fontFamily: "Host Grotesk" }}>
      <Background pulse={0.03} />
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: colors.text,
              fontSize: 72,
              fontWeight: 850,
              opacity: web,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 22,
            }}
          >
            <Img src={staticFile("fish.svg")} style={{ width: 68, height: 68 }} />
            <span>tinyfish.ai</span>
          </div>
          <div style={{ marginTop: 18, color: colors.muted, fontSize: 32, fontWeight: 650, opacity: tag }}>Get your API key. Go build.</div>
          <div
            style={{
              marginTop: 32,
              color: colors.text,
              fontSize: 44,
              fontWeight: 620,
              opacity: final,
              transform: `translateY(${(1 - final) * 14}px)`,
            }}
          >
            May the Web be with you.
          </div>
        </div>
      </div>
      <Img
        src={staticFile("tinyfish-logo.svg")}
        style={{
          position: "absolute",
          left: 54,
          bottom: 66,
          width: 190,
          opacity: fit(frame, 92, 112),
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 54,
          bottom: 58,
          opacity: fit(frame, 92, 112),
          color: colors.faint,
          fontSize: 18,
          fontWeight: 800,
        }}
      >
        Boba Fetch
      </div>
    </AbsoluteFill>
  );
};

export const MayFourthLaunch: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.bg }}>
    <Sequence from={0} durationInFrames={90}>
      <HookScene />
    </Sequence>
    <Sequence from={90} durationInFrames={180}>
      <ClaudeScene />
    </Sequence>
    <Sequence from={270} durationInFrames={150}>
      <HermesScene />
    </Sequence>
    <Sequence from={420} durationInFrames={150}>
      <TelegramScene />
    </Sequence>
    <Sequence from={570} durationInFrames={120}>
      <MontageScene />
    </Sequence>
    <Sequence from={690} durationInFrames={120}>
      <PunchlineScene />
    </Sequence>
    <Sequence from={810} durationInFrames={90}>
      <CtaScene />
    </Sequence>
  </AbsoluteFill>
);
