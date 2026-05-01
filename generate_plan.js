const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, TabStopPosition, TabStopType,
  LevelFormat, convertInchesToTwip
} = require("docx");
const fs = require("fs");

// ── Palette (tech/AI style) ──
const P = { primary: "0A1628", body: "1A2B40", secondary: "6878A0", accent: "5B8DB8", surface: "F4F8FC" };
const c = (hex) => hex.replace("#", "");

// ── Reusable border configs ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const thinBorder = (color = "D0D8E0") => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
});

// ── Helper: make a table row ──
function makeRow(cells, isHeader = false, widths) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map((text, i) => new TableCell({
      width: widths ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 50, after: 50 },
        children: [new TextRun({
          text, bold: isHeader, size: 20,
          color: isHeader ? "FFFFFF" : c(P.body),
          font: { ascii: "Calibri", eastAsia: isHeader ? "SimHei" : "Microsoft YaHei" }
        })]
      })],
      shading: isHeader
        ? { type: ShadingType.CLEAR, fill: c(P.accent) }
        : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      borders: thinBorder("D0D8E0"),
      margins: { top: 60, bottom: 60, left: 120, right: 120 }
    }))
  });
}

// ── Paragraph builders ──
function heading(text, level = HeadingLevel.HEADING_1) {
  const isH1 = level === HeadingLevel.HEADING_1;
  return new Paragraph({
    heading: level,
    spacing: { before: isH1 ? 480 : 320, after: 160 },
    children: [new TextRun({
      text, bold: true,
      color: c(isH1 ? P.primary : P.accent),
      font: { ascii: "Calibri", eastAsia: "SimHei" },
      size: isH1 ? 32 : 28
    })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [new TextRun({
      text, bold: true,
      color: c(P.primary),
      font: { ascii: "Calibri", eastAsia: "SimHei" },
      size: 26
    })]
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 420 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({
      text, size: 24,
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({
      text, size: 24,
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function bullet(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 720, hanging: 240 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: c(P.accent), font: { ascii: "Calibri" } }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function bulletBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 720, hanging: 240 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: c(P.accent), font: { ascii: "Calibri" } }),
      new TextRun({ text: label, bold: true, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function numberedItem(num, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 720, hanging: 360 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 24, color: c(P.accent), font: { ascii: "Calibri" } }),
      new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function codeBlock(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480 },
    spacing: { line: 276, after: 20 },
    shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
    children: [new TextRun({
      text, size: 20,
      color: "2C3E50",
      font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function codeBlockNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276, after: 20 },
    shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
    children: [new TextRun({
      text, size: 20,
      color: "2C3E50",
      font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" }
    })]
  });
}

// ═══════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: c(P.body) },
        paragraph: { spacing: { line: 312 } }
      }
    }
  },
  sections: [
    // ── No cover page, start directly with content ──
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: c(P.accent) } },
            children: [new TextRun({
              text: "Mcpatch2 \u4e91\u7aef\u914d\u7f6e\u96c6\u6210\u90e8\u7f72\u65b9\u6848",
              size: 18, color: c(P.secondary),
              font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
            })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" } },
            spacing: { before: 100 },
            children: [
              new TextRun({ text: "\u2014 ", size: 16, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: c(P.secondary) }),
              new TextRun({ text: " \u2014", size: 16, color: "AAAAAA" }),
            ]
          })]
        })
      },
      children: [

        // ════════════════════════════════════════════
        // 一、方案概述
        // ════════════════════════════════════════════
        heading("\u4e00\u3001\u65b9\u6848\u6982\u8ff0"),

        body("\u672c\u65b9\u6848\u65e8\u5728\u5c06 Mcpatch2 Java \u5ba2\u6237\u7aef\u7684\u914d\u7f6e\u83b7\u53d6\u65b9\u5f0f\u4ece\u672c\u5730\u6587\u4ef6\u8bfb\u53d6\u5347\u7ea7\u4e3a\u4e91\u7aef\u8fdc\u7a0b\u83b7\u53d6\uff0c\u540c\u65f6\u786e\u4fdd\u914d\u7f6e\u5728\u672c\u5730\u4ee5\u52a0\u5bc6\u5f62\u5f0f\u5b58\u50a8\uff0c\u9632\u6b62\u7528\u6237\u76f4\u63a5\u8bfb\u53d6\u6216\u7be1\u6539\u914d\u7f6e\u5185\u5bb9\u3002\u4e91\u63a7\u540e\u7aef\uff08Mcpatch2 Cloud Control Panel\uff09\u5df2\u7ecf\u5177\u5907\u5b8c\u6574\u7684\u5b89\u5168\u57fa\u7840\u8bbe\u65bd\uff0c\u5305\u62ec API \u5bc6\u94a5\u8ba4\u8bc1\u3001RSA \u7b7e\u540d\u3001HMAC \u8bf7\u6c42\u7b7e\u540d\u3001AES \u52a0\u5bc6\u4f20\u8f93\u3001\u5bc6\u94a5\u788e\u7247\u5316\u5b58\u50a8\u548c HTTPS \u8bc1\u4e66\u9501\u5b9a\u516d\u5c42\u5b89\u5168\u9632\u62a4\u4f53\u7cfb\uff0cJava \u5ba2\u6237\u7aef\u53ea\u9700\u5bf9\u63a5\u73b0\u6709\u7684 `/api/client` \u63a5\u53e3\u5373\u53ef\u5b9e\u73b0\u5b89\u5168\u53ef\u9760\u7684\u914d\u7f6e\u62c9\u53d6\u3002"),

        // ════════════════════════════════════════════
        // 二、系统架构
        // ════════════════════════════════════════════
        heading("\u4e8c\u3001\u7cfb\u7edf\u67b6\u6784"),

        heading("2.1 \u6574\u4f53\u67b6\u6784", HeadingLevel.HEADING_2),

        body("\u7cfb\u7edf\u91c7\u7528\u300c\u4e91\u63a7\u540e\u7aef \u2192 API \u63a5\u53e3 \u2192 Java \u5ba2\u6237\u7aef\u300d\u7684\u4e09\u5c42\u67b6\u6784\u3002\u7ba1\u7406\u5458\u901a\u8fc7\u4e91\u63a7\u9762\u677f Web \u754c\u9762\u7ba1\u7406\u914d\u7f6e\u7248\u672c\uff0c\u5c06 mcpatch.yml \u7684\u5185\u5bb9\u4f5c\u4e3a YAML \u914d\u7f6e\u53d1\u5e03\u5230\u4e91\u7aef\uff1bJava \u5ba2\u6237\u7aef\u542f\u52a8\u65f6\u901a\u8fc7 HTTPS \u8c03\u7528 `/api/client` \u63a5\u53e3\u83b7\u53d6\u52a0\u5bc6\u540e\u7684\u914d\u7f6e\u6570\u636e\uff0c\u5728\u5185\u5b58\u4e2d\u89e3\u5bc6\u540e\u4f7f\u7528\uff0c\u540c\u65f6\u5c06\u52a0\u5bc6\u540e\u7684\u914d\u7f6e\u7f13\u5b58\u5230\u672c\u5730\u78c1\u76d8\uff0c\u4f9b\u79bb\u7ebf\u6216\u7f51\u7edc\u5f02\u5e38\u65f6\u4f7f\u7528\u3002"),

        heading("2.2 \u6570\u636e\u6d41", HeadingLevel.HEADING_2),

        numberedItem(1, "\u7ba1\u7406\u5458\u5728\u4e91\u63a7\u9762\u677f\u7f16\u8f91 mcpatch.yml \u914d\u7f6e\u5185\u5bb9\u5e76\u53d1\u5e03"),
        numberedItem(2, "\u4e91\u63a7\u9762\u677f\u5c06\u914d\u7f6e\u5b58\u50a8\u5230 SQLite \u6570\u636e\u5e93\uff08CloudConfig \u8868\uff09\uff0c\u6807\u8bb0\u4e3a\u6d3b\u8dc3\u7248\u672c"),
        numberedItem(3, "Java \u5ba2\u6237\u7aef\u542f\u52a8\u65f6\uff0c\u643a\u5e26 API \u5bc6\u94a5\u8c03\u7528 GET /api/client?encrypt=true"),
        numberedItem(4, "\u4e91\u63a7\u540e\u7aef\u9a8c\u8bc1 API \u5bc6\u94a5\u540e\uff0c\u4f7f\u7528 AES-128-CBC \u52a0\u5bc6\u914d\u7f6e\u5185\u5bb9\uff0c\u8fd4\u56de\u5bc6\u6587 + IV"),
        numberedItem(5, "\u5ba2\u6237\u7aef\u4f7f\u7528\u9884\u5171\u4eab\u7684 AES \u5bc6\u94a5\u89e3\u5bc6\uff0c\u5f97\u5230\u660e\u6587 YAML \u914d\u7f6e"),
        numberedItem(6, "\u5ba2\u6237\u7aef\u5c06\u52a0\u5bc6\u540e\u7684\u914d\u7f6e\u5199\u5165\u672c\u5730\u7f13\u5b58\u6587\u4ef6 .mcpatch-config.enc"),
        numberedItem(7, "\u4e0b\u6b21\u542f\u52a8\u65f6\uff0c\u4f18\u5148\u4f7f\u7528\u672c\u5730\u7f13\u5b58\uff0c\u82e5\u7f13\u5b58\u8fc7\u671f\u6216\u4e0d\u5b58\u5728\u5219\u91cd\u65b0\u62c9\u53d6"),

        // ════════════════════════════════════════════
        // 三、后端现状分析
        // ════════════════════════════════════════════
        heading("\u4e09\u3001\u540e\u7aef\u73b0\u72b6\u5206\u6790"),

        heading("3.1 \u5df2\u6709\u80fd\u529b", HeadingLevel.HEADING_2),

        body("\u4e91\u63a7\u540e\u7aef\u7684 `/api/client` \u63a5\u53e3\u5df2\u5b8c\u6574\u5b9e\u73b0\u4ee5\u4e0b\u529f\u80fd\uff1a"),

        bullet("API \u5bc6\u94a5\u8ba4\u8bc1\uff08Authorization: Bearer header\uff09"),
        bullet("AES-128-CBC \u52a0\u5bc6\u54cd\u5e94\uff08encrypt=true \u53c2\u6570\u89e6\u53d1\uff09"),
        bullet("RSA-SHA256 \u914d\u7f6e\u7b7e\u540d\uff08X-Config-Signature \u54cd\u5e94\u5934\uff09"),
        bullet("HMAC-SHA256 \u8bf7\u6c42\u7b7e\u540d\u9a8c\u8bc1\uff08\u9632\u6b62 API \u88ab\u76f4\u63a5\u8c03\u7528\uff09"),
        bullet("\u65f6\u95f4\u6233\u9632\u91cd\u653e\u653b\u51fb\uff085 \u5206\u949f\u65f6\u95f4\u7a97\u53e3\uff09"),
        bullet("\u5ba2\u6237\u7aef\u62c9\u53d6\u65e5\u5fd7\u8bb0\u5f55\uff08IP\u3001User-Agent\u3001\u914d\u7f6e\u7248\u672c\u3001\u65f6\u95f4\uff09"),
        bullet("\u914d\u7f6e\u7248\u672c\u7ba1\u7406\uff08\u591a\u7248\u672c\u5171\u5b58\uff0c\u6807\u8bb0\u6d3b\u8dc3\u7248\u672c\uff09"),
        bullet("\u5bc6\u94a5\u788e\u7247\u5316\u5b58\u50a8\uff08AES \u5bc6\u94a5\u62c6\u5206\u4e3a 3 \u4e2a XOR \u788e\u7247\uff0c\u8fd0\u884c\u65f6\u52a8\u6001\u8fd8\u539f\uff09"),

        heading("3.2 \u52a0\u5bc6\u63a5\u53e3\u8bf4\u660e", HeadingLevel.HEADING_2),

        body("\u5f53\u5ba2\u6237\u7aef\u8bf7\u6c42 GET /api/client?encrypt=true \u65f6\uff0c\u540e\u7aef\u8fd4\u56de\uff1a"),

        bulletBold("Body: ", "Base64 \u7f16\u7801\u7684 AES-128-CBC \u5bc6\u6587\uff08application/octet-stream\uff09"),
        bulletBold("X-AES-IV: ", "\u5341\u516d\u8fdb\u5236\u7f16\u7801\u7684\u521d\u59cb\u5316\u5411\u91cf\uff0816 \u5b57\u8282\uff09"),
        bulletBold("X-AES-Fingerprint: ", "AES \u5bc6\u94a5\u7684 SHA-256 \u6307\u7eb9\uff0c\u5ba2\u6237\u7aef\u53ef\u7528\u4e8e\u9a8c\u8bc1\u5bc6\u94a5\u4e00\u81f4\u6027"),
        bulletBold("X-Config-Version: ", "\u5f53\u524d\u914d\u7f6e\u7248\u672c\u53f7"),
        bulletBold("X-Config-Signature: ", "RSA-SHA256 \u7b7e\u540d\uff08\u53ef\u9009\u9a8c\u8bc1\uff09"),
        body("\u6ce8\uff1aAES \u5bc6\u94a5\u4e0d\u901a\u8fc7\u54cd\u5e94\u5934\u4f20\u8f93\uff0c\u5ba2\u6237\u7aef\u9700\u8981\u9884\u5171\u4eab\u6b64\u5bc6\u94a5\u3002"),

        // ════════════════════════════════════════════
        // 四、Java 客户端改造方案
        // ════════════════════════════════════════════
        heading("\u56db\u3001Java \u5ba2\u6237\u7aef\u6539\u9020\u65b9\u6848"),

        heading("4.1 \u65b0\u589e\u6587\u4ef6\u6e05\u5355", HeadingLevel.HEADING_2),

        body("\u9700\u8981\u65b0\u589e\u4ee5\u4e0b Java \u6e90\u6587\u4ef6\u5230 com.github.balloonupdate.mcpatch.client \u5305\u4e2d\uff1a"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u6587\u4ef6", "\u7528\u9014"], true, [40, 60]),
            makeRow(["CloudConfigFetcher.java", "\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u5668\uff0c\u8d1f\u8d23 HTTP \u8bf7\u6c42\u3001\u89e3\u5bc6\u3001\u7f13\u5b58"], false, [40, 60]),
            makeRow(["CloudCrypto.java", "\u52a0\u5bc6\u89e3\u5bc6\u5de5\u5177\u7c7b\uff0c\u5b9e\u73b0 AES-128-CBC \u89e3\u5bc6\u548c RSA \u7b7e\u540d\u9a8c\u8bc1"], false, [40, 60]),
          ]
        }),

        heading("4.2 CloudConfigFetcher.java \u8bbe\u8ba1", HeadingLevel.HEADING_2),

        bodyNoIndent("\u6838\u5fc3\u804c\u8d23\uff1a"),
        numberedItem(1, "\u5411\u4e91\u63a7\u540e\u7aef\u53d1\u8d77 HTTPS GET \u8bf7\u6c42\uff08\u643a\u5e26 API \u5bc6\u94a5\uff09"),
        numberedItem(2, "\u63a5\u6536\u52a0\u5bc6\u54cd\u5e94\uff0c\u63d0\u53d6 IV \u548c\u5bc6\u6587"),
        numberedItem(3, "\u8c03\u7528 CloudCrypto \u89e3\u5bc6\u914d\u7f6e"),
        numberedItem(4, "\u5c06\u52a0\u5bc6\u914d\u7f6e\u7f13\u5b58\u5230\u672c\u5730 .mcpatch-config.enc"),
        numberedItem(5, "\u79bb\u7ebf\u65f6\u4ece\u672c\u5730\u7f13\u5b58\u89e3\u5bc6\u8bfb\u53d6"),

        new Paragraph({ spacing: { before: 200 } }),
        bodyNoIndent("\u914d\u7f6e\u9879\uff08\u5d4c\u5165 mcpatch.yml \u7684 cloud-config \u6bb5\uff09\uff1a"),
        codeBlockNoIndent("enabled: true/false\uff08\u662f\u5426\u542f\u7528\u4e91\u7aef\u914d\u7f6e\uff09"),
        codeBlockNoIndent("api-url: \u4e91\u63a7\u540e\u7aef\u5730\u5740\uff08\u5982 https://auth-config.mxzysoa.com/api/client\uff09"),
        codeBlockNoIndent("api-key: API \u8bbf\u95ee\u5bc6\u94a5"),
        codeBlockNoIndent("aes-key: \u9884\u5171\u4eab\u7684 AES-128 \u5bc6\u94a5\uff0832 \u4f4d\u5341\u516d\u8fdb\u5236\u5b57\u7b26\u4e32\uff09"),
        codeBlockNoIndent("cache-file: \u672c\u5730\u7f13\u5b58\u6587\u4ef6\u8def\u5f84\uff08\u9ed8\u8ba4 .mcpatch-config.enc\uff09"),
        codeBlockNoIndent("cache-ttl: \u7f13\u5b58\u6709\u6548\u671f\uff08\u79d2\uff0c\u9ed8\u8ba4 3600\uff09"),
        codeBlockNoIndent("fallback-local: \u4e91\u7aef\u4e0d\u53ef\u7528\u65f6\u662f\u5426\u56de\u9000\u5230\u672c\u5730 mcpatch.yml"),

        heading("4.3 CloudCrypto.java \u8bbe\u8ba1", HeadingLevel.HEADING_2),

        bodyNoIndent("\u6838\u5fc3\u804c\u8d23\uff1a"),
        numberedItem(1, "AES-128-CBC \u89e3\u5bc6\uff1a\u4f7f\u7528 javax.crypto.Cipher\uff0c\u63a5\u6536 Base64 \u5bc6\u6587 + Hex IV + Hex Key"),
        numberedItem(2, "RSA-SHA256 \u7b7e\u540d\u9a8c\u8bc1\uff1a\u4f7f\u7528 java.security.Signature\uff0c\u9a8c\u8bc1\u914d\u7f6e\u5b8c\u6574\u6027"),
        numberedItem(3, "AES \u5bc6\u94a5\u6307\u7eb9\u6821\u9a8c\uff1a\u8ba1\u7b97\u672c\u5730\u5bc6\u94a5\u7684 SHA-256 \u6307\u7eb9\uff0c\u4e0e\u670d\u52a1\u5668\u8fd4\u56de\u7684 X-AES-Fingerprint \u6bd4\u5bf9"),

        body("\u4f9d\u8d56\uff1a\u4ec5\u9700 JDK \u6807\u51c6\u5e93\uff08javax.crypto\u3001java.security\uff09\uff0c\u65e0\u9700\u7b2c\u4e09\u65b9\u52a0\u5bc6\u5e93\u3002"),

        heading("4.4 \u542f\u52a8\u6d41\u7a0b\u6539\u9020", HeadingLevel.HEADING_2),

        body("\u6539\u9020 Main.java / AppConfig.java \u7684\u542f\u52a8\u6d41\u7a0b\uff1a"),

        numberedItem(1, "\u8bfb\u53d6\u5185\u7f6e mcpatch.yml\uff08\u5305\u542b cloud-config \u8fde\u63a5\u53c2\u6570\uff09"),
        numberedItem(2, "\u5982\u679c cloud-config.enabled == true\uff1a"),
        bodyNoIndent("   a. \u5c1d\u8bd5\u4ece\u4e91\u7aef\u62c9\u53d6\u52a0\u5bc6\u914d\u7f6e", ),
        bodyNoIndent("   b. \u89e3\u5bc6\u540e\u89e3\u6790 YAML\uff0c\u5f97\u5230\u5b8c\u6574\u7684\u8fd0\u884c\u65f6\u914d\u7f6e\uff08urls\u3001\u8d85\u65f6\u7b49\uff09", ),
        bodyNoIndent("   c. \u5c06\u52a0\u5bc6\u6570\u636e\u7f13\u5b58\u5230\u672c\u5730", ),
        numberedItem(3, "\u5982\u679c\u4e91\u7aef\u4e0d\u53ef\u7528\u4e14 fallback-local == true\uff1a"),
        bodyNoIndent("   a. \u5c1d\u8bd5\u8bfb\u53d6\u672c\u5730 .mcpatch-config.enc \u7f13\u5b58"),
        bodyNoIndent("   b. \u89e3\u5bc6\u5e76\u4f7f\u7528\u7f13\u5b58\u914d\u7f6e"),
        numberedItem(4, "\u5982\u679c\u7f13\u5b58\u4e5f\u4e0d\u5b58\u5728\uff1a"),
        bodyNoIndent("   a. \u56de\u9000\u5230\u672c\u5730 mcpatch.yml\uff08\u4f20\u7edf\u6a21\u5f0f\uff09"),
        numberedItem(5, "\u4f7f\u7528\u6700\u7ec8\u5f97\u5230\u7684\u914d\u7f6e\u7ee7\u7eed\u539f\u6709\u7684\u66f4\u65b0\u6d41\u7a0b"),

        heading("4.5 \u914d\u7f6e\u5b89\u5168\u6027\u8bbe\u8ba1", HeadingLevel.HEADING_2),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u5b89\u5168\u5a01\u80c1", "\u9632\u62a4\u63aa\u65bd"], true, [35, 65]),
            makeRow(["\u914d\u7f6e\u5728\u4f20\u8f93\u4e2d\u88ab\u7a83\u542c", "HTTPS + AES-128-CBC \u53cc\u91cd\u52a0\u5bc6"], false, [35, 65]),
            makeRow(["\u914d\u7f6e\u88ab\u4e2d\u95f4\u4eba\u7be1\u6539", "RSA-SHA256 \u7b7e\u540d\u9a8c\u8bc1"], false, [35, 65]),
            makeRow(["API \u88ab\u7b2c\u4e09\u65b9\u76f4\u63a5\u8c03\u7528", "HMAC-SHA256 \u8bf7\u6c42\u7b7e\u540d + API \u5bc6\u94a5"], false, [35, 65]),
            makeRow(["\u7528\u6237\u8bfb\u53d6\u672c\u5730\u914d\u7f6e", "\u672c\u5730\u7f13\u5b58\u4e3a AES \u52a0\u5bc6\u7684\u4e8c\u8fdb\u5236\u6587\u4ef6"], false, [35, 65]),
            makeRow(["\u7528\u6237\u7be1\u6539\u672c\u5730\u7f13\u5b58", "\u7be1\u6539\u540e\u89e3\u5bc6\u5931\u8d25\uff0c\u81ea\u52a8\u56de\u9000\u5230\u4e91\u7aef\u91cd\u65b0\u62c9\u53d6"], false, [35, 65]),
            makeRow(["\u91cd\u653e\u653b\u51fb", "\u65f6\u95f4\u6233\u9a8c\u8bc1\uff085 \u5206\u949f\u7a97\u53e3\uff09+ \u7b7e\u540d\u53bb\u91cd"], false, [35, 65]),
            makeRow(["\u5bc6\u94a5\u6cc4\u9732", "\u5bc6\u94a5\u5d4c\u5165 JAR\uff08\u7f16\u8bd1\u65f6\u56fa\u5316\uff09\uff0c\u914d\u5408\u4ee3\u7801\u6df7\u6dc6\u589e\u52a0\u9006\u5411\u96be\u5ea6"], false, [35, 65]),
          ]
        }),

        // ════════════════════════════════════════════
        // 五、mcpatch.yml 配置示例
        // ════════════════════════════════════════════
        heading("\u4e94\u3001mcpatch.yml \u914d\u7f6e\u793a\u4f8b"),

        codeBlockNoIndent("# \u4e91\u7aef\u914d\u7f6e\u8fde\u63a5\u53c2\u6570\uff08\u5d4c\u5165 JAR\uff0c\u7528\u6237\u4e0d\u53ef\u89c1\uff09"),
        codeBlockNoIndent("cloud-config:"),
        codeBlockNoIndent("  enabled: true"),
        codeBlockNoIndent("  api-url: \"https://auth-config.mxzysoa.com/api/client\""),
        codeBlockNoIndent("  api-key: \"your-api-key-here\""),
        codeBlockNoIndent("  aes-key: \"0123456789abcdef0123456789abcdef\""),
        codeBlockNoIndent("  cache-file: \".mcpatch-config.enc\""),
        codeBlockNoIndent("  cache-ttl: 3600"),
        codeBlockNoIndent("  fallback-local: true"),
        codeBlockNoIndent(""),
        codeBlockNoIndent("# \u4ee5\u4e0b\u914d\u7f6e\u7531\u4e91\u7aef\u4e0b\u53d1\uff0c\u672c\u5730\u4e0d\u518d\u9700\u8981\u586b\u5199"),
        codeBlockNoIndent("# urls:"),
        codeBlockNoIndent("#   - mcpatch://127.0.0.1:6700"),
        codeBlockNoIndent("# version-file-path: version-label.txt"),
        codeBlockNoIndent("# ... \u5176\u4ed6\u539f\u6709\u914d\u7f6e\u9879\u7531\u4e91\u7aef\u7ba1\u7406"),

        // ════════════════════════════════════════════
        // 六、云控面板管理流程
        // ════════════════════════════════════════════
        heading("\u516d\u3001\u4e91\u63a7\u9762\u677f\u7ba1\u7406\u6d41\u7a0b"),

        numberedItem(1, "\u7ba1\u7406\u5458\u767b\u5f55\u4e91\u63a7\u9762\u677f\uff08Casdoor SSO \u8ba4\u8bc1\uff09"),
        numberedItem(2, "\u9996\u6b21\u4f7f\u7528\u9700\u5b8c\u6210\u5b89\u5168\u521d\u59cb\u5316\uff08\u751f\u6210 RSA \u5bc6\u94a5\u5bf9\u3001HMAC \u5bc6\u94a5\u3001AES \u5bc6\u94a5\uff09"),
        numberedItem(3, "\u5728\u300c\u914d\u7f6e\u7ba1\u7406\u300d\u6807\u7b7e\u9875\u521b\u5efa\u65b0\u914d\u7f6e\u7248\u672c\uff0c\u7c98\u8d34 mcpatch.yml \u5185\u5bb9"),
        numberedItem(4, "\u5c06\u65b0\u7248\u672c\u6807\u8bb0\u4e3a\u300c\u6d3b\u8dc3\u300d"),
        numberedItem(5, "\u6240\u6709\u5ba2\u6237\u7aef\u4e0b\u6b21\u62c9\u53d6\u65f6\u81ea\u52a8\u83b7\u53d6\u6700\u65b0\u914d\u7f6e"),
        numberedItem(6, "\u901a\u8fc7\u300c\u62c9\u53d6\u65e5\u5fd7\u300d\u67e5\u770b\u54ea\u4e9b\u5ba2\u6237\u7aef\u5df2\u62c9\u53d6\u65b0\u914d\u7f6e"),
        numberedItem(7, "\u901a\u8fc7\u300c\u4eea\u8868\u76d8\u300d\u67e5\u770b\u62c9\u53d6\u7edf\u8ba1\u548c\u8d8b\u52bf"),

        // ════════════════════════════════════════════
        // 七、部署步骤
        // ════════════════════════════════════════════
        heading("\u4e03\u3001\u90e8\u7f72\u6b65\u9aa4"),

        heading("7.1 \u4e91\u63a7\u540e\u7aef\u90e8\u7f72\uff08\u5df2\u5b8c\u6210\uff09", HeadingLevel.HEADING_2),

        bullet("\u5df2\u90e8\u7f72\u5728 https://auth-config.mxzysoa.com"),
        bullet("\u5df2\u5b8c\u6210\u5b89\u5168\u521d\u59cb\u5316\uff08RSA/HMAC/AES \u5bc6\u94a5\u5df2\u751f\u6210\u5e76\u788e\u7247\u5316\u5b58\u50a8\uff09"),
        bullet("\u5df2\u914d\u7f6e Casdoor SSO \u8ba4\u8bc1"),
        bullet("API \u63a5\u53e3\u5df2\u5c31\u7eea"),

        heading("7.2 Java \u5ba2\u6237\u7aef\u6539\u9020\u6b65\u9aa4", HeadingLevel.HEADING_2),

        numberedItem(1, "\u5728 Mcpatch2JavaClient \u9879\u76ee\u4e2d\u521b\u5efa CloudConfigFetcher.java \u548c CloudCrypto.java"),
        numberedItem(2, "\u4fee\u6539 Main.java\uff0c\u5728 AppMain() \u5f00\u5934\u63d2\u5165\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u903b\u8f91"),
        numberedItem(3, "\u4fee\u6539 AppConfig.java\uff0c\u589e\u52a0 cloud-config \u6bb5\u7684\u89e3\u6790"),
        numberedItem(4, "\u5728\u5185\u7f6e mcpatch.yml \u4e2d\u6dfb\u52a0 cloud-config \u8fde\u63a5\u53c2\u6570"),
        numberedItem(5, "\u7f16\u8bd1\u6253\u5305\uff1a./gradlew shadowJar \u2192 \u751f\u6210 Mcpatch-{version}.jar"),
        numberedItem(6, "\u6d4b\u8bd5\u9a8c\u8bc1"),

        heading("7.3 \u6d4b\u8bd5\u9a8c\u8bc1\u6e05\u5355", HeadingLevel.HEADING_2),

        bullet("\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u6b63\u5e38\uff0c\u89e3\u5bc6\u6210\u529f"),
        bullet("\u672c\u5730\u7f13\u5b58\u6587\u4ef6 .mcpatch-config.enc \u4e3a\u4e8c\u8fdb\u5236\u52a0\u5bc6\u6587\u4ef6\uff0c\u65e0\u6cd5\u76f4\u63a5\u8bfb\u53d6"),
        bullet("\u4e91\u7aef\u4e0d\u53ef\u7528\u65f6\uff0c\u7f13\u5b58\u914d\u7f6e\u53ef\u6b63\u5e38\u89e3\u5bc6\u4f7f\u7528"),
        bullet("\u4e91\u7aef\u548c\u7f13\u5b58\u90fd\u4e0d\u53ef\u7528\u65f6\uff0c\u6b63\u786e\u56de\u9000\u5230\u672c\u5730 mcpatch.yml"),
        bullet("API \u5bc6\u94a5\u65e0\u6548\u65f6\uff0c\u8fd4\u56de 403 \u9519\u8bef\u5e76\u56de\u9000"),
        bullet("\u914d\u7f6e\u7248\u672c\u66f4\u65b0\u540e\uff0c\u5ba2\u6237\u7aef\u53ef\u62c9\u53d6\u5230\u6700\u65b0\u7248\u672c"),
        bullet("\u591a\u5ba2\u6237\u7aef\u5e76\u53d1\u62c9\u53d6\u6b63\u5e38"),

        // ════════════════════════════════════════════
        // 八、风险与应对
        // ════════════════════════════════════════════
        heading("\u516b\u3001\u98ce\u9669\u4e0e\u5e94\u5bf9"),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u98ce\u9669", "\u5f71\u54cd", "\u5e94\u5bf9\u63aa\u65bd"], true, [20, 25, 55]),
            makeRow(["\u4e91\u63a7\u540e\u7aef\u5b95\u673a", "\u5ba2\u6237\u7aef\u65e0\u6cd5\u83b7\u53d6\u6700\u65b0\u914d\u7f6e", "\u672c\u5730\u7f13\u5b58 + \u56de\u9000\u5230\u672c\u5730\u6587\u4ef6"], false, [20, 25, 55]),
            makeRow(["AES \u5bc6\u94a5\u6cc4\u9732", "\u653b\u51fb\u8005\u53ef\u89e3\u5bc6\u7f13\u5b58\u914d\u7f6e", "\u5bc6\u94a5\u5d4c\u5165 JAR + ProGuard/R8 \u6df7\u6dc6"], false, [20, 25, 55]),
            makeRow(["\u7528\u6237\u53cd\u7f16\u8bd1 JAR \u63d0\u53d6\u5bc6\u94a5", "\u914d\u7f6e\u88ab\u89e3\u5bc6", "R8 \u6df7\u6dc6 + \u5b57\u7b26\u4e32\u52a0\u5bc6 + \u670d\u52a1\u7aef\u53ef\u968f\u65f6\u8f6e\u6362\u5bc6\u94a5"], false, [20, 25, 55]),
            makeRow(["\u7f51\u7edc\u5ef6\u8fdf\u5f71\u54cd\u542f\u52a8\u901f\u5ea6", "\u5ba2\u6237\u7aef\u542f\u52a8\u53d8\u6162", "\u5f02\u6b65\u62c9\u53d6 + \u7f13\u5b58\u4f18\u5148 + \u8d85\u65f6\u5feb\u901f\u56de\u9000"], false, [20, 25, 55]),
            makeRow(["\u914d\u7f6e\u683c\u5f0f\u9519\u8bef", "\u5ba2\u6237\u7aef\u89e3\u6790\u5931\u8d25", "\u4e91\u63a7\u9762\u677f\u53d1\u5e03\u65f6\u683c\u5f0f\u6821\u9a8c + \u5ba2\u6237\u7aef\u5f02\u5e38\u6355\u83b7"], false, [20, 25, 55]),
          ]
        }),

      ] // end children
    } // end section
  ] // end sections
});

// ── Write to file ──
const OUTPUT = "/home/z/my-project/download/mcpatch2-cloud-integration-plan.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log(`Document generated: ${OUTPUT}`);
  const stats = fs.statSync(OUTPUT);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
