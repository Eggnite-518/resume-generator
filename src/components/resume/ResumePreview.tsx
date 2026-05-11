import type { ResumeContent } from "@/types";

// ── Shared helpers ────────────────────────────────────────────────────────────

const FONT =
  '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",Arial,sans-serif';

/** Render pipe-separated contact items */
function ContactBar({
  items,
  style,
}: {
  items: (string | undefined | null)[];
  style?: React.CSSProperties;
}) {
  const filtered = items.filter(Boolean) as string[];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        columnGap: 0,
        fontSize: "9pt",
        color: "#555",
        lineHeight: 1.6,
        ...style,
      }}
    >
      {filtered.map((v, i) => (
        <span key={i}>
          {i > 0 && (
            <span style={{ color: "#bbb", margin: "0 7px" }}>|</span>
          )}
          {v}
        </span>
      ))}
    </div>
  );
}

// ── Classic Template (matches user's actual resume style) ─────────────────────

function ClassicPreview({ content }: { content: ResumeContent }) {
  const { personalInfo, sections } = content;
  const contacts = [
    personalInfo.phone,
    personalInfo.email,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
    personalInfo.website,
  ].filter(Boolean) as string[];

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: "10pt",
        lineHeight: 1.6,
        color: "#1a1a1a",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "12px",
          paddingBottom: "10px",
          borderBottom: "1.5px solid #1a1a1a",
        }}
      >
        {/* Left: name + contacts + summary */}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: "24pt",
              fontWeight: 800,
              letterSpacing: "2px",
              margin: "0 0 5px",
              lineHeight: 1.1,
            }}
          >
            {personalInfo.name || "姓名"}
          </h1>
          <ContactBar items={contacts} />
          {personalInfo.summary && (
            <p
              style={{
                fontSize: "9.5pt",
                color: "#444",
                marginTop: "5px",
                lineHeight: 1.55,
                maxWidth: "480px",
              }}
            >
              {personalInfo.summary}
            </p>
          )}
        </div>
        {/* Right: photo */}
        {personalInfo.photo && (
          <img
            src={personalInfo.photo}
            alt="证件照"
            style={{
              width: "72px",
              height: "90px",
              objectFit: "cover",
              border: "1px solid #ddd",
              marginLeft: "18px",
              flexShrink: 0,
              borderRadius: "2px",
            }}
          />
        )}
      </div>

      {/* ── Sections ── */}
      {sections.map((section) => (
        <div key={section.id} style={{ marginBottom: "14px" }}>
          {/* Section title */}
          <h2
            style={{
              fontSize: "11.5pt",
              fontWeight: 700,
              margin: "0 0 8px",
              paddingBottom: "3px",
              borderBottom: "1.5px solid #1a1a1a",
              color: "#111",
            }}
          >
            {section.title}
          </h2>

          {/* Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {section.items.map((item) => (
              <div key={item.id}>
                {/* Item header: title/org LEFT — date RIGHT */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "2px",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0 6px" }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "10.5pt" }}>
                      {item.title}
                    </span>
                    {item.subtitle && (
                      <>
                        <span style={{ color: "#aaa" }}>|</span>
                        <span style={{ fontSize: "10pt", color: "#333" }}>
                          {item.subtitle}
                        </span>
                      </>
                    )}
                    {item.projectName && (
                      <>
                        <span style={{ color: "#aaa" }}>|</span>
                        <span style={{ fontSize: "10pt", color: "#555" }}>
                          {item.projectName}
                        </span>
                      </>
                    )}
                  </div>
                  {item.dateRange && (
                    <span
                      style={{
                        fontSize: "9pt",
                        color: "#666",
                        flexShrink: 0,
                        marginLeft: "12px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.dateRange}
                    </span>
                  )}
                </div>

                {/* Bullets */}
                {item.bullets.filter(Boolean).length > 0 && (
                  <ul
                    style={{
                      margin: "3px 0 0",
                      paddingLeft: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {item.bullets.filter(Boolean).map((b, i) => (
                      <li
                        key={i}
                        style={{
                          fontSize: "9.5pt",
                          color: "#222",
                          lineHeight: 1.6,
                          listStyleType: "disc",
                        }}
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Modern Template ───────────────────────────────────────────────────────────

function ModernPreview({ content }: { content: ResumeContent }) {
  const { personalInfo, sections } = content;
  const contacts = [
    personalInfo.phone,
    personalInfo.email,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
    personalInfo.website,
  ].filter(Boolean) as string[];

  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: "10pt",
        lineHeight: 1.6,
        color: "#1a1a1a",
        display: "flex",
        minHeight: "297mm",
      }}
    >
      {/* Left sidebar */}
      <div
        style={{
          width: "52mm",
          flexShrink: 0,
          background: "#1e293b",
          color: "#f1f5f9",
          padding: "20mm 6mm 16mm",
          boxSizing: "border-box",
        }}
      >
        {/* Photo */}
        {personalInfo.photo ? (
          <img
            src={personalInfo.photo}
            alt="证件照"
            style={{
              width: "72px",
              height: "90px",
              objectFit: "cover",
              borderRadius: "4px",
              display: "block",
              marginBottom: "10px",
            }}
          />
        ) : null}

        <h1 style={{ fontSize: "16pt", fontWeight: 800, margin: "0 0 6px", lineHeight: 1.2 }}>
          {personalInfo.name || "姓名"}
        </h1>

        <div style={{ marginTop: "12px" }}>
          <p style={{ fontSize: "7.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", margin: "0 0 5px" }}>
            联系方式
          </p>
          {contacts.map((c, i) => (
            <p key={i} style={{ fontSize: "8.5pt", color: "#cbd5e1", margin: "0 0 2px", wordBreak: "break-all" }}>
              {c}
            </p>
          ))}
        </div>

        {personalInfo.summary && (
          <div style={{ marginTop: "14px" }}>
            <p style={{ fontSize: "7.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#94a3b8", margin: "0 0 5px" }}>
              简介
            </p>
            <p style={{ fontSize: "8.5pt", color: "#cbd5e1", lineHeight: 1.55 }}>
              {personalInfo.summary}
            </p>
          </div>
        )}
      </div>

      {/* Right content */}
      <div style={{ flex: 1, padding: "14mm 12mm", boxSizing: "border-box" }}>
        {sections.map((section) => (
          <div key={section.id} style={{ marginBottom: "14px" }}>
            <h2
              style={{
                fontSize: "10.5pt",
                fontWeight: 700,
                color: "#2563eb",
                borderBottom: "1.5px solid #bfdbfe",
                paddingBottom: "3px",
                margin: "0 0 8px",
              }}
            >
              {section.title}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {section.items.map((item) => (
                <div key={item.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: "2px",
                    }}
                  >
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 6px", alignItems: "baseline" }}>
                      <span style={{ fontWeight: 700, fontSize: "10pt" }}>{item.title}</span>
                      {item.subtitle && (
                        <>
                          <span style={{ color: "#94a3b8" }}>|</span>
                          <span style={{ fontSize: "9.5pt", color: "#475569" }}>{item.subtitle}</span>
                        </>
                      )}
                      {item.projectName && (
                        <>
                          <span style={{ color: "#94a3b8" }}>|</span>
                          <span style={{ fontSize: "9.5pt", color: "#64748b" }}>{item.projectName}</span>
                        </>
                      )}
                    </div>
                    {item.dateRange && (
                      <span style={{ fontSize: "8.5pt", color: "#94a3b8", flexShrink: 0, marginLeft: "10px", whiteSpace: "nowrap" }}>
                        {item.dateRange}
                      </span>
                    )}
                  </div>
                  {item.bullets.filter(Boolean).length > 0 && (
                    <ul style={{ margin: "3px 0 0", paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "1px" }}>
                      {item.bullets.filter(Boolean).map((b, i) => (
                        <li key={i} style={{ fontSize: "9pt", color: "#1e293b", lineHeight: 1.6, listStyleType: "disc" }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Compact Template ──────────────────────────────────────────────────────────

function CompactPreview({ content }: { content: ResumeContent }) {
  const { personalInfo, sections } = content;
  const contacts = [
    personalInfo.phone,
    personalInfo.email,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
  ].filter(Boolean) as string[];

  return (
    <div style={{ fontFamily: FONT, fontSize: "9.5pt", lineHeight: 1.5, color: "#1a1a1a" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
          paddingBottom: "8px",
          borderBottom: "1.5px solid #1a1a1a",
        }}
      >
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "20pt", fontWeight: 800, margin: "0 0 4px", letterSpacing: "1px" }}>
            {personalInfo.name || "姓名"}
          </h1>
          <ContactBar items={contacts} />
          {personalInfo.summary && (
            <p style={{ fontSize: "9pt", color: "#444", marginTop: "4px", maxWidth: "480px" }}>
              {personalInfo.summary}
            </p>
          )}
        </div>
        {personalInfo.photo && (
          <img
            src={personalInfo.photo}
            alt="证件照"
            style={{
              width: "64px",
              height: "80px",
              objectFit: "cover",
              border: "1px solid #ddd",
              marginLeft: "14px",
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {sections.map((section) => (
        <div key={section.id} style={{ marginBottom: "10px" }}>
          <h2
            style={{
              fontSize: "10pt",
              fontWeight: 700,
              backgroundColor: "#f3f4f6",
              padding: "2px 4px",
              margin: "0 0 6px",
              borderLeft: "3px solid #374151",
              paddingLeft: "7px",
            }}
          >
            {section.title}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {section.items.map((item) => (
              <div key={item.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "1px",
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0 5px", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 700, fontSize: "9.5pt" }}>{item.title}</span>
                    {item.subtitle && (
                      <>
                        <span style={{ color: "#bbb" }}>|</span>
                        <span style={{ fontSize: "9pt", color: "#444" }}>{item.subtitle}</span>
                      </>
                    )}
                    {item.projectName && (
                      <>
                        <span style={{ color: "#bbb" }}>|</span>
                        <span style={{ fontSize: "9pt", color: "#666" }}>{item.projectName}</span>
                      </>
                    )}
                  </div>
                  {item.dateRange && (
                    <span style={{ fontSize: "8.5pt", color: "#777", flexShrink: 0, marginLeft: "8px", whiteSpace: "nowrap" }}>
                      {item.dateRange}
                    </span>
                  )}
                </div>
                {item.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: "2px 0 0", paddingLeft: "13px", display: "flex", flexDirection: "column", gap: "1px" }}>
                    {item.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ fontSize: "9pt", color: "#222", lineHeight: 1.55, listStyleType: "disc" }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  content: ResumeContent;
  template?: "classic" | "modern" | "compact";
}

export default function ResumePreview({ content, template = "classic" }: Props) {
  const padding = template === "modern" ? "0" : "14mm 18mm";

  return (
    <div
      id="resume-preview-root"
      style={{
        background: "white",
        width: "210mm",
        minHeight: "297mm",
        padding,
        boxSizing: "border-box",
        boxShadow: "0 2px 20px rgba(0,0,0,0.12)",
        margin: "0 auto",
      }}
    >
      {template === "classic" && <ClassicPreview content={content} />}
      {template === "modern" && <ModernPreview content={content} />}
      {template === "compact" && <CompactPreview content={content} />}
    </div>
  );
}
