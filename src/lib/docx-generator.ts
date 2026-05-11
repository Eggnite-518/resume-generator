import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  UnderlineType,
} from "docx";
import type { ResumeContent } from "@/types";

function cmToTwip(cm: number) {
  return Math.round(cm * 566.93);
}

function makeHorizontalRule() {
  return new Paragraph({
    border: {
      bottom: {
        color: "CCCCCC",
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { after: 120 },
  });
}

function makeHeader(name: string, contactLine: string) {
  return [
    new Paragraph({
      children: [new TextRun({ text: name, bold: true, size: 48, color: "1A1A2E" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: contactLine, size: 18, color: "555555" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  ];
}

function makeSectionTitle(title: string, color = "1A56DB") {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 24,
          color,
        }),
      ],
      spacing: { before: 240, after: 80 },
    }),
    makeHorizontalRule(),
  ];
}

function makeBulletParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 20, color: "333333" })],
    spacing: { after: 40 },
    indent: { left: cmToTwip(0.4) },
  });
}

export function buildClassicDocument(content: ResumeContent): Document {
  const { personalInfo, sections } = content;
  const contactParts = [
    personalInfo.phone,
    personalInfo.email,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
  ].filter(Boolean);
  const contactLine = contactParts.join("  |  ");

  const children: Paragraph[] = [
    ...makeHeader(personalInfo.name || "姓名", contactLine),
  ];

  if (personalInfo.summary) {
    children.push(...makeSectionTitle("个人简介"));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: personalInfo.summary, size: 20, color: "333333" })],
        spacing: { after: 80 },
      })
    );
  }

  for (const section of sections) {
    children.push(...makeSectionTitle(section.title));
    for (const item of section.items) {
      const dateRun = item.dateRange
        ? new TextRun({ text: item.dateRange, size: 20, color: "777777", italics: true })
        : null;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: item.title, bold: true, size: 22, color: "1A1A2E" }),
            ...(item.subtitle
              ? [new TextRun({ text: `  ${item.subtitle}`, size: 20, color: "555555" })]
              : []),
            ...(dateRun ? [new TextRun({ text: "  " }), dateRun] : []),
          ],
          spacing: { before: 80, after: 60 },
        })
      );
      for (const bullet of item.bullets) {
        children.push(makeBulletParagraph(bullet));
      }
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: cmToTwip(2),
              right: cmToTwip(2),
              bottom: cmToTwip(2),
              left: cmToTwip(2),
            },
          },
        },
        children,
      },
    ],
  });
}

export function buildModernDocument(content: ResumeContent): Document {
  const { personalInfo, sections } = content;

  const leftSections = sections.filter((s) =>
    ["skill", "award", "education"].includes(s.type)
  );
  const rightSections = sections.filter(
    (s) => !["skill", "award", "education"].includes(s.type)
  );

  function makeLeftItem(title: string, items: string[]) {
    return [
      new Paragraph({
        children: [new TextRun({ text: title, bold: true, size: 22, color: "FFFFFF" })],
        spacing: { before: 160, after: 60 },
      }),
      ...items.map(
        (b) =>
          new Paragraph({
            children: [new TextRun({ text: `• ${b}`, size: 18, color: "E0E0E0" })],
            spacing: { after: 40 },
          })
      ),
    ];
  }

  const leftContent: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: personalInfo.name || "姓名", bold: true, size: 36, color: "FFFFFF" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    ...[personalInfo.phone, personalInfo.email, personalInfo.location]
      .filter(Boolean)
      .map(
        (v) =>
          new Paragraph({
            children: [new TextRun({ text: v!, size: 18, color: "CCCCCC" })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 },
          })
      ),
    ...(personalInfo.summary
      ? [
          new Paragraph({
            children: [new TextRun({ text: personalInfo.summary, size: 18, color: "E0E0E0", italics: true })],
            spacing: { before: 160, after: 80 },
          }),
        ]
      : []),
    ...leftSections.flatMap((s) =>
      makeLeftItem(
        s.title,
        s.items.flatMap((item) => item.bullets)
      )
    ),
  ];

  const rightContent: Paragraph[] = rightSections.flatMap((s) => [
    new Paragraph({
      children: [new TextRun({ text: s.title, bold: true, size: 24, color: "1A56DB" })],
      spacing: { before: 200, after: 80 },
    }),
    makeHorizontalRule(),
    ...s.items.flatMap((item) => [
      new Paragraph({
        children: [
          new TextRun({ text: item.title, bold: true, size: 22, color: "1A1A2E" }),
          ...(item.subtitle
            ? [new TextRun({ text: `  ${item.subtitle}`, size: 20, color: "555555" })]
            : []),
          ...(item.dateRange
            ? [new TextRun({ text: `  ${item.dateRange}`, size: 18, color: "777777", italics: true })]
            : []),
        ],
        spacing: { before: 80, after: 60 },
      }),
      ...item.bullets.map(makeBulletParagraph),
    ]),
  ]);

  const leftCell = new TableCell({
    children: leftContent,
    width: { size: 30, type: WidthType.PERCENTAGE },
    shading: { fill: "1A1A2E", type: ShadingType.CLEAR },
    margins: { top: cmToTwip(0.5), bottom: cmToTwip(0.5), left: cmToTwip(0.6), right: cmToTwip(0.6) },
  });

  const rightCell = new TableCell({
    children: rightContent,
    width: { size: 70, type: WidthType.PERCENTAGE },
    margins: { top: cmToTwip(0.5), bottom: cmToTwip(0.5), left: cmToTwip(0.8), right: cmToTwip(0.5) },
  });

  const table = new Table({
    rows: [new TableRow({ children: [leftCell, rightCell] })],
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: cmToTwip(1.5), right: cmToTwip(1.5), bottom: cmToTwip(1.5), left: cmToTwip(1.5) },
          },
        },
        children: [table],
      },
    ],
  });
}

export function buildCompactDocument(content: ResumeContent): Document {
  const { personalInfo, sections } = content;
  const contactParts = [
    personalInfo.phone,
    personalInfo.email,
    personalInfo.location,
    personalInfo.linkedin,
    personalInfo.github,
  ].filter(Boolean);

  const children: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({ text: personalInfo.name || "姓名", bold: true, size: 36, color: "111827" }),
        new TextRun({ text: "   " }),
        new TextRun({ text: contactParts.join(" · "), size: 18, color: "6B7280" }),
      ],
      spacing: { after: 80 },
    }),
    makeHorizontalRule(),
  ];

  if (personalInfo.summary) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: personalInfo.summary, size: 19, color: "374151", italics: true })],
        spacing: { after: 120 },
      })
    );
  }

  for (const section of sections) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: section.title, bold: true, size: 20, color: "1D4ED8", allCaps: true })],
        spacing: { before: 160, after: 60 },
      }),
      makeHorizontalRule()
    );
    for (const item of section.items) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: item.title, bold: true, size: 20 }),
            ...(item.subtitle ? [new TextRun({ text: `  |  ${item.subtitle}`, size: 18, color: "6B7280" })] : []),
            ...(item.dateRange ? [new TextRun({ text: `  ${item.dateRange}`, size: 18, color: "9CA3AF", italics: true })] : []),
          ],
          spacing: { before: 60, after: 40 },
        })
      );
      for (const bullet of item.bullets) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `• ${bullet}`, size: 18, color: "374151" })],
            spacing: { after: 30 },
            indent: { left: cmToTwip(0.35) },
          })
        );
      }
    }
  }

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: cmToTwip(1.5), right: cmToTwip(1.8), bottom: cmToTwip(1.5), left: cmToTwip(1.8) },
          },
        },
        children,
      },
    ],
  });
}

export async function generateDocxBuffer(
  content: ResumeContent,
  template: "classic" | "modern" | "compact"
): Promise<Buffer> {
  let doc: Document;
  if (template === "modern") {
    doc = buildModernDocument(content);
  } else if (template === "compact") {
    doc = buildCompactDocument(content);
  } else {
    doc = buildClassicDocument(content);
  }
  return Buffer.from(await Packer.toBuffer(doc));
}
