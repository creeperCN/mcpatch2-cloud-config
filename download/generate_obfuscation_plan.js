const { Document, Packer, Paragraph, TextRun, Header, Footer,
        AlignmentType, HeadingLevel, PageNumber, Table, TableRow, TableCell,
        WidthType, BorderStyle, ShadingType } = require("docx");
const fs = require("fs");

// DM-1 palette for tech/security doc
const P = {
  primary: "0A1628", body: "000000", secondary: "5A6080",
  accent: "37DCF2", surface: "F0F6FA"
};
const c = (hex) => hex.replace("#", "");
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 480 : 320, after: 160 },
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: level === HeadingLevel.HEADING_1 ? 32 : 28 })]
  });
}

function h3(text) {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 26 })]
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 420 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function boldBody(label, text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 420 },
    spacing: { line: 312, after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function codeBlock(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 480 },
    spacing: { line: 276, after: 60 },
    shading: { type: ShadingType.CLEAR, fill: "F5F7FA" },
    children: [new TextRun({ text, size: 20, color: "2C3E50", font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" } })]
  });
}

function bullet(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 720, hanging: 240 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: "\u2022 ", size: 22, color: c(P.accent), font: { ascii: "Calibri" } }),
      new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function bulletBold(label, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    indent: { left: 720, hanging: 240 },
    spacing: { line: 312, after: 60 },
    children: [
      new TextRun({ text: "\u2022 ", size: 22, color: c(P.accent), font: { ascii: "Calibri" } }),
      new TextRun({ text: label, bold: true, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function makeRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map(text => new TableCell({
      children: [new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({ text, bold: isHeader, size: 20, color: isHeader ? "FFFFFF" : c(P.body), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
      })],
      shading: isHeader ? { type: ShadingType.CLEAR, fill: c(P.primary) } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: "D0D8E0" },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: "D0D8E0" },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE }
      },
      margins: { top: 60, bottom: 60, left: 120, right: 120 }
    }))
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 22, color: c(P.body) },
        paragraph: { spacing: { line: 312 } }
      }
    }
  },
  sections: [
    // Cover section
    {
      properties: {
        page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } },
        size: { width: 11906, height: 16838 }
      },
      children: [
        new Paragraph({ spacing: { before: 4000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 16 } },
          indent: { left: 2400, right: 2400 },
          children: [new TextRun({ text: "Mcpatch2JavaClient", size: 52, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
        }),
        new Paragraph({ spacing: { before: 300 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          indent: { left: 2400, right: 2400 },
          children: [new TextRun({ text: "\u4ee3\u7801\u6df7\u6dc6\u4e0e\u53cd\u7834\u89e3\u65b9\u6848", size: 44, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          indent: { left: 2400, right: 2400 },
          children: [new TextRun({ text: "\u2014\u2014 \u9632\u9274\u6743\u673a\u5236\u4fdd\u62a4\u4e13\u9879\u65b9\u6848", size: 28, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        }),
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u57fa\u4e8e ProGuard + \u5b57\u7b26\u4e32\u52a0\u5bc6 + \u5b57\u8282\u7801\u6df7\u6dc6 + \u53cd\u7be1\u6539\u591a\u5c42\u9632\u5fa1\u4f53\u7cfb", size: 22, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "2026-04-29  |  \u5185\u90e8\u6280\u672f\u6587\u6863  |  \u673a\u5bc6", size: 20, color: "999999", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
        }),
      ]
    },
    // Body section
    {
      properties: {
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 } }
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" } },
            spacing: { before: 100 },
            children: [
              new TextRun({ text: "Mcpatch2JavaClient \u4ee3\u7801\u6df7\u6dc6\u65b9\u6848  |  \u673a\u5bc6", size: 16, color: "999999", font: { ascii: "Calibri" } }),
              new TextRun({ text: "  |  ", size: 16, color: "CCCCCC" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999" })
            ]
          })]
        })
      },
      children: [
        // ===== 1. 项目概述 =====
        heading("\u4e00\u3001\u9879\u76ee\u6982\u8ff0\u4e0e\u653b\u51fb\u9762\u5206\u6790"),
        body("Mcpatch2JavaClient \u662f\u4e00\u4e2a\u57fa\u4e8e Java \u5f00\u53d1\u7684 Minecraft \u8d44\u6e90\u6587\u4ef6\u81ea\u52a8\u66f4\u65b0\u5ba2\u6237\u7aef\uff0c\u91c7\u7528 Gradle + ShadowJar \u6784\u5efa\uff0c\u6700\u7ec8\u6253\u5305\u4e3a\u4e00\u4e2a\u542b\u6709\u6240\u6709\u4f9d\u8d56\u7684 Fat JAR \u6587\u4ef6\u3002\u8be5\u5ba2\u6237\u7aef\u652f\u6301 HTTP/HTTPS\u3001WebDAV\u3001Alist\u3001\u79c1\u6709\u534f\u8bae\u7b49\u591a\u79cd\u4e0b\u8f7d\u534f\u8bae\uff0c\u5177\u5907\u591a\u7ebf\u7a0b\u5e76\u884c\u4e0b\u8f7d\u3001\u5206\u7247\u4e0b\u8f7d\u3001\u6587\u4ef6\u54c8\u5e0c\u6821\u9a8c\u7b49\u529f\u80fd\u3002\u5176\u4e2d\u6700\u6838\u5fc3\u7684\u5b89\u5168\u673a\u5236\u662f\u57fa\u4e8e\u963f\u91cc\u4e91 ESA A \u65b9\u6848\u7684\u9632\u76d7\u94fe\u9274\u6743\u7cfb\u7edf\uff0c\u7528\u4e8e\u9632\u6b62\u6076\u610f\u53cd\u590d\u4e0b\u8f7d\u8d44\u6e90\u6587\u4ef6\u3002"),
        body("\u5f53\u524d\u9879\u76ee\u4f5c\u4e3a\u5f00\u6e90\u9879\u76ee\u516c\u5f00\u5728 GitHub \u4e0a\uff0c\u6240\u6709\u6e90\u7801\u5747\u53ef\u88ab\u4efb\u610f\u67e5\u770b\u3002\u5982\u679c\u4e0d\u505a\u4efb\u4f55\u4fdd\u62a4\u63aa\u65bd\uff0c\u653b\u51fb\u8005\u53ef\u4ee5\u901a\u8fc7\u53cd\u7f16\u8bd1 JAR \u6587\u4ef6\u3001\u7be1\u6539\u914d\u7f6e\u3001\u4fee\u6539\u5b57\u8282\u7801\u7b49\u65b9\u5f0f\u8f7b\u677e\u7ed5\u8fc7\u9274\u6743\u673a\u5236\uff0c\u5bfc\u81f4\u8d44\u6e90\u6587\u4ef6\u88ab\u76d7\u7528\u3001\u670d\u52a1\u5668\u5e26\u5bbd\u88ab\u6076\u610f\u6d88\u8017\u7b49\u4e25\u91cd\u540e\u679c\u3002\u56e0\u6b64\uff0c\u5728\u53d1\u5e03\u6b63\u5f0f\u7248\u672c\u524d\uff0c\u5fc5\u987b\u5bf9\u4ee3\u7801\u8fdb\u884c\u5168\u9762\u7684\u6df7\u6dc6\u548c\u53cd\u7834\u89e3\u5904\u7406\u3002"),

        heading("1.1 \u9879\u76ee\u6280\u672f\u6808", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u7c7b\u522b", "\u6280\u672f", "\u7248\u672c"], true),
            makeRow(["\u8bed\u8a00", "Java", "8+"]),
            makeRow(["\u6784\u5efa\u5de5\u5177", "Gradle + ShadowJar", "8.3.6"]),
            makeRow(["HTTP \u5ba2\u6237\u7aef", "OkHttp", "4.12.0"]),
            makeRow(["JSON \u89e3\u6790", "org.json", "20231013"]),
            makeRow(["WebDAV", "Sardine", "5.12"]),
            makeRow(["UI \u4e3b\u9898", "FlatLaf", "2.6"]),
            makeRow(["\u914d\u7f6e\u89e3\u6790", "SnakeYAML", "2.0"]),
          ]
        }),

        heading("1.2 \u9274\u6743\u6d41\u7a0b\u8be6\u89e3\uff08\u91cd\u70b9\u4fdd\u62a4\u76ee\u6807\uff09", HeadingLevel.HEADING_2),
        body("\u5f53\u524d\u9274\u6743\u7cfb\u7edf\u7684\u6838\u5fc3\u5de5\u4f5c\u6d41\u7a0b\u5982\u4e0b\uff1a\u7a0b\u5e8f\u4ece mcpatch.yml \u914d\u7f6e\u6587\u4ef6\u4e2d\u8bfb\u53d6 anti-hotlink-enabled\u3001anti-hotlink-auth-url\u3001anti-hotlink-expire-time\u3001anti-hotlink-uid \u7b49\u914d\u7f6e\u9879\uff1b\u5982\u679c\u542f\u7528\u9632\u76d7\u94fe\uff0cServers \u7c7b\u4f1a\u521b\u5efa AuthKeyService \u5b9e\u4f8b\uff1b\u6bcf\u6b21\u4e0b\u8f7d\u6587\u4ef6\u524d\uff0cHttpProtocol \u4f1a\u8c03\u7528 AuthKeyService.buildAuthUrl() \u5411\u9274\u6743 API \u53d1\u8d77 GET \u8bf7\u6c42\uff0c\u53c2\u6570\u5305\u62ec filePath\u3001expireTime\u3001uid\uff1b\u9274\u6743 API \u8fd4\u56de\u7b26\u5408\u963f\u91cc\u4e91 ESA A \u65b9\u6848\u89c4\u8303\u7684 auth_key\uff08\u683c\u5f0f\u4e3a {timestamp}-{rand}-{uid}-{md5hash}\uff09\uff1b\u6700\u7ec8\u5c06 auth_key \u62fc\u63a5\u5230\u4e0b\u8f7d URL \u4e2d\u5b8c\u6210\u9274\u6743\u3002"),
        body("\u8fd9\u5957\u6d41\u7a0b\u7684\u6838\u5fc3\u4ee3\u7801\u96c6\u4e2d\u5728\u4ee5\u4e0b\u51e0\u4e2a\u6587\u4ef6\u4e2d\uff1aAuthKeyService.java\uff08\u9274\u6743\u6838\u5fc3\u903b\u8f91\uff09\u3001HttpProtocol.java\uff08\u5728 HTTP \u8bf7\u6c42\u4e2d\u6ce8\u5165 auth_key\uff09\u3001AppConfig.java\uff08\u5b58\u50a8\u9274\u6743\u914d\u7f6e\uff09\u3001Servers.java\uff08\u521b\u5efa\u9274\u6743\u670d\u52a1\u5b9e\u4f8b\uff09\u3001mcpatch.yml\uff08\u5916\u90e8\u914d\u7f6e\u6587\u4ef6\uff09\u3002\u8fd9\u4e9b\u6587\u4ef6\u662f\u6df7\u6dc6\u4fdd\u62a4\u7684\u91cd\u4e2d\u4e4b\u91cd\u3002"),

        heading("1.3 \u653b\u51fb\u9762\u5206\u6790", HeadingLevel.HEADING_2),
        bulletBold("\u53cd\u7f16\u8bd1 JAR\uff1a", "\u7528 JD-GUI\u3001CFR\u3001Fernflower \u7b49\u5de5\u5177\u53ef\u4ee5\u8f7b\u677e\u5c06\u5b57\u8282\u7801\u8fd8\u539f\u4e3a\u53ef\u8bfb\u7684 Java \u6e90\u7801\uff0c\u76f4\u63a5\u770b\u5230 auth API URL\u3001auth_key \u683c\u5f0f\u3001\u53c2\u6570\u62fc\u63a5\u903b\u8f91\u7b49\u6240\u6709\u5173\u952e\u4fe1\u606f\u3002"),
        bulletBold("\u4fee\u6539 mcpatch.yml\uff1a", "\u7528\u6237\u53ef\u4ee5\u5c06 anti-hotlink-enabled \u8bbe\u4e3a false \u6765\u5b8c\u5168\u8df3\u8fc7\u9274\u6743\uff0c\u6216\u8005\u4fee\u6539 auth-api-url \u6307\u5411\u81ea\u5df1\u7684\u670d\u52a1\u5668\u3002"),
        bulletBold("\u5b57\u8282\u7801\u7be1\u6539\uff1a", "\u901a\u8fc7\u4fee\u6539\u5b57\u8282\u7801\uff08\u5982\u5c06 if(\u9274\u6743\u5931\u8d25) \u7684\u6761\u4ef6\u53cd\u8f6c\uff09\uff0c\u53ef\u4ee5\u7ed5\u8fc7\u4efb\u4f55\u9274\u6743\u68c0\u67e5\u3002"),
        bulletBold("\u7f51\u7edc\u62e6\u622a\uff1a", "\u901a\u8fc7 MITM Proxy\u3001Charles\u3001Fiddler \u7b49\u5de5\u5177\u62e6\u622a\u9274\u6743\u8bf7\u6c42\u548c\u54cd\u5e94\uff0c\u83b7\u53d6 auth_key \u540e\u53ef\u4ee5\u76f4\u63a5\u4f7f\u7528\u3002"),
        bulletBold("Agent/Hook\uff1a", "\u901a\u8fc7 Java Agent \u6216 ByteBuddy \u52a8\u6001\u4fee\u6539\u8fd0\u884c\u65f6\u5b57\u8282\u7801\uff0c\u5728\u5185\u5b58\u4e2d\u62e6\u622a\u9274\u6743\u7ed3\u679c\u3002"),

        // ===== 2. 混淆方案 =====
        heading("\u4e8c\u3001\u591a\u5c42\u9632\u5fa1\u6df7\u6dc6\u65b9\u6848\uff08\u516d\u5c42\u4fdd\u62a4\u4f53\u7cfb\uff09"),
        body("\u672c\u65b9\u6848\u91c7\u7528\u5206\u5c42\u9632\u5fa1\u601d\u8def\uff0c\u4ece\u5b57\u8282\u7801\u5c42\u3001\u5b57\u7b26\u4e32\u5c42\u3001\u63a7\u5236\u6d41\u5c42\u3001\u914d\u7f6e\u5c42\u3001\u8fd0\u884c\u65f6\u5c42\u3001\u7f51\u7edc\u5c42\u516d\u4e2a\u7ef4\u5ea6\u8fdb\u884c\u5168\u65b9\u4f4d\u4fdd\u62a4\u3002\u6bcf\u4e00\u5c42\u90fd\u589e\u52a0\u653b\u51fb\u8005\u7684\u7834\u89e3\u6210\u672c\uff0c\u5373\u4f7f\u7a81\u7834\u4e86\u5176\u4e2d\u4e00\u5c42\uff0c\u4ecd\u7136\u9700\u8981\u5e94\u5bf9\u5176\u4ed6\u5c42\u7684\u9632\u5fa1\u3002\u8fd9\u79cd\u6df1\u5ea6\u9632\u5fa1\u7b56\u7565\u53ef\u4ee5\u6709\u6548\u9632\u6b62\u7edd\u5927\u591a\u6570\u975e\u4e13\u4e1a\u653b\u51fb\u8005\u7684\u7834\u89e3\u5c1d\u8bd5\uff0c\u5e76\u5927\u5e45\u63d0\u9ad8\u4e13\u4e1a\u653b\u51fb\u8005\u7684\u7834\u89e3\u95e8\u69db\u3002"),

        heading("2.1 \u7b2c\u4e00\u5c42\uff1a\u5b57\u8282\u7801\u6df7\u6dc6\uff08ProGuard\uff09", HeadingLevel.HEADING_2),
        body("ProGuard \u662f Java \u751f\u6001\u4e2d\u6700\u6210\u719f\u3001\u6700\u5e7f\u6cdb\u4f7f\u7528\u7684\u5b57\u8282\u7801\u6df7\u6dc6\u5de5\u5177\uff0c\u5b83\u53ef\u4ee5\u5bf9\u7c7b\u540d\u3001\u65b9\u6cd5\u540d\u3001\u5b57\u6bb5\u540d\u8fdb\u884c\u65e0\u610f\u4e49\u91cd\u547d\u540d\uff0c\u540c\u65f6\u79fb\u9664\u672a\u4f7f\u7528\u7684\u4ee3\u7801\u548c\u8c03\u8bd5\u4fe1\u606f\uff0c\u8ba9\u53cd\u7f16\u8bd1\u540e\u7684\u4ee3\u7801\u51e0\u4e4e\u65e0\u6cd5\u9605\u8bfb\u3002\u8fd9\u662f\u6574\u4e2a\u6df7\u6dc6\u65b9\u6848\u7684\u57fa\u7840\uff0c\u5fc5\u987b\u4f5c\u4e3a\u6784\u5efa\u6d41\u7a0b\u4e2d\u7684\u5fc5\u8981\u73af\u8282\u96c6\u6210\u3002"),
        h3("2.1.1 Gradle \u96c6\u6210\u65b9\u5f0f"),
        body("\u5728 build.gradle.kts \u4e2d\u6dfb\u52a0 ProGuard \u63d2\u4ef6\u548c\u6df7\u6dc6\u914d\u7f6e\u3002\u5efa\u8bae\u4f7f\u7528 com.guardsquare:proguard-gradle \u63d2\u4ef6\uff0c\u5728 ShadowJar \u4efb\u52a1\u4e4b\u524d\u6267\u884c\u6df7\u6dc6\u3002\u6838\u5fc3\u914d\u7f6e\u5982\u4e0b\uff1a"),
        codeBlock("buildscript { dependencies { classpath('com.guardsquare:proguard-gradle:7.4.2') } }"),
        codeBlock("plugins { id('com.guardsquare.proguard') }"),
        body("\u9700\u8981\u914d\u7f6e\u7684\u5173\u952e\u89c4\u5219\u5305\u62ec\uff1a-keep class com.github.balloonupdate.mcpatch.client.Main \u4fdd\u7559\u5165\u53e3\u7c7b\uff0c\u56e0\u4e3a\u5b83\u662f Main-Class \u548c Premain-Class\uff1b-keepattributes Signature \u4fdd\u7559\u6cdb\u578b\u4fe1\u606f\u4ee5\u907f\u514d\u8fd0\u884c\u65f6\u5d29\u6e83\uff1b-keepattributes InnerClasses \u4fdd\u7559\u5185\u90e8\u7c7b\u4fe1\u606f\uff1b-keep class org.yaml.snakeyaml.** { *; } \u4fdd\u7559 SnakeYAML \u5e93\u7684\u6240\u6709\u516c\u5f00 API\uff0c\u56e0\u4e3a\u914d\u7f6e\u89e3\u6790\u4f9d\u8d56\u53cd\u5c04\u3002"),
        h3("2.1.2 \u9274\u6743\u76f8\u5173\u7c7b\u7684\u6df7\u6dc6\u7b56\u7565"),
        body("\u5bf9\u4e8e\u9274\u6743\u76f8\u5173\u7684\u6838\u5fc3\u7c7b\uff0c\u4e0d\u4ec5\u8981\u8fdb\u884c\u540d\u79f0\u6df7\u6dc6\uff0c\u8fd8\u9700\u8981\u8fdb\u884c\u7279\u6b8a\u5904\u7406\u3002\u5efa\u8bae\u5c06 AuthKeyService\u3001HttpProtocol \u4e2d\u4e0e\u9274\u6743\u76f8\u5173\u7684\u65b9\u6cd5\u8fdb\u884c\u66f4\u6df1\u5c42\u6b21\u7684\u6df7\u6dc6\uff0c\u5305\u62ec\u542f\u7528\u65b9\u6cd5\u7b7e\u540d\u79fb\u9664\u548c\u5f02\u5e38\u5904\u7406\u6df7\u6dc6\u3002\u4f8b\u5982\uff0c\u5c06 buildAuthUrl() \u65b9\u6cd5\u62c6\u5206\u4e3a\u591a\u4e2a\u5c0f\u65b9\u6cd5\uff0c\u6bcf\u4e2a\u65b9\u6cd5\u53ea\u8d1f\u8d23\u4e00\u5c0f\u6b65\u903b\u8f91\uff0c\u5e76\u901a\u8fc7\u63a5\u53e3\u56de\u8c03\u7ec4\u5408\uff0c\u4ece\u800c\u8ba9\u53cd\u7f16\u8bd1\u5668\u96be\u4ee5\u8fd8\u539f\u5b8c\u6574\u7684\u9274\u6743\u6d41\u7a0b\u3002"),

        heading("2.2 \u7b2c\u4e8c\u5c42\uff1a\u5b57\u7b26\u4e32\u52a0\u5bc6\uff08String Encryption\uff09", HeadingLevel.HEADING_2),
        body("字符串加密是防止攻击者通过搜索字节码中的明文字符串来定位鉴权相关代码的核心手段。即使经过 ProGuard 混淆，字符串常量仍然保留在字节码中，攻击者可以通过搜索 auth_key、anti-hotlink、mxzysoa.com、auth-api、filePath、expireTime、uid 等关键字轻松定位到鉴权逻辑。因此，必须对所有敏感字符串进行加密处理。"),
        h3("2.2.1 \u9700\u8981\u52a0\u5bc6\u7684\u5173\u952e\u5b57\u7b26\u4e32"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u539f\u59cb\u5b57\u7b26\u4e32", "\u6240\u5728\u6587\u4ef6", "\u98ce\u9669\u7b49\u7ea7"], true),
            makeRow(["\"anti-hotlink-enabled\"", "AppConfig.java", "\u9ad8"]),
            makeRow(["\"anti-hotlink-auth-url\"", "AppConfig.java", "\u6781\u9ad8"]),
            makeRow(["\"https://auth-api.mxzysoa.com/generate-auth-url\"", "AppConfig.java", "\u6781\u9ad8"]),
            makeRow(["\"anti-hotlink-expire-time\"", "AppConfig.java", "\u9ad8"]),
            makeRow(["\"anti-hotlink-uid\"", "AppConfig.java", "\u9ad8"]),
            makeRow(["\"auth_key\"", "AuthKeyService.java", "\u6781\u9ad8"]),
            makeRow(["\"filePath\"", "AuthKeyService.java", "\u4e2d"]),
            makeRow(["\"expireTime\"", "AuthKeyService.java", "\u4e2d"]),
            makeRow(["\"uid\"", "AuthKeyService.java", "\u4e2d"]),
            makeRow(["\"timestamp-{rand}-{uid}-{md5hash}\"", "\u65e5\u5fd7\u8f93\u51fa", "\u4e2d"]),
            makeRow(["\"authApiUrl\"", "Servers.java", "\u9ad8"]),
          ]
        }),
        h3("2.2.2 \u52a0\u5bc6\u5b9e\u73b0\u65b9\u6848"),
        body("\u5efa\u8bae\u4f7f\u7528 AES-256-GCM \u52a0\u5bc6\u7b97\u6cd5\uff0c\u5bc6\u94a5\u901a\u8fc7\u591a\u5c42\u6df7\u6dc6\u5d4c\u5165\u5230\u4ee3\u7801\u4e2d\u800c\u975e\u786c\u7f16\u7801\u3002\u5177\u4f53\u5b9e\u73b0\u601d\u8def\u4e3a\uff1a\u7f16\u8bd1\u65f6\u901a\u8fc7\u6ce8\u89e3\u5904\u7406\u5668\u81ea\u52a8\u5c06\u6e90\u7801\u4e2d\u6807\u8bb0\u4e86 @Encrypted \u6ce8\u89e3\u7684\u5b57\u7b26\u4e32\u5e38\u91cf\u66ff\u6362\u4e3a\u52a0\u5bc6\u540e\u7684\u5b57\u8282\u6570\u7ec4\uff1b\u8fd0\u884c\u65f6\u901a\u8fc7 StringDecryptor \u7c7b\u5728\u9996\u6b21\u8bbf\u95ee\u65f6\u89e3\u5bc6\u5e76\u7f13\u5b58\u7ed3\u679c\u3002\u5bc6\u94a5\u7684\u751f\u6210\u91c7\u7528\u201c\u73af\u5883\u6307\u7eb1 + \u8fd0\u884c\u65f6\u8ba1\u7b97\u201d\u7684\u65b9\u5f0f\uff0c\u5c06\u5bc6\u94a5\u62c6\u5206\u4e3a\u591a\u4e2a\u7247\u6bb5\u6563\u5e03\u5728\u4e0d\u540c\u7c7b\u7684\u9759\u6001\u521d\u59cb\u5316\u5757\u4e2d\uff0c\u8fd0\u884c\u65f6\u901a\u8fc7\u7279\u5b9a\u987a\u5e8f\u62fc\u63a5\u3001\u53d8\u5f02\u8ba1\u7b97\u540e\u5f97\u5230\u771f\u5b9e\u5bc6\u94a5\u3002\u8fd9\u6837\u5373\u4f7f\u653b\u51fb\u8005\u627e\u5230\u4e86\u89e3\u5bc6\u51fd\u6570\uff0c\u4e5f\u65e0\u6cd5\u76f4\u63a5\u83b7\u53d6\u5bc6\u94a5\u3002"),
        codeBlock("// \u52a0\u5bc6\u6ce8\u89e3\u793a\u4f8b"),
        codeBlock("@Encrypted public static final String AUTH_KEY_PARAM = \"auth_key\";"),
        codeBlock("// \u7f16\u8bd1\u540e\u81ea\u52a8\u53d8\u4e3a\uff1a"),
        codeBlock("public static final String AUTH_KEY_PARAM = decrypt(new byte[]{0x4a, 0xf2, ...});"),

        heading("2.3 \u7b2c\u4e09\u5c42\uff1a\u63a7\u5236\u6d41\u6df7\u6dc6\uff08Control Flow Obfuscation\uff09", HeadingLevel.HEADING_2),
        body("\u63a7\u5236\u6d41\u6df7\u6dc6\u7684\u76ee\u7684\u662f\u8ba9\u53cd\u7f16\u8bd1\u5668\u751f\u6210\u7684\u4ee3\u7801\u903b\u8f91\u4e0e\u539f\u59cb\u4ee3\u7801\u5dee\u5f02\u6781\u5927\uff0c\u653b\u51fb\u8005\u65e0\u6cd5\u901a\u8fc7\u9605\u8bfb\u4ee3\u7801\u7406\u89e3\u7a0b\u5e8f\u7684\u5b9e\u9645\u6267\u884c\u903b\u8f91\u3002\u8fd9\u5bf9\u4e8e\u4fdd\u62a4\u9274\u6743\u6d41\u7a0b\u5c24\u4e3a\u91cd\u8981\uff0c\u56e0\u4e3a\u5373\u4f7f\u653b\u51fb\u8005\u770b\u5230\u4e86\u52a0\u5bc6\u540e\u7684\u5b57\u7b26\u4e32\u548c\u6df7\u6dc6\u540e\u7684\u7c7b\u540d\uff0c\u5982\u679c\u63a7\u5236\u6d41\u4ecd\u7136\u6e05\u6670\uff0c\u4ed6\u4eec\u4ecd\u7136\u53ef\u4ee5\u901a\u8fc7\u8ddf\u8e2a\u7a0b\u5e8f\u6267\u884c\u6d41\u6765\u7406\u89e3\u9274\u6743\u903b\u8f91\u3002"),
        body("\u5177\u4f53\u63aa\u65bd\u5305\u62ec\uff1a\u5728\u9274\u6743\u6838\u5fc3\u65b9\u6cd5\u4e2d\u63d2\u5165\u5927\u91cf\u65e0\u6548\u4ee3\u7801\u5206\u652f\uff08Dead Code Injection\uff09\uff0c\u4f7f\u7528 switch-case \u72b6\u6001\u673a\u91cd\u6784\u5f02\u5e38\u5904\u7406\u903b\u8f91\uff0c\u5c06\u7b80\u5355\u7684 if-else \u5224\u65ad\u8f6c\u6362\u4e3a\u590d\u6742\u7684\u5e03\u5c14\u8868\u8fbe\u5f0f\u8ba1\u7b97\uff0c\u5bf9\u53d8\u91cf\u548c\u5c40\u90e8\u65b9\u6cd5\u8fdb\u884c\u5185\u8054\uff08Inline\uff09\u548c\u63d0\u53d6\uff0c\u4ee5\u53ca\u4f7f\u7528\u53cd\u5c04\u8c03\u7528\u5728\u8fd0\u884c\u65f6\u52a8\u6001\u89e3\u6790\u65b9\u6cd5\u8c03\u7528\u800c\u975e\u76f4\u63a5\u8c03\u7528\u3002"),
        body("\u4f8b\u5982\uff0c\u5bf9\u4e8e AuthKeyService.buildAuthUrl() \u65b9\u6cd5\uff0c\u539f\u59cb\u4ee3\u7801\u662f\u7b80\u5355\u7684\u4e09\u6b65\u64cd\u4f5c\uff1a\u63d0\u53d6 filePath\u3001\u83b7\u53d6 authKey\u3001\u62fc\u63a5 URL\u3002\u63a7\u5236\u6d41\u6df7\u6dc6\u540e\uff0c\u8fd9\u4e09\u6b65\u64cd\u4f5c\u4f1a\u88ab\u62c6\u89e3\u4e3a\u591a\u4e2a\u5d4c\u5957\u65b9\u6cd5\u8c03\u7528\uff0c\u4e2d\u95f4\u63d2\u5165\u65e0\u6548\u5206\u652f\u3001\u53d8\u91cf\u91cd\u547d\u540d\u3001\u72b6\u6001\u673a\u5207\u6362\u7b49\uff0c\u4f7f\u5f97\u53cd\u7f16\u8bd1\u540e\u7684\u4ee3\u7801\u96be\u4ee5\u7406\u89e3\u5176\u771f\u5b9e\u903b\u8f91\u3002\u63a8\u8350\u4f7f\u7528 Allatori\u3001Zelix KlassMaster \u6216 ProGuard \u7684\u4ed8\u8d39\u7248\u672c\u8fdb\u884c\u63a7\u5236\u6d41\u6df7\u6dc6\u3002"),

        heading("2.4 \u7b2c\u56db\u5c42\uff1a\u914d\u7f6e\u5185\u5d4c\u4e0e\u52a0\u5bc6", HeadingLevel.HEADING_2),
        body("\u5f53\u524d\u9274\u6743\u914d\u7f6e\u76f4\u63a5\u4fdd\u5b58\u5728\u5916\u90e8\u7684 mcpatch.yml \u6587\u4ef6\u4e2d\uff0c\u8fd9\u662f\u4e00\u4e2a\u5de8\u5927\u7684\u5b89\u5168\u9690\u60a3\u3002\u7528\u6237\u53ef\u4ee5\u76f4\u63a5\u7f16\u8f91\u914d\u7f6e\u6587\u4ef6\u5c06 anti-hotlink-enabled \u8bbe\u4e3a false\uff0c\u5b8c\u5168\u7ed5\u8fc7\u9274\u6743\u3002\u56e0\u6b64\uff0c\u5fc5\u987b\u5c06\u6240\u6709\u9274\u6743\u76f8\u5173\u914d\u7f6e\u4ece\u5916\u90e8\u6587\u4ef6\u79fb\u5165\u5230 JAR \u5185\u90e8\uff0c\u5e76\u8fdb\u884c\u52a0\u5bc6\u5904\u7406\u3002"),
        h3("2.4.1 \u5b9e\u65bd\u65b9\u6848"),
        bulletBold("\u786c\u7f16\u7801\u9274\u6743\u914d\u7f6e\uff1a", "\u5c06 anti-hotlink-enabled\u3001auth-api-url\u3001anti-hotlink-expire-time\u3001anti-hotlink-uid \u8fd9\u56db\u4e2a\u5173\u952e\u914d\u7f6e\u9879\u786c\u7f16\u7801\u5230\u7a0b\u5e8f\u4e2d\uff0c\u4e0d\u518d\u4ece mcpatch.yml \u8bfb\u53d6\u3002\u5373\u4f7f\u7528\u6237\u5728\u914d\u7f6e\u6587\u4ef6\u4e2d\u5c06\u5176\u8bbe\u4e3a false\uff0c\u7a0b\u5e8f\u4ecd\u7136\u4f1a\u4f7f\u7528\u5185\u90e8\u786c\u7f16\u7801\u7684\u503c\u3002"),
        bulletBold("\u914d\u7f6e\u503c\u52a0\u5bc6\uff1a", "\u786c\u7f16\u7801\u7684\u914d\u7f6e\u503c\u672c\u8eab\u4e5f\u8981\u7ecf\u8fc7\u52a0\u5bc6\u5904\u7406\uff0c\u4e0d\u80fd\u4ee5\u660e\u6587\u5f62\u5f0f\u5b58\u5728\u4e8e\u5b57\u8282\u7801\u4e2d\u3002\u5efa\u8bae\u4f7f\u7528\u4e0e\u5b57\u7b26\u4e32\u52a0\u5bc6\u76f8\u540c\u7684 AES-256-GCM \u65b9\u6848\uff0c\u5e76\u4f7f\u7528\u4e0d\u540c\u7684\u5bc6\u94a5\u3002"),
        bulletBold("\u53cc\u91cd\u9a8c\u8bc1\uff1a", "\u7a0b\u5e8f\u8fd0\u884c\u65f6\u540c\u65f6\u68c0\u67e5\u5185\u90e8\u786c\u7f16\u7801\u503c\u548c\u5916\u90e8\u914d\u7f6e\u503c\uff0c\u5982\u679c\u53d1\u73b0\u5916\u90e8\u914d\u7f6e\u8bd5\u56fe\u5173\u95ed\u9274\u6743\uff0c\u8bb0\u5f55\u5f02\u5e38\u65e5\u5fd7\u5e76\u5f3a\u5236\u542f\u7528\u9274\u6743\u3002"),
        codeBlock("// \u786c\u7f16\u7801\u52a0\u5bc6\u914d\u7f6e\u793a\u4f8b"),
        codeBlock("private static final boolean ANTI_HOTLINK = true;  // ProGuard\u540e\u53d8\u4e3a\u5355\u5b57\u6bcd"),
        codeBlock("private static final String AUTH_URL = decrypt(new byte[]{...});"),

        heading("2.5 \u7b2c\u4e94\u5c42\uff1a\u53cd\u7be1\u6539\u4e0e\u53cd\u8c03\u8bd5", HeadingLevel.HEADING_2),
        body("\u5373\u4f7f\u4ee3\u7801\u88ab\u6df7\u6dc6\uff0c\u653b\u51fb\u8005\u4ecd\u7136\u53ef\u4ee5\u901a\u8fc7\u4fee\u6539\u5b57\u8282\u7801\u6765\u7ed5\u8fc7\u9274\u6743\u68c0\u67e5\u3002\u56e0\u6b64\uff0c\u5fc5\u987b\u589e\u52a0\u8fd0\u884c\u65f6\u7684\u5b8c\u6574\u6027\u6821\u9a8c\u673a\u5236\uff0c\u786e\u4fdd\u7a0b\u5e8f\u4ee3\u7801\u672a\u88ab\u7be1\u6539\u3002"),
        h3("2.5.1 JAR \u81ea\u6211\u5b8c\u6574\u6027\u6821\u9a8c"),
        body("\u5728\u6bcf\u6b21\u7a0b\u5e8f\u542f\u52a8\u65f6\uff0c\u8ba1\u7b97\u81ea\u8eab JAR \u6587\u4ef6\u4e2d\u6240\u6709\u7c7b\u7684 SHA-256 \u54c8\u5e0c\u503c\uff0c\u5e76\u4e0e\u9884\u5148\u5d4c\u5165\u7684\u6807\u51c6\u54c8\u5e0c\u503c\u8fdb\u884c\u6bd4\u5bf9\u3002\u5982\u679c\u54c8\u5e0c\u503c\u4e0d\u5339\u914d\uff0c\u8bf4\u660e JAR \u6587\u4ef6\u5df2\u88ab\u7be1\u6539\uff0c\u7a0b\u5e8f\u5e94\u7acb\u5373\u7ec8\u6b62\u8fd0\u884c\u5e76\u5c55\u793a\u8b66\u544a\u3002\u54c8\u5e0c\u503c\u5e94\u8be5\u5d4c\u5165\u5728\u591a\u4e2a\u4f4d\u7f6e\uff0c\u91c7\u7528\u4e0d\u540c\u7684\u53d8\u5f62\u5b58\u50a8\uff08\u5982\u5341\u516d\u8fdb\u5236\u53cd\u8f6c\u3001Base64\u7f16\u7801\u3001\u62c6\u5206\u4e3a\u591a\u4e2a\u6574\u6570\u7247\u6bb5\u5206\u6563\u5b58\u50a8\u7b49\uff09\uff0c\u589e\u52a0\u5bfb\u627e\u548c\u4fee\u6539\u7684\u96be\u5ea6\u3002"),
        h3("2.5.2 \u8fd0\u884c\u65f6\u73af\u5883\u68c0\u6d4b"),
        bulletBold("\u8c03\u8bd5\u5668\u68c0\u6d4b\uff1a", "\u68c0\u6d4b\u662f\u5426\u88ab JD-GUI\u3001VisualVM\u3001JDB \u7b49\u8c03\u8bd5\u5668\u9644\u52a0\uff0c\u5982\u679c\u68c0\u6d4b\u5230\u8c03\u8bd5\u73af\u5883\u5219\u62d2\u7edd\u542f\u52a8\u3002"),
        bulletBold("Agent \u68c0\u6d4b\uff1a", "\u68c0\u6d4b\u662f\u5426\u6709 Java Agent \u88ab\u52a0\u8f7d\uff0c\u901a\u8fc7 ManagementFactory.getRuntimeMXBean().getInputArguments() \u68c0\u67e5\u542f\u52a8\u53c2\u6570\u4e2d\u662f\u5426\u542b\u6709 -javaagent \u53c2\u6570\u3002"),
        bulletBold("Hook \u68c0\u6d4b\uff1a", "\u5bf9\u5173\u952e\u7c7b\uff08\u5982 java.net.URL\u3001OkHttpClient\uff09\u8fdb\u884c\u5b9e\u65f6\u76d1\u63a7\uff0c\u68c0\u6d4b\u662f\u5426\u6709\u5f02\u5e38\u7684\u4ee3\u7406\u6216\u62e6\u622a\u5668\u88ab\u6ce8\u5165\u3002"),
        bulletBold("\u91cd\u6253\u5305\u68c0\u6d4b\uff1a", "\u5229\u7528\u7c7b\u52a0\u8f7d\u5668\u7684\u53cc\u4eb2\u59d4\u6d3e\u673a\u5236\uff0c\u5728\u6838\u5fc3\u7c7b\u7684\u7c7b\u52a0\u8f7d\u65f6\u68c0\u67e5\u8be5\u7c7b\u662f\u5426\u88ab\u91cd\u65b0\u52a0\u8f7d\uff08\u5373\u88ab\u7be1\u6539\u8fc7\uff09\uff0c\u5982\u679c\u88ab\u91cd\u65b0\u52a0\u8f7d\u5219\u8868\u660e\u5b57\u8282\u7801\u5df2\u88ab\u7be1\u6539\u3002"),

        heading("2.6 \u7b2c\u516d\u5c42\uff1a\u7f51\u7edc\u5c42\u4fdd\u62a4", HeadingLevel.HEADING_2),
        body("\u5373\u4f7f\u4e0a\u8ff0\u6240\u6709\u63aa\u65bd\u90fd\u5df2\u5b9e\u65bd\uff0c\u653b\u51fb\u8005\u4ecd\u7136\u53ef\u4ee5\u901a\u8fc7 MITM Proxy \u622a\u83b7\u9274\u6743\u8bf7\u6c42\u548c\u54cd\u5e94\uff0c\u83b7\u53d6\u6709\u6548\u7684 auth_key \u540e\u76f4\u63a5\u8c03\u7528\u4e0b\u8f7d API\u3002\u56e0\u6b64\uff0c\u7f51\u7edc\u5c42\u7684\u4fdd\u62a4\u4e5f\u4e0d\u53ef\u6216\u7f3a\u3002"),
        bulletBold("SSL Certificate Pinning\uff1a", "\u5728 OkHttp \u5ba2\u6237\u7aef\u914d\u7f6e\u8bc1\u4e66\u9501\u5b9a\uff0c\u53ea\u4fe1\u4efb\u6307\u5b9a\u7684 CA \u8bc1\u4e66\uff0c\u9632\u6b62 MITM \u4e2d\u95f4\u4eba\u653b\u51fb\u3002\u5177\u4f53\u5b9e\u73b0\u65b9\u5f0f\u4e3a\u521b\u5efa\u81ea\u5b9a\u4e49\u7684 CertificatePinner\uff0c\u5c06\u9274\u6743 API \u57df\u540d\u7684\u8bc1\u4e66\u6307\u7eb9\u786c\u7f16\u7801\u5230\u5ba2\u6237\u7aef\u3002"),
        bulletBold("\u8bf7\u6c42\u7b7e\u540d\uff1a", "\u4e3a\u6bcf\u4e2a\u9274\u6743\u8bf7\u6c42\u6dfb\u52a0\u65f6\u95f4\u6233\u548c\u968f\u673a nonce\uff0c\u9632\u6b62\u91cd\u653e\u653b\u51fb\u3002\u5177\u4f53\u505a\u6cd5\u662f\u5728\u8bf7\u6c42\u53c2\u6570\u4e2d\u52a0\u5165 timestamp \u548c\u4e00\u4e2a\u57fa\u4e8e\u591a\u4e2a\u53c2\u6570\u8ba1\u7b97\u7684 HMAC \u7b7e\u540d\uff0c\u670d\u52a1\u7aef\u9a8c\u8bc1\u7b7e\u540d\u540e\u624d\u8fd4\u56de\u9274\u6743\u51ed\u636e\u3002"),
        bulletBold("\u9274\u6743\u51ed\u636e\u7ed1\u5b9a IP\uff1a", "\u5728\u670d\u52a1\u7aef\u8bb0\u5f55\u83b7\u53d6 auth_key \u7684\u5ba2\u6237\u7aef IP\uff0c\u5e76\u5728 CDN \u5c42\u914d\u7f6e IP \u767d\u540d\u5355\uff0c\u4ec5\u5141\u8bb8\u83b7\u53d6\u51ed\u636e\u7684 IP \u4f7f\u7528\u8be5\u51ed\u636e\u4e0b\u8f7d\u6587\u4ef6\u3002\u5982\u679c\u53d1\u73b0\u51ed\u636e\u88ab\u5176\u4ed6 IP \u4f7f\u7528\uff0c\u7acb\u5373\u4f7f\u51ed\u636e\u5931\u6548\u3002"),
        bulletBold("\u8bf7\u6c42\u52a0\u5bc6\uff1a", "\u5bf9\u9274\u6743 API \u7684\u8bf7\u6c42\u53c2\u6570\u548c\u54cd\u5e94\u5185\u5bb9\u8fdb\u884c\u52a0\u5bc6\u4f20\u8f93\uff0c\u9632\u6b62\u901a\u8fc7\u6d41\u91cf\u76d1\u63a7\u5de5\u5177\u83b7\u53d6\u9274\u6743\u53c2\u6570\u683c\u5f0f\u3002"),

        // ===== 3. 实施计划 =====
        heading("\u4e09\u3001\u5b9e\u65bd\u8ba1\u5212\u4e0e\u6784\u5efa\u6d41\u7a0b"),
        heading("3.1 \u6784\u5efa\u6d41\u7a0b\u8c03\u6574", HeadingLevel.HEADING_2),
        body("\u5f53\u524d\u9879\u76ee\u7684\u6784\u5efa\u6d41\u7a0b\u4e3a\uff1aJava \u6e90\u7801 \u2192 ProGuard \u6df7\u6dc6 \u2192 ShadowJar \u6253\u5305 \u2192 Fat JAR\u3002\u8c03\u6574\u540e\u7684\u6784\u5efa\u6d41\u7a0b\u5e94\u4e3a\uff1aJava \u6e90\u7801 + \u5b57\u7b26\u4e32\u52a0\u5bc6\u6ce8\u89e3 \u2192 \u6ce8\u89e3\u5904\u7406\u5668\uff08\u7f16\u8bd1\u671f\u52a0\u5bc6\u5b57\u7b26\u4e32\uff09\u2192 \u7f16\u8bd1 Java \u5b57\u8282\u7801 \u2192 ProGuard \u6df7\u6dc6\uff08\u540d\u79f0\u6df7\u6dc6 + \u63a7\u5236\u6d41\u6df7\u6dc6 + \u79fb\u9664\u8c03\u8bd5\u4fe1\u606f\uff09\u2192 ShadowJar \u6253\u5305\u4e3a Fat JAR \u2192 \u53d1\u5e03\u3002\u6574\u4e2a\u6d41\u7a0b\u5e94\u901a\u8fc7 Gradle \u4efb\u52a1\u4f9d\u8d56\u81ea\u52a8\u5b8c\u6210\uff0c\u65e0\u9700\u624b\u52a8\u5e72\u9884\u3002"),

        heading("3.2 \u5177\u4f53\u5b9e\u65bd\u6b65\u9aa4", HeadingLevel.HEADING_2),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u9636\u6bb5", "\u4efb\u52a1", "\u5de5\u5177/\u6280\u672f", "\u4f18\u5148\u7ea7"], true),
            makeRow(["\u7b2c\u4e00\u9636\u6bb5", "\u96c6\u6210 ProGuard \u63d2\u4ef6\u5230 Gradle", "com.guardsquare:proguard-gradle:7.4.2", "\u6781\u9ad8"]),
            makeRow(["\u7b2c\u4e00\u9636\u6bb5", "\u7f16\u5199 proguard-rules.pro \u914d\u7f6e\u6587\u4ef6", "ProGuard", "\u6781\u9ad8"]),
            makeRow(["\u7b2c\u4e8c\u9636\u6bb5", "\u5f00\u53d1\u5b57\u7b26\u4e32\u52a0\u5bc6\u6ce8\u89e3\u5904\u7406\u5668", "\u81ea\u5b9a\u4e49 Java Annotation Processor", "\u6781\u9ad8"]),
            makeRow(["\u7b2c\u4e8c\u9636\u6bb5", "\u5bf9\u654f\u611f\u5b57\u7b26\u4e32\u6dfb\u52a0 @Encrypted \u6ce8\u89e3", "\u624b\u52a8\u6807\u8bb0", "\u6781\u9ad8"]),
            makeRow(["\u7b2c\u4e09\u9636\u6bb5", "\u9274\u6743\u914d\u7f6e\u4ece mcpatch.yml \u8fc1\u79fb\u5230\u786c\u7f16\u7801", "\u4ee3\u7801\u91cd\u6784", "\u9ad8"]),
            makeRow(["\u7b2c\u56db\u9636\u6bb5", "\u96c6\u6210 JAR \u5b8c\u6574\u6027\u6821\u9a8c", "\u81ea\u5b9a\u4e49 IntegrityChecker \u7c7b", "\u9ad8"]),
            makeRow(["\u7b2c\u56db\u9636\u6bb5", "\u96c6\u6210\u53cd\u8c03\u8bd5/\u53cd Agent \u68c0\u6d4b", "SecurityManager + Instrumentation", "\u4e2d"]),
            makeRow(["\u7b2c\u4e94\u9636\u6bb5", "\u96c6\u6210 Allatori \u63a7\u5236\u6d41\u6df7\u6dc6", "Allatori", "\u4e2d"]),
            makeRow(["\u7b2c\u516d\u9636\u6bb5", "\u96c6\u6210 SSL Certificate Pinning", "OkHttp CertificatePinner", "\u4e2d"]),
            makeRow(["\u7b2c\u4e03\u9636\u6bb5", "\u670d\u52a1\u7aef\u914d\u7f6e IP \u7ed1\u5b9a\u4e0e\u7b7e\u540d\u9a8c\u8bc1", "\u670d\u52a1\u7aef\u6539\u9020", "\u4e2d"]),
            makeRow(["\u7b2c\u516b\u9636\u6bb5", "\u5168\u6d41\u7a0b\u6d4b\u8bd5\u4e0e\u9a8c\u8bc1", "\u624b\u52a8 + \u81ea\u52a8\u5316\u6d4b\u8bd5", "\u6781\u9ad8"]),
          ]
        }),

        // ===== 4. ProGuard 配置 =====
        heading("\u56db\u3001ProGuard \u6838\u5fc3\u914d\u7f6e\uff08proguard-rules.pro\uff09", HeadingLevel.HEADING_2),
        body("\u4ee5\u4e0b\u662f\u5efa\u8bae\u7684 ProGuard \u89c4\u5219\u6587\u4ef6\u7684\u6838\u5fc3\u5185\u5bb9\u3002\u5b8c\u6574\u7684\u89c4\u5219\u6587\u4ef6\u5e94\u653e\u7f6e\u4e8e\u9879\u76ee\u6839\u76ee\u5f55\u4e0b\u7684 proguard-rules.pro \u6587\u4ef6\u4e2d\uff1a"),
        codeBlock("# \u4fdd\u7559\u5165\u53e3\u7c7b\uff08Main-Class \u548c Premain-Class\uff09"),
        codeBlock("-keep public class com.github.balloonupdate.mcpatch.client.Main { *; }"),
        codeBlock(""),
        codeBlock("# \u4fdd\u7559\u6cdb\u578b\u4fe1\u606f\uff08\u53cd\u5c04\u4f9d\u8d56\uff09"),
        codeBlock("-keepattributes Signature"),
        codeBlock("-keepattributes InnerClasses"),
        codeBlock("-keepattributes *Annotation*"),
        codeBlock(""),
        codeBlock("# \u4fdd\u7559\u5916\u90e8\u5e93\u7684\u516c\u5f00 API"),
        codeBlock("-keep class org.yaml.snakeyaml.** { *; }"),
        codeBlock("-keep class com.formdev.flatlaf.** { *; }"),
        codeBlock("-keep class okhttp3.** { *; }"),
        codeBlock("-keep class okio.** { *; }"),
        codeBlock("-keep class com.github.sardine.** { *; }"),
        codeBlock("-keep class org.json.** { *; }"),
        codeBlock("-keep class javax.swing.** { *; }"),
        codeBlock(""),
        codeBlock("# \u79fb\u9664\u8c03\u8bd5\u4fe1\u606f"),
        codeBlock("-assumenosideeffects class * { *; }"),
        codeBlock("-renamesourcefileattributes **"),
        codeBlock(""),
        codeBlock("# \u4fdd\u7559\u679a\u4e3e\u65b9\u6cd5\u540d\uff08UI \u56de\u8c03\u9700\u8981\uff09"),
        codeBlock("-keepclassmembers class * {"),
        codeBlock("    *** on*(...);"),
        codeBlock("}"),

        // ===== 5. 风险评估 =====
        heading("\u4e94\u3001\u98ce\u9669\u8bc4\u4f30\u4e0e\u5efa\u8bae", HeadingLevel.HEADING_2),
        body("\u5728\u5b9e\u65bd\u6df7\u6dc6\u65b9\u6848\u65f6\uff0c\u9700\u8981\u6743\u8861\u5b89\u5168\u6027\u4e0e\u53ef\u7ef4\u62a4\u6027\u3002\u4ee5\u4e0b\u662f\u4e3b\u8981\u7684\u98ce\u9669\u70b9\u548c\u5e94\u5bf9\u5efa\u8bae\uff1a"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            makeRow(["\u98ce\u9669\u9879", "\u8bf4\u660e", "\u5e94\u5bf9\u5efa\u8bae"], true),
            makeRow([""\u8fc7\u5ea6\u6df7\u6dc6\u5bfc\u81f4\u5d29\u6e83", "\u63a7\u5236\u6d41\u6df7\u6dc6\u53ef\u80fd\u5f15\u5165\u96be\u4ee5\u590d\u73b0\u7684 bug", "\u5145\u5206\u6d4b\u8bd5\uff1b\u4fdd\u7559\u6df7\u6dc6\u524d\u540e\u7684\u5b57\u8282\u7801\u5dee\u5f02\uff1b\u6df7\u6dc6\u540e\u5fc5\u987b\u8fd0\u884c\u5b8c\u6574\u7684\u529f\u80fd\u6d4b\u8bd5"]),
            makeRow([""\u5b57\u7b26\u4e32\u52a0\u5bc6\u5f71\u54cd\u542f\u52a8\u901f\u5ea6", "\u89e3\u5bc6\u64cd\u4f5c\u4f1a\u589e\u52a0\u542f\u52a8\u65f6\u5ef6\u8fdf", "\u91c7\u7528\u5ef6\u8fdf\u52a0\u8f7d + \u7f13\u5b58\u673a\u5236\uff0c\u53ea\u5728\u9996\u6b21\u8bbf\u95ee\u65f6\u89e3\u5bc6"]),
            makeRow([""\u53cd\u8c03\u8bd5\u5f71\u54cd\u6b63\u5e38\u4f7f\u7528", "\u7528\u6237\u65e0\u6cd5\u5728 IDE \u4e2d\u8c03\u8bd5", "\u901a\u8fc7\u914d\u7f6e\u5f00\u5173\u6216\u73af\u5883\u53d8\u91cf\u63a7\u5236\u53cd\u8c03\u8bd5\u529f\u80fd"),
            makeRow([""JAR \u5b8c\u6574\u6027\u6821\u9a8c\u88ab\u7ed5\u8fc7", "\u653b\u51fb\u8005\u53ef\u80fd\u4fee\u6539\u54c8\u5e0c\u68c0\u67e5\u4ee3\u7801", "\u591a\u5c42\u54c8\u5e0c\u68c0\u67e5\u3001\u4f7f\u7528 JNI \u8c03\u7528\u539f\u751f\u65b9\u6cd5\u6821\u9a8c"]),
            makeRow([""MITM \u653b\u51fb\u4ecd\u53ef\u80fd\u6210\u529f", "\u653b\u51fb\u8005\u53ef\u4ee5\u622a\u83b7\u9274\u6743\u51ed\u636e", "\u670d\u52a1\u7aef\u914d\u5408 IP \u7ed1\u5b9a\u3001\u8bf7\u6c42\u7b7e\u540d\u3001\u77ed\u6709\u6548\u671f\u9274\u6743\u51ed\u636e"]),
            makeRow([""\u5ba2\u6237\u7aef\u4f9d\u8d56\u670d\u52a1\u7aef\u914d\u5408", "\u5ba2\u6237\u7aef\u65e0\u6cd5\u5355\u72ec\u5b8c\u6210\u5b89\u5168\u4fdd\u62a4", "\u5ba2\u6237\u7aef\u5927\u5e45\u63d0\u9ad8\u7834\u89e3\u96be\u5ea6\uff0c\u670d\u52a1\u7aef\u914d\u5408\u6d3b\u52a8\u7b49\u7b56\u7565"]),
          ]
        }),

        // ===== 6. 总结 =====
        heading("\u516d\u3001\u603b\u7ed3\u4e0e\u4f18\u5148\u7ea7\u5efa\u8bae", HeadingLevel.HEADING_2),
        body("\u672c\u65b9\u6848\u91c7\u7528\u516d\u5c42\u9632\u5fa1\u4f53\u7cfb\uff0c\u4ece\u5b57\u8282\u7801\u5c42\u3001\u5b57\u7b26\u4e32\u5c42\u3001\u63a7\u5236\u6d41\u5c42\u3001\u914d\u7f6e\u5c42\u3001\u8fd0\u884c\u65f6\u5c42\u3001\u7f51\u7edc\u5c42\u5168\u65b9\u4f4d\u4fdd\u62a4\u9274\u6743\u673a\u5236\u3002\u5efa\u8bae\u6309\u7167\u4ee5\u4e0b\u4f18\u5148\u7ea7\u5206\u9636\u6bb5\u5b9e\u65bd\uff1a"),
        bulletBold("P0\uff08\u7acb\u5373\u5b9e\u65bd\uff09\uff1a", "ProGuard \u5b57\u8282\u7801\u6df7\u6dc6 + \u9274\u6743\u914d\u7f6e\u786c\u7f16\u7801 + \u5b57\u7b26\u4e32\u52a0\u5bc6\u3002\u8fd9\u4e09\u9879\u662f\u6700\u57fa\u7840\u3001\u6700\u5173\u952e\u7684\u4fdd\u62a4\u63aa\u65bd\uff0c\u5fc5\u987b\u5728\u53d1\u5e03\u524d\u5b8c\u6210\u3002"),
        bulletBold("P1\uff08\u77ed\u671f\u5b9e\u65bd\uff09\uff1a", "JAR \u5b8c\u6574\u6027\u6821\u9a8c + \u53cd\u8c03\u8bd5\u68c0\u6d4b\u3002\u8fd9\u4e24\u9879\u53ef\u4ee5\u6709\u6548\u9632\u6b62\u5e38\u89c1\u7684\u7be1\u6539\u548c\u8c03\u8bd5\u884c\u4e3a\uff0c\u5b9e\u65bd\u96be\u5ea6\u4e0d\u5927\u3002"),
        bulletBold("P2\uff08\u4e2d\u671f\u5b9e\u65bd\uff09\uff1a", "\u63a7\u5236\u6d41\u6df7\u6dc6 + SSL Certificate Pinning\u3002\u63a7\u5236\u6d41\u6df7\u6dc6\u9700\u8981\u989d\u5916\u7684\u5de5\u5177\u6210\u672c\uff08Allatori \u7b49\uff09\uff0cSSL Pinning \u9700\u8981\u670d\u52a1\u7aef\u914d\u5408\u3002"),
        bulletBold("P3\uff08\u957f\u671f\u5b9e\u65bd\uff09\uff1a", "\u670d\u52a1\u7aef IP \u7ed1\u5b9a + \u8bf7\u6c42\u7b7e\u540d\u3002\u8fd9\u4e9b\u662f\u670d\u52a1\u7aef\u7684\u6539\u9020\u5de5\u4f5c\uff0c\u9700\u8981\u4e0e\u670d\u52a1\u7aef\u56e2\u961f\u534f\u8c03\u3002"),
        body("\u7ecf\u8fc7\u4e0a\u8ff0\u5168\u5957\u65b9\u6848\u7684\u5b9e\u65bd\uff0c\u53ef\u4ee5\u5c06 Mcpatch2JavaClient \u7684\u53cd\u7f16\u8bd1\u96be\u5ea6\u4ece\u201c\u51e0\u4e4e\u4e3a\u96f6\u201d\u63d0\u5347\u5230\u201c\u4e13\u4e1a\u653b\u51fb\u8005\u9700\u8981\u82b1\u8d39\u5927\u91cf\u65f6\u95f4\u201d\u7684\u6c34\u5e73\uff0c\u4ece\u800c\u6709\u6548\u4fdd\u62a4\u9274\u6743\u673a\u5236\u4e0d\u88ab\u7ed5\u8fc7\u3002\u540c\u65f6\uff0c\u6240\u6709\u6df7\u6dc6\u63aa\u65bd\u90fd\u662f\u53ef\u9006\u7684\uff0c\u56e0\u6b64\u5efa\u8bae\u5efa\u7acb\u5b9a\u671f\u66f4\u65b0\u548c\u8f6e\u8f6c\u6df7\u6dc6\u7b56\u7565\u7684\u673a\u5236\uff0c\u4ee5\u5e94\u5bf9\u4e0d\u65ad\u6f14\u8fdb\u7684\u7834\u89e3\u6280\u672f\u3002"),
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/z/my-project/download/Mcpatch2JavaClient\u4ee3\u7801\u6df7\u6dc6\u4e0e\u53cd\u7834\u89e3\u65b9\u6848.docx", buf);
  console.log("Document generated successfully!");
});
