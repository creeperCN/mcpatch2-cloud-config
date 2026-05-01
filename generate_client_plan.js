const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, convertInchesToTwip
} = require("docx");
const fs = require("fs");

// ── Palette ──
const P = { primary: "0A1628", body: "1A2B40", secondary: "6878A0", accent: "5B8DB8", surface: "F4F8FC" };
const c = (hex) => hex.replace("#", "");

// ── Borders ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorder = () => ({ top: NB, bottom: NB, left: NB, right: NB });
const thinBorder = (color = "D0D8E0") => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
});

// ── Table row helper ──
function makeRow(cells, isHeader = false, widths) {
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
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
  const isH2 = level === HeadingLevel.HEADING_2;
  const isH3 = level === HeadingLevel.HEADING_3;
  return new Paragraph({
    heading: level,
    spacing: { before: isH1 ? 480 : (isH2 ? 360 : 280), after: 160 },
    children: [new TextRun({
      text, bold: true,
      color: c(isH1 ? P.primary : (isH2 ? P.accent : P.primary)),
      font: { ascii: "Calibri", eastAsia: "SimHei" },
      size: isH1 ? 32 : (isH2 ? 28 : 26)
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

function codeLine(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276, after: 0 },
    shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
    children: [new TextRun({
      text, size: 18,
      color: "2C3E50",
      font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function codeBlock(lines) {
  const result = [];
  for (const line of lines) {
    result.push(codeLine(line));
  }
  return result;
}

function emptyLine() {
  return new Paragraph({ spacing: { before: 80, after: 80 }, children: [] });
}

// ════════════════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ════════════════════════════════════════════════════════════════════

const children = [];

// ════════════════════════════════════════════
// Title
// ════════════════════════════════════════════
children.push(heading("Mcpatch2 Java \u5ba2\u6237\u7aef\u4e91\u7aef\u914d\u7f6e\u96c6\u6210\u5b9e\u73b0\u65b9\u6848"));

// ════════════════════════════════════════════
// 一、需求背景
// ════════════════════════════════════════════
children.push(heading("\u4e00\u3001\u9700\u6c42\u80cc\u666f"));

children.push(body("\u5f53\u524d Mcpatch2 Java \u5ba2\u6237\u7aef\u901a\u8fc7\u8bfb\u53d6\u672c\u5730 mcpatch.yml \u6587\u4ef6\u83b7\u53d6\u8fd0\u884c\u914d\u7f6e\u3002\u672c\u65b9\u6848\u5c06\u914d\u7f6e\u83b7\u53d6\u65b9\u5f0f\u5347\u7ea7\u4e3a\u4ece\u4e91\u7aef HTTPS \u63a5\u53e3\u62c9\u53d6\uff0c\u5e76\u8981\u6c42\uff1a"));

children.push(numberedItem(1, "\u542f\u52a8\u65f6\u4f18\u5148\u4ece\u4e91\u7aef\u62c9\u53d6\u52a0\u5bc6\u914d\u7f6e"));
children.push(numberedItem(2, "\u62c9\u53d6\u5230\u7684\u914d\u7f6e\u5728\u672c\u5730\u4ee5 AES-128-CBC \u52a0\u5bc6\u65b9\u5f0f\u7f13\u5b58"));
children.push(numberedItem(3, "\u7528\u6237\u65e0\u6cd5\u76f4\u63a5\u8bfb\u53d6\u6216\u7be1\u6539\u672c\u5730\u7f13\u5b58\u7684\u914d\u7f6e\u5185\u5bb9"));
children.push(numberedItem(4, "\u7f51\u7edc\u5f02\u5e38\u65f6\u81ea\u52a8\u56de\u9000\u5230\u672c\u5730\u7f13\u5b58\u6216\u5185\u7f6e\u914d\u7f6e"));
children.push(numberedItem(5, "\u4e0d\u6539\u53d8\u539f\u6709\u7684\u66f4\u65b0\u6d41\u7a0b\uff08\u89e3\u6790\u914d\u7f6e\u540e\u903b\u8f91\u4e0d\u53d8\uff09"));

// ════════════════════════════════════════════
// 二、云端接口协议
// ════════════════════════════════════════════
children.push(heading("\u4e8c\u3001\u4e91\u7aef\u63a5\u53e3\u534f\u8bae"));

children.push(heading("2.1 \u8bf7\u6c42\u683c\u5f0f", HeadingLevel.HEADING_2));

children.push(...codeBlock([
  "GET {api-url}/api/client?encrypt=true",
  "Authorization: Bearer {api-key}",
  "User-Agent: Mcpatch2JavaClient/{version}",
]));

children.push(heading("2.2 \u54cd\u5e94\u683c\u5f0f\uff08\u52a0\u5bc6\u6a21\u5f0f\uff09", HeadingLevel.HEADING_2));

children.push(...codeBlock([
  "Status: 200 OK",
  "Content-Type: application/octet-stream",
  "X-AES-IV: {32\u4f4d\u5341\u516d\u8fdb\u5236IV}",
  "X-AES-Fingerprint: {AES\u5bc6\u94a5SHA-256\u6307\u7eb9\uff0c\u683c\u5f0f AA:BB:CC:...}",
  "X-Config-Version: {\u914d\u7f6e\u7248\u672c\u53f7}",
  "X-Config-Signature: {RSA-SHA256\u7b7e\u540dBase64}\uff08\u53ef\u9009\uff09",
  "X-Signature-Algorithm: RSA-SHA256\uff08\u53ef\u9009\uff09",
  "",
  "Body: Base64\u7f16\u7801\u7684AES-128-CBC\u5bc6\u6587",
]));

children.push(heading("2.3 AES-128-CBC \u89e3\u5bc6\u53c2\u6570", HeadingLevel.HEADING_2));

children.push(bulletBold("\u5bc6\u94a5\uff1a", "32\u4f4d\u5341\u516d\u8fdb\u5236\u5b57\u7b26\u4e32\uff0816\u5b57\u8282\uff09\uff0c\u9884\u5171\u4eab\u5d4c\u5165JAR"));
children.push(bulletBold("IV\uff1a", "\u4ece\u54cd\u5e94\u5934 X-AES-IV \u83b7\u53d6\uff0c32\u4f4d\u5341\u516d\u8fdb\u5236\uff0816\u5b57\u8282\uff09"));
children.push(bulletBold("\u5bc6\u6587\uff1a", "\u54cd\u5e94Body\uff0cBase64\u7f16\u7801"));
children.push(bulletBold("\u586b\u5145\uff1a", "PKCS5Padding"));
children.push(bulletBold("\u8f93\u51fa\uff1a", "UTF-8 \u7f16\u7801\u7684\u660e\u6587 YAML \u5b57\u7b26\u4e32"));

children.push(heading("2.4 \u9519\u8bef\u54cd\u5e94", HeadingLevel.HEADING_2));

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    makeRow(["HTTP\u72b6\u6001\u7801", "\u542b\u4e49", "\u5ba2\u6237\u7aef\u5904\u7406"], true, [20, 25, 55]),
    makeRow(["200", "\u6210\u529f", "\u89e3\u5bc6\u5e76\u4f7f\u7528\u914d\u7f6e"], false, [20, 25, 55]),
    makeRow(["403", "API\u5bc6\u94a5\u65e0\u6548", "\u56de\u9000\u5230\u672c\u5730"], false, [20, 25, 55]),
    makeRow(["404", "\u6682\u65e0\u53ef\u7528\u914d\u7f6e", "\u56de\u9000\u5230\u672c\u5730"], false, [20, 25, 55]),
    makeRow(["500", "\u670d\u52a1\u5668\u9519\u8bef", "\u56de\u9000\u5230\u672c\u5730"], false, [20, 25, 55]),
    makeRow(["\u7f51\u7edc\u8d85\u65f6", "\u65e0\u6cd5\u8fde\u63a5", "\u4f7f\u7528\u672c\u5730\u7f13\u5b58"], false, [20, 25, 55]),
  ]
}));

// ════════════════════════════════════════════
// 三、配置文件变更
// ════════════════════════════════════════════
children.push(heading("\u4e09\u3001\u914d\u7f6e\u6587\u4ef6\u53d8\u66f4"));

children.push(heading("3.1 \u5185\u7f6e mcpatch.yml \u53d8\u66f4", HeadingLevel.HEADING_2));

children.push(body("\u5728\u5185\u7f6e mcpatch.yml\uff08\u6253\u5305\u8fdb JAR \u7684 resources\uff09\u4e2d\u65b0\u589e cloud-config \u6bb5\u3002\u6b64\u6bb5\u7531\u5f00\u53d1\u8005\u7ef4\u62a4\uff0c\u7f16\u8bd1\u65f6\u56fa\u5316\u5230 JAR \u4e2d\uff0c\u7528\u6237\u4e0d\u53ef\u89c1\u3002\u539f\u6709\u7684 urls\u3001version-file-path \u7b49\u5b57\u6bb5\u6539\u4e3a\u7531\u4e91\u7aef\u4e0b\u53d1\uff0c\u672c\u5730\u4e0d\u518d\u586b\u5199\u3002"));

children.push(heading("3.2 \u914d\u7f6e\u9879\u8bf4\u660e", HeadingLevel.HEADING_2));

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    makeRow(["\u914d\u7f6e\u9879", "\u7c7b\u578b", "\u5fc5\u586b", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"], true, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.enabled", "boolean", "\u662f", "false", "\u662f\u5426\u542f\u7528\u4e91\u7aef\u914d\u7f6e"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.api-url", "string", "\u662f", "-", "API\u5730\u5740\uff0c\u5982 https://auth-config.mxzysoa.com/api/client"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.api-key", "string", "\u662f", "-", "API\u8bbf\u95ee\u5bc6\u94a5"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.aes-key", "string", "\u662f", "-", "\u9884\u5171\u4eabAES\u5bc6\u94a5\uff0832\u4f4dhex\uff09"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.cache-file", "string", "\u5426", ".mcpatch-config.enc", "\u672c\u5730\u7f13\u5b58\u8def\u5f84\uff08\u76f8\u5bf9\u8fd0\u884c\u76ee\u5f55\uff09"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.cache-ttl", "int", "\u5426", "3600", "\u7f13\u5b58\u6709\u6548\u671f\uff08\u79d2\uff09"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.timeout", "int", "\u5426", "7000", "HTTP\u8bf7\u6c42\u8d85\u65f6\uff08\u6beb\u79d2\uff09"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.fallback-local", "boolean", "\u5426", "true", "\u4e91\u7aef\u4e0d\u53ef\u7528\u65f6\u56de\u9000\u5230\u672c\u5730"], false, [24, 10, 8, 20, 38]),
    makeRow(["cloud-config.verify-signature", "boolean", "\u5426", "false", "\u662f\u5426\u9a8c\u8bc1RSA\u7b7e\u540d"], false, [24, 10, 8, 20, 38]),
  ]
}));

// ════════════════════════════════════════════
// 四、CloudCrypto.java 完整实现
// ════════════════════════════════════════════
children.push(heading("\u56db\u3001CloudCrypto.java \u5b8c\u6574\u5b9e\u73b0"));

children.push(heading("4.1 \u7c7b\u8bbe\u8ba1", HeadingLevel.HEADING_2));

children.push(...codeBlock([
  "package com.github.balloonupdate.mcpatch.client",
  "",
  "public class CloudCrypto {",
  "    // AES-128-CBC \u89e3\u5bc6",
  "    public static String decryptAES(byte[] ciphertext, String keyHex, String ivHex)",
  "",
  "    // AES \u5bc6\u94a5\u6307\u7eb9\u6821\u9a8c",
  "    public static boolean verifyAesFingerprint(String keyHex, String serverFingerprint)",
  "",
  "    // RSA-SHA256 \u7b7e\u540d\u9a8c\u8bc1",
  "    public static boolean verifyRSASignature(String data, String signatureBase64,",
  "                                               String publicKeyPem)",
  "",
  "    // \u5185\u90e8\u5de5\u5177\u65b9\u6cd5",
  "    private static byte[] hexToBytes(String hex)",
  "    private static String bytesToHex(byte[] bytes)",
  "    private static String sha256Fingerprint(byte[] data)",
  "}",
]));

children.push(heading("4.2 decryptAES \u65b9\u6cd5\u5b9e\u73b0", HeadingLevel.HEADING_2));

children.push(body("\u8be5\u65b9\u6cd5\u8d1f\u8d23\u5c06\u670d\u52a1\u7aef\u8fd4\u56de\u7684\u52a0\u5bc6\u6570\u636e\u89e3\u5bc6\u4e3a\u660e\u6587 YAML \u5b57\u7b26\u4e32\u3002\u4f7f\u7528 JDK \u6807\u51c6\u5e93\u7684 javax.crypto.Cipher \u7c7b\uff0c\u91c7\u7528 AES/CBC/PKCS5Padding \u7b97\u6cd5\uff1a"));

children.push(...codeBlock([
  "public static String decryptAES(byte[] ciphertext, String keyHex, String ivHex)",
  "        throws Exception {",
  "    byte[] key = hexToBytes(keyHex);",
  "    byte[] iv = hexToBytes(ivHex);",
  "    if (key.length != 16)",
  "        throw new IllegalArgumentException(\"AES-128 \u5bc6\u94a5\u5fc5\u987b\u4e3a16\u5b57\u8282\");",
  "    if (iv.length != 16)",
  "        throw new IllegalArgumentException(\"IV\u5fc5\u987b\u4e3a16\u5b57\u8282\");",
  "",
  "    javax.crypto.spec.SecretKeySpec keySpec =",
  "        new javax.crypto.spec.SecretKeySpec(key, \"AES\");",
  "    javax.crypto.spec.IvParameterSpec ivSpec =",
  "        new javax.crypto.spec.IvParameterSpec(iv);",
  "    javax.crypto.Cipher cipher =",
  "        javax.crypto.Cipher.getInstance(\"AES/CBC/PKCS5Padding\");",
  "    cipher.init(javax.crypto.Cipher.DECRYPT_MODE, keySpec, ivSpec);",
  "",
  "    byte[] decrypted = cipher.doFinal(ciphertext);",
  "    return new String(decrypted, java.nio.charset.StandardCharsets.UTF_8);",
  "}",
]));

children.push(heading("4.3 verifyAesFingerprint \u65b9\u6cd5\u5b9e\u73b0", HeadingLevel.HEADING_2));

children.push(body("\u670d\u52a1\u7aef\u54cd\u5e94\u5934\u4e2d\u7684 X-AES-Fingerprint \u5b57\u6bb5\u5305\u542b AES \u5bc6\u94a5\u7684 SHA-256 \u6307\u7eb9\u3002\u5ba2\u6237\u7aef\u5e94\u5728\u89e3\u5bc6\u524d\u5148\u6821\u9a8c\u6307\u7eb9\u662f\u5426\u5339\u914d\uff0c\u4ee5\u786e\u4fdd\u5bc6\u94a5\u4e00\u81f4\u6027\u3002\u5982\u679c\u6307\u7eb9\u4e0d\u5339\u914d\uff0c\u8bf4\u660e\u670d\u52a1\u7aef\u4f7f\u7528\u7684 AES \u5bc6\u94a5\u5df2\u66f4\u6362\uff0c\u5fc5\u987b\u7acb\u5373\u56de\u9000\u5e76\u544a\u77e5\u7ba1\u7406\u5458\uff1a"));

children.push(...codeBlock([
  "public static boolean verifyAesFingerprint(String keyHex,",
  "                                        String serverFingerprint) {",
  "    byte[] keyBytes = hexToBytes(keyHex);",
  "    String localFp = sha256Fingerprint(keyBytes);",
  "    // \u683c\u5f0f\u5316\u4e3a AA:BB:CC:... \u540e\u6bd4\u8f83\uff08\u5ffd\u7565\u5927\u5c0f\u5199\uff09",
  "    return localFp.equalsIgnoreCase(",
  "        serverFingerprint.replace(\":\", \"\"));",
  "}",
]));

children.push(heading("4.4 \u4f9d\u8d56\u8bf4\u660e", HeadingLevel.HEADING_2));

children.push(body("\u4ec5\u9700 JDK \u6807\u51c6\u5e93\uff08javax.crypto\u3001java.security\uff09\uff0c\u65e0\u7b2c\u4e09\u65b9\u52a0\u5bc6\u5e93\u4f9d\u8d56\u3002\u8fd9\u4e0d\u4ec5\u7b80\u5316\u4e86\u6784\u5efa\u914d\u7f6e\uff0c\u4e5f\u907f\u514d\u4e86\u56e0\u5f15\u5165\u5916\u90e8\u5e93\u800c\u5e26\u6765\u7684\u5b89\u5168\u5ba1\u8ba1\u98ce\u9669\u3002hexToBytes\u3001bytesToHex\u3001sha256Fingerprint \u5747\u4e3a\u7b80\u5355\u7684\u5b57\u8282\u64cd\u4f5c\u65b9\u6cd5\uff0c\u53ef\u76f4\u63a5\u4f7f\u7528 JDK \u63d0\u4f9b\u7684 BigInteger \u6216 MessageDigest \u5b9e\u73b0\u3002"));

// ════════════════════════════════════════════
// 五、CloudConfigFetcher.java 完整实现
// ════════════════════════════════════════════
children.push(heading("\u4e94\u3001CloudConfigFetcher.java \u5b8c\u6574\u5b9e\u73b0"));

children.push(heading("5.1 \u7c7b\u8bbe\u8ba1", HeadingLevel.HEADING_2));

children.push(...codeBlock([
  "package com.github.balloonupdate.mcpatch.client",
  "",
  "public class CloudConfigFetcher {",
  "    private final String apiUrl;",
  "    private final String apiKey;",
  "    private final String aesKey;",
  "    private final String cacheFile;",
  "    private final int cacheTtl;",
  "    private final int timeout;",
  "    private final boolean fallbackLocal;",
  "    private final boolean verifySignature;",
  "",
  "    public CloudConfigFetcher(Map<String, Object> cloudConfig)",
  "    public String fetch() throws CloudConfigException",
  "    private String fetchFromServer()",
  "        throws IOException, CloudConfigException",
  "    private String decryptResponse(Response response)",
  "        throws CloudConfigException",
  "    private void saveCache(byte[] encrypted, String iv)",
  "    private String loadCache() throws CloudConfigException",
  "    private boolean isCacheValid()",
  "    private String getLocalFallback()",
  "}",
]));

children.push(heading("5.2 fetch() \u4e3b\u65b9\u6cd5\u6d41\u7a0b", HeadingLevel.HEADING_2));

children.push(body("\u8be5\u65b9\u6cd5\u662f\u6574\u4e2a\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u7684\u5165\u53e3\uff0c\u5b9e\u73b0\u4e86\u300c\u4e91\u7aef\u4f18\u5148 \u2192 \u7f13\u5b58\u56de\u9000 \u2192 \u672c\u5730\u56de\u9000\u300d\u7684\u4e09\u7ea7\u964d\u7ea7\u7b56\u7565\uff1a"));

children.push(...codeBlock([
  "1. \u5982\u679c !enabled\uff0c\u76f4\u63a5\u8fd4\u56de null\uff08\u4f7f\u7528\u672c\u5730\u914d\u7f6e\uff09",
  "2. \u5c1d\u8bd5 fetchFromServer()",
  "   a. \u6784\u5efa HTTP GET \u8bf7\u6c42\uff0c\u8bbe\u7f6e Authorization \u548c User-Agent",
  "   b. \u8bf7\u6c42 ?encrypt=true",
  "   c. \u68c0\u67e5\u54cd\u5e94\u72b6\u6001\u7801",
  "   d. \u8c03\u7528 decryptResponse() \u89e3\u5bc6",
  "   e. \u9a8c\u8bc1 YAML \u683c\u5f0f\u6709\u6548\u6027\uff08\u975e\u7a7a\u3001\u5305\u542b urls \u7b49\u5173\u952e\u5b57\u6bb5\uff09",
  "   f. \u4fdd\u5b58\u5230\u672c\u5730\u7f13\u5b58 saveCache()",
  "   g. \u8fd4\u56de\u660e\u6587 YAML",
  "3. \u5982\u679c\u670d\u52a1\u7aef\u8bf7\u6c42\u5931\u8d25\uff1a",
  "   a. \u8bb0\u5f55\u65e5\u5fd7\uff08\u4e0d\u629b\u5f02\u5e38\uff09",
  "   b. \u5c1d\u8bd5 loadCache() \u8bfb\u53d6\u672c\u5730\u7f13\u5b58",
  "   c. \u5982\u679c\u7f13\u5b58\u6709\u6548\u4e14\u89e3\u5bc6\u6210\u529f\uff0c\u8fd4\u56de\u7f13\u5b58\u914d\u7f6e",
  "4. \u5982\u679c\u7f13\u5b58\u4e5f\u4e0d\u53ef\u7528\uff1a",
  "   a. \u5982\u679c fallbackLocal\uff0c\u8fd4\u56de null\uff08\u8ba9\u8c03\u7528\u65b9\u4f7f\u7528\u5185\u7f6e mcpatch.yml\uff09",
  "   b. \u5982\u679c !fallbackLocal\uff0c\u629b\u51fa\u5f02\u5e38",
]));

children.push(heading("5.3 fetchFromServer() \u65b9\u6cd5", HeadingLevel.HEADING_2));

children.push(body("\u8be5\u65b9\u6cd5\u4f7f\u7528 OkHttp\uff08\u9879\u76ee\u5df2\u6709\u4f9d\u8d56\uff09\u53d1\u8d77 HTTPS GET \u8bf7\u6c42\uff0c\u5e76\u5c06\u54cd\u5e94\u4f20\u9012\u7ed9 decryptResponse() \u8fdb\u884c\u89e3\u5bc6\u5904\u7406\uff1a"));

children.push(...codeBlock([
  "private String fetchFromServer()",
  "        throws IOException, CloudConfigException {",
  "    OkHttpClient client = new OkHttpClient.Builder()",
  "        .connectTimeout(timeout, TimeUnit.MILLISECONDS)",
  "        .readTimeout(timeout, TimeUnit.MILLISECONDS)",
  "        .writeTimeout(timeout, TimeUnit.MILLISECONDS)",
  "        .build();",
  "",
  "    Request request = new Request.Builder()",
  "        .url(apiUrl + \"?encrypt=true\")",
  "        .header(\"Authorization\", \"Bearer \" + apiKey)",
  "        .header(\"User-Agent\",",
  "            \"Mcpatch2JavaClient/\" + getVersion())",
  "        .build();",
  "",
  "    try (Response response = client.newCall(request).execute()) {",
  "        if (!response.isSuccessful()) {",
  "            throw new CloudConfigException(",
  "                \"\u670d\u52a1\u7aef\u8fd4\u56de\u9519\u8bef: \" + response.code());",
  "        }",
  "        return decryptResponse(response);",
  "    }",
  "}",
]));

children.push(heading("5.4 decryptResponse() \u65b9\u6cd5", HeadingLevel.HEADING_2));

children.push(body("\u8be5\u65b9\u6cd5\u8d1f\u8d23\u4ece HTTP \u54cd\u5e94\u4e2d\u63d0\u53d6\u5bc6\u6587\u548c IV\uff0c\u9a8c\u8bc1\u5bc6\u94a5\u6307\u7eb9\uff0c\u7136\u540e\u8c03\u7528 CloudCrypto \u8fdb\u884c\u89e3\u5bc6\uff1a"));

children.push(...codeBlock([
  "private String decryptResponse(Response response)",
  "        throws CloudConfigException {",
  "    // 1. \u63d0\u53d6\u54cd\u5e94\u5934",
  "    String ivHex = response.header(\"X-AES-IV\");",
  "    String fingerprint =",
  "        response.header(\"X-AES-Fingerprint\");",
  "    String configVersion =",
  "        response.header(\"X-Config-Version\");",
  "    if (ivHex == null)",
  "        throw new CloudConfigException(",
  "            \"\u7f3a\u5c11 X-AES-IV \u54cd\u5e94\u5934\");",
  "",
  "    // 2. \u9a8c\u8bc1 AES \u5bc6\u94a5\u6307\u7eb9",
  "    if (fingerprint != null &&",
  "        !CloudCrypto.verifyAesFingerprint(aesKey, fingerprint)) {",
  "        throw new CloudConfigException(",
  "            \"AES \u5bc6\u94a5\u6307\u7eb9\u4e0d\u5339\u914d\uff0c\u5bc6\u94a5\u53ef\u80fd\u5df2\u66f4\u6362\");",
  "    }",
  "",
  "    // 3. \u8bfb\u53d6\u5bc6\u6587",
  "    ResponseBody body = response.body();",
  "    if (body == null)",
  "        throw new CloudConfigException(\"\u54cd\u5e94\u4f53\u4e3a\u7a7a\");",
  "    byte[] encrypted = body.bytes();",
  "",
  "    // 4. \u4fdd\u5b58\u7f13\u5b58",
  "    saveCache(encrypted, ivHex);",
  "",
  "    // 5. \u89e3\u5bc6",
  "    try {",
  "        return CloudCrypto.decryptAES(encrypted, aesKey, ivHex);",
  "    } catch (Exception e) {",
  "        throw new CloudConfigException(",
  "            \"AES \u89e3\u5bc6\u5931\u8d25: \" + e.getMessage());",
  "    }",
  "}",
]));

children.push(heading("5.5 \u672c\u5730\u7f13\u5b58\u65b9\u6848", HeadingLevel.HEADING_2));

children.push(body("\u7f13\u5b58\u6587\u4ef6\u91c7\u7528\u4e8c\u8fdb\u5236\u683c\u5f0f\u5b58\u50a8\uff0c\u5305\u542b Magic \u5934\u3001AES IV \u548c\u5bc6\u6587\u6570\u636e\u3002\u540c\u65f6\u914d\u5408\u4e00\u4e2a Properties \u683c\u5f0f\u7684\u5143\u6570\u636e\u6587\u4ef6\u8bb0\u5f55\u7f13\u5b58\u65f6\u95f4\u548c\u914d\u7f6e\u7248\u672c\uff1a"));

children.push(...codeBlock([
  "\u7f13\u5b58\u6587\u4ef6\u683c\u5f0f\uff08\u4e8c\u8fdb\u5236\uff09\uff1a",
  "\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510",
  "\u2502 Magic (4B)   \u2502 IV (16B)         \u2502 Ciphertext (\u53d8\u957f)  \u2502",
  "\u2502 \"MCPC\"       \u2502 AES IV \u539f\u59cb\u5b57\u8282   \u2502 Base64\u89e3\u7801\u540e\u7684\u5bc6\u6587  \u2502",
  "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518",
  "",
  "\u7f13\u5b58\u5143\u6570\u636e\uff08\u540c\u76ee\u5f55 .mcpatch-config.meta\uff0cProperties\u683c\u5f0f\uff09\uff1a",
  "cached-at=1717000000000  (\u6beb\u79d2\u65f6\u95f4\u6233)",
  "config-version=5",
]));

children.push(bodyNoIndent("\u5199\u5165\u7f13\u5b58\u7684\u4ee3\u7801\uff1a"));

children.push(...codeBlock([
  "private void saveCache(byte[] encrypted, String ivHex) {",
  "    try {",
  "        byte[] iv = CloudCrypto.hexToBytes(ivHex);",
  "        ByteArrayOutputStream baos = new ByteArrayOutputStream();",
  "        baos.write(\"MCPC\".getBytes(StandardCharsets.UTF_8));",
  "        baos.write(iv);",
  "        baos.write(encrypted);",
  "        Files.write(Path.of(cacheFile), baos.toByteArray());",
  "",
  "        // \u5199\u5143\u6570\u636e",
  "        Properties meta = new Properties();",
  "        meta.setProperty(\"cached-at\",",
  "            String.valueOf(System.currentTimeMillis()));",
  "        meta.setProperty(\"config-version\",",
  "            configVersion != null ? configVersion : \"0\");",
  "        try (Writer w = Files.newBufferedWriter(",
  "                Path.of(cacheFile + \".meta\"))) {",
  "            meta.store(w, null);",
  "        }",
  "    } catch (IOException e) {",
  "        // \u7f13\u5b58\u5199\u5165\u5931\u8d25\u4e0d\u5f71\u54cd\u4e3b\u6d41\u7a0b",
  "        System.err.println(",
  "            \"[CloudConfig] \u7f13\u5b58\u5199\u5165\u5931\u8d25: \" + e.getMessage());",
  "    }",
  "}",
]));

children.push(bodyNoIndent("\u8bfb\u53d6\u7f13\u5b58\u7684\u4ee3\u7801\uff1a"));

children.push(...codeBlock([
  "private String loadCache() throws CloudConfigException {",
  "    File f = new File(cacheFile);",
  "    if (!f.exists() || !isCacheValid()) return null;",
  "",
  "    try {",
  "        byte[] data = Files.readAllBytes(f.toPath());",
  "        // \u9a8c\u8bc1 Magic",
  "        if (data.length < 20 ||",
  "            !new String(data, 0, 4,",
  "                StandardCharsets.UTF_8).equals(\"MCPC\")) {",
  "            return null;",
  "        }",
  "        byte[] iv = Arrays.copyOfRange(data, 4, 20);",
  "        byte[] encrypted =",
  "            Arrays.copyOfRange(data, 20, data.length);",
  "",
  "        return CloudCrypto.decryptAES(encrypted, aesKey,",
  "            CloudCrypto.bytesToHex(iv));",
  "    } catch (Exception e) {",
  "        // \u7f13\u5b58\u635f\u574f\uff0c\u5220\u9664",
  "        f.delete();",
  "        new File(cacheFile + \".meta\").delete();",
  "        return null;",
  "    }",
  "}",
  "",
  "private boolean isCacheValid() {",
  "    File metaFile = new File(cacheFile + \".meta\");",
  "    if (!metaFile.exists()) return false;",
  "    try {",
  "        Properties meta = new Properties();",
  "        meta.load(Files.newInputStream(metaFile.toPath()));",
  "        long cachedAt = Long.parseLong(",
  "            meta.getProperty(\"cached-at\", \"0\"));",
  "        return (System.currentTimeMillis() - cachedAt)",
  "            < cacheTtl * 1000L;",
  "    } catch (Exception e) {",
  "        return false;",
  "    }",
  "}",
]));

// ════════════════════════════════════════════
// 六、Main.java 启动流程改造
// ════════════════════════════════════════════
children.push(heading("\u516d\u3001Main.java \u542f\u52a8\u6d41\u7a0b\u6539\u9020"));

children.push(heading("6.1 \u6539\u9020\u4f4d\u7f6e", HeadingLevel.HEADING_2));

children.push(body("\u5728 Main.java \u7684 AppMain() \u65b9\u6cd5\u4e2d\uff0c\u5728\u300c\u8bfb\u53d6 mcpatch.yml \u2192 \u521b\u5efa AppConfig\u300d\u548c\u300c\u521b\u5efa Work \u5b9e\u4f8b\u300d\u4e4b\u95f4\u63d2\u5165\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u903b\u8f91\u3002\u6539\u9020\u7684\u6838\u5fc3\u601d\u8def\u662f\u5148\u8bfb\u53d6\u5185\u7f6e\u914d\u7f6e\u83b7\u53d6\u4e91\u7aef\u8fde\u63a5\u53c2\u6570\uff0c\u7136\u540e\u5c1d\u8bd5\u4ece\u4e91\u7aef\u62c9\u53d6\u5b8c\u6574\u7684\u8fd0\u884c\u65f6\u914d\u7f6e\uff0c\u6700\u7ec8\u5c06\u4e91\u7aef\u914d\u7f6e\u5408\u5e76\u5230\u57fa\u7840\u914d\u7f6e\u4e2d\u3002"));

children.push(heading("6.2 \u6539\u9020\u524d\u6d41\u7a0b", HeadingLevel.HEADING_2));

children.push(...codeBlock([
  "AppMain() {",
  "    1. mcpatch.yml \u2192 AppConfig\uff08\u672c\u5730\u6587\u4ef6\uff09",
  "    2. new Work(appConfig) \u2192 work.run()",
  "}",
]));

children.push(heading("6.3 \u6539\u9020\u540e\u6d41\u7a0b", HeadingLevel.HEADING_2));

children.push(...codeBlock([
  "AppMain() {",
  "    1. \u8bfb\u53d6\u5185\u7f6e mcpatch.yml\uff08\u5305\u542b cloud-config \u6bb5\uff09\u2192 baseConfig",
  "    2. if (baseConfig.cloudConfig.enabled) {",
  "         CloudConfigFetcher fetcher =",
  "             new CloudConfigFetcher(baseConfig.cloudConfig)",
  "         try {",
  "           String cloudYaml = fetcher.fetch()",
  "           if (cloudYaml != null) {",
  "             // \u7528\u4e91\u7aef\u914d\u7f6e\u8986\u76d6/\u5408\u5e76\u5230 baseConfig",
  "             AppConfig cloudAppConfig = parseYaml(cloudYaml)",
  "             mergeConfig(baseConfig, cloudAppConfig)",
  "           }",
  "         } catch (Exception e) {",
  "           log.warn(\"\u4e91\u7aef\u914d\u7f6e\u83b7\u53d6\u5931\u8d25\uff0c\u4f7f\u7528\u672c\u5730\u914d\u7f6e: \"",
  "               + e.getMessage())",
  "         }",
  "       }",
  "    3. new Work(baseConfig) \u2192 work.run()\uff08\u540e\u7eed\u903b\u8f91\u5b8c\u5168\u4e0d\u53d8\uff09",
  "}",
]));

children.push(heading("6.4 \u5177\u4f53\u4ee3\u7801\u6539\u52a8", HeadingLevel.HEADING_2));

children.push(body("\u4ee5\u4e0b\u662f\u5728 AppMain() \u65b9\u6cd5\u4e2d\u9700\u8981\u63d2\u5165\u7684\u5b8c\u6574 Java \u4ee3\u7801\u5757\u3002\u8be5\u4ee3\u7801\u5757\u653e\u7f6e\u5728\u8bfb\u53d6 mcpatch.yml \u5e76\u521b\u5efa AppConfig \u5b9e\u4f8b\u4e4b\u540e\uff0c\u521b\u5efa Work \u5b9e\u4f8b\u4e4b\u524d\uff1a"));

children.push(...codeBlock([
  "// \u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\uff08\u63d2\u5165\u4f4d\u7f6e\uff1a\u521b\u5efa AppConfig \u4e4b\u540e\uff09",
  "if (appConfig.cloudConfig != null",
  "        && appConfig.cloudConfig.enabled) {",
  "    try {",
  "        CloudConfigFetcher fetcher =",
  "            new CloudConfigFetcher(appConfig.cloudConfig);",
  "        String cloudYaml = fetcher.fetch();",
  "        if (cloudYaml != null && !cloudYaml.isEmpty()) {",
  "            AppConfig cloudConfig = parseYaml(cloudYaml);",
  "            // \u4e91\u7aef\u914d\u7f6e\u8986\u76d6\u672c\u5730\u914d\u7f6e\uff08\u4fdd\u7559 cloud-config \u6bb5\uff09",
  "            mergeConfig(appConfig, cloudConfig);",
  "            Log.info(\"[CloudConfig] \u4e91\u7aef\u914d\u7f6e\u52a0\u8f7d\u6210\u529f\");",
  "        }",
  "    } catch (CloudConfigException e) {",
  "        Log.warn(\"[CloudConfig] \u4e91\u7aef\u914d\u7f6e\u83b7\u53d6\u5931\u8d25: \"",
  "            + e.getMessage());",
  "    }",
  "}",
]));

children.push(heading("6.5 \u5408\u5e76\u7b56\u7565", HeadingLevel.HEADING_2));

children.push(body("\u4e91\u7aef\u4e0b\u53d1\u7684 YAML \u662f\u5b8c\u6574\u7684\u8fd0\u884c\u65f6\u914d\u7f6e\uff08\u5305\u542b urls\u3001version-file-path \u7b49\uff09\uff0c\u76f4\u63a5\u7528\u4e91\u7aef\u914d\u7f6e\u66ff\u6362 baseConfig \u4e2d\u9664 cloud-config \u4ee5\u5916\u7684\u6240\u6709\u5b57\u6bb5\u3002cloud-config \u6bb5\u59cb\u7ec8\u4ee5\u672c\u5730\u5185\u7f6e\u7248\u672c\u4e3a\u51c6\u3002\u8fd9\u6837\u8bbe\u8ba1\u7684\u597d\u5904\u662f\uff1a\u4e91\u7aef\u53ef\u4ee5\u5b8c\u5168\u63a7\u5236\u8fd0\u884c\u65f6\u884c\u4e3a\uff0c\u800c\u4e91\u7aef\u8fde\u63a5\u53c2\u6570\uff08\u5bc6\u94a5\u3001\u5730\u5740\uff09\u59cb\u7ec8\u7531\u5f00\u53d1\u8005\u638c\u63a7\uff0c\u4e0d\u4f1a\u88ab\u4e91\u7aef\u914d\u7f6e\u8986\u76d6\u3002"));

// ════════════════════════════════════════════
// 七、AppConfig.java 解析扩展
// ════════════════════════════════════════════
children.push(heading("\u4e03\u3001AppConfig.java \u89e3\u6790\u6269\u5c55"));

children.push(heading("7.1 \u65b0\u589e\u5185\u90e8\u7c7b", HeadingLevel.HEADING_2));

children.push(body("\u5728 AppConfig.java \u4e2d\u65b0\u589e CloudConfig \u5185\u90e8\u7c7b\uff0c\u7528\u4e8e\u6620\u5c04 cloud-config \u6bb5\u7684\u6240\u6709\u914d\u7f6e\u9879\u3002\u6bcf\u4e2a\u5b57\u6bb5\u5747\u8bbe\u7f6e\u4e86\u5408\u7406\u7684\u9ed8\u8ba4\u503c\uff0c\u786e\u4fdd\u5373\u4f7f YAML \u4e2d\u672a\u663e\u5f0f\u914d\u7f6e\u67d0\u4e9b\u5b57\u6bb5\uff0c\u7a0b\u5e8f\u4e5f\u80fd\u6b63\u5e38\u8fd0\u884c\uff1a"));

children.push(...codeBlock([
  "public static class CloudConfig {",
  "    public boolean enabled = false;",
  "    public String apiUrl = \"\";",
  "    public String apiKey = \"\";",
  "    public String aesKey = \"\";",
  "    public String cacheFile = \".mcpatch-config.enc\";",
  "    public int cacheTtl = 3600;",
  "    public int timeout = 7000;",
  "    public boolean fallbackLocal = true;",
  "    public boolean verifySignature = false;",
  "}",
]));

children.push(heading("7.2 \u5728 AppConfig \u4e2d\u6dfb\u52a0\u5b57\u6bb5", HeadingLevel.HEADING_2));

children.push(body("\u5728 AppConfig \u7c7b\u4e2d\u6dfb\u52a0 CloudConfig \u7c7b\u578b\u7684\u5b57\u6bb5\uff0c\u4f5c\u4e3a\u4e91\u7aef\u914d\u7f6e\u7684\u5165\u53e3\u3002\u5f53 cloud-config.enabled \u4e3a false \u6216\u8be5\u5b57\u6bb5\u4e3a null \u65f6\uff0c\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u903b\u8f91\u5c06\u88ab\u5b8c\u5168\u8df3\u8fc7\uff1a"));

children.push(...codeBlock([
  "public CloudConfig cloudConfig = new CloudConfig();",
]));

children.push(heading("7.3 YAML \u89e3\u6790", HeadingLevel.HEADING_2));

children.push(body("SnakeYAML\uff08\u9879\u76ee\u5df2\u6709\u4f9d\u8d56\uff09\u4f1a\u81ea\u52a8\u5c06 cloud-config \u6bb5\u6620\u5c04\u5230 CloudConfig \u5bf9\u8c61\uff0c\u65e0\u9700\u989d\u5916\u89e3\u6790\u4ee3\u7801\u3002\u53ea\u9700\u786e\u4fdd\u5b57\u6bb5\u540d\u4e0e YAML \u952e\u540d\u5bf9\u5e94\uff08\u9a7c\u5cf0\u547d\u540d\u901a\u8fc7 SnakeYAML \u7684 PropertyUtils \u81ea\u52a8\u8f6c\u6362\uff09\u3002\u4f8b\u5982 YAML \u4e2d\u7684 api-url \u4f1a\u81ea\u52a8\u6620\u5c04\u5230 Java \u5b57\u6bb5 apiUrl\uff0ccache-ttl \u6620\u5c04\u5230 cacheTtl\uff0cfallback-local \u6620\u5c04\u5230 fallbackLocal\u3002"));

// ════════════════════════════════════════════
// 八、异常处理与日志
// ════════════════════════════════════════════
children.push(heading("\u516b\u3001\u5f02\u5e38\u5904\u7406\u4e0e\u65e5\u5fd7"));

children.push(heading("8.1 \u81ea\u5b9a\u4e49\u5f02\u5e38", HeadingLevel.HEADING_2));

children.push(body("\u5b9a\u4e49 CloudConfigException \u7c7b\u7528\u4e8e\u7edf\u4e00\u5c01\u88c5\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u8fc7\u7a0b\u4e2d\u7684\u5404\u7c7b\u5f02\u5e38\u3002\u6240\u6709\u4e91\u7aef\u914d\u7f6e\u76f8\u5173\u7684\u9519\u8bef\u5747\u901a\u8fc7\u8be5\u5f02\u5e38\u629b\u51fa\uff0c\u4fbf\u4e8e\u8c03\u7528\u65b9\u7edf\u4e00\u6355\u83b7\u548c\u5904\u7406\uff1a"));

children.push(...codeBlock([
  "public class CloudConfigException extends Exception {",
  "    public CloudConfigException(String message) {",
  "        super(message);",
  "    }",
  "    public CloudConfigException(String message,",
  "                                Throwable cause) {",
  "        super(message, cause);",
  "    }",
  "}",
]));

children.push(heading("8.2 \u5f02\u5e38\u5904\u7406\u7b56\u7565", HeadingLevel.HEADING_2));

children.push(body("\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u8fc7\u7a0b\u4e2d\u53ef\u80fd\u9047\u5230\u7684\u5404\u7c7b\u5f02\u5e38\u573a\u666f\u53ca\u5bf9\u5e94\u7684\u5904\u7406\u65b9\u5f0f\u5982\u4e0b\u8868\u6240\u793a\u3002\u6838\u5fc3\u539f\u5219\u662f\uff1a\u4efb\u4f55\u5f02\u5e38\u90fd\u4e0d\u5e94\u8be5\u5bfc\u81f4\u5ba2\u6237\u7aef\u5d29\u6e83\uff0c\u5fc5\u987b\u6709\u660e\u786e\u7684\u56de\u9000\u65b9\u6848\uff1a"));

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    makeRow(["\u5f02\u5e38\u573a\u666f", "\u5904\u7406\u65b9\u5f0f", "\u65e5\u5fd7\u7ea7\u522b"], true, [30, 45, 25]),
    makeRow(["\u7f51\u7edc\u8d85\u65f6/\u8fde\u63a5\u5931\u8d25", "\u9759\u9ed8\u56de\u9000\u5230\u7f13\u5b58\u6216\u672c\u5730", "WARN"], false, [30, 45, 25]),
    makeRow(["API\u5bc6\u94a5\u65e0\u6548(403)", "\u56de\u9000\u5230\u672c\u5730\uff0c\u63d0\u793a\u7ba1\u7406\u5458\u68c0\u67e5", "ERROR"], false, [30, 45, 25]),
    makeRow(["AES\u89e3\u5bc6\u5931\u8d25", "\u5220\u9664\u635f\u574f\u7f13\u5b58\uff0c\u56de\u9000\u5230\u672c\u5730", "ERROR"], false, [30, 45, 25]),
    makeRow(["\u5bc6\u94a5\u6307\u7eb9\u4e0d\u5339\u914d", "\u56de\u9000\u5230\u672c\u5730\uff0c\u5f3a\u70c8\u5efa\u8bae\u66f4\u65b0", "ERROR"], false, [30, 45, 25]),
    makeRow(["\u7f13\u5b58\u6587\u4ef6\u635f\u574f", "\u81ea\u52a8\u5220\u9664\u5e76\u91cd\u65b0\u62c9\u53d6", "WARN"], false, [30, 45, 25]),
    makeRow(["YAML\u683c\u5f0f\u65e0\u6548", "\u4e22\u5f03\u4e91\u7aef\u914d\u7f6e\uff0c\u4f7f\u7528\u672c\u5730", "WARN"], false, [30, 45, 25]),
  ]
}));

children.push(heading("8.3 \u65e5\u5fd7\u683c\u5f0f", HeadingLevel.HEADING_2));

children.push(body("\u4f7f\u7528 Mcpatch2 \u73b0\u6709\u7684 logging \u6846\u67b6\uff08com.github.balloonupdate.mcpatch.client.logging\uff09\uff0c\u4fdd\u6301\u65e5\u5fd7\u683c\u5f0f\u7edf\u4e00\u3002\u6240\u6709\u4e91\u7aef\u914d\u7f6e\u76f8\u5173\u65e5\u5fd7\u5747\u4ee5 [CloudConfig] \u4e3a\u524d\u7f00\uff0c\u4fbf\u4e8e\u8fc7\u6ee4\u548c\u6392\u67e5\uff1a"));

children.push(...codeBlock([
  "[CloudConfig] \u6b63\u5728\u4ece\u4e91\u7aef\u62c9\u53d6\u914d\u7f6e...",
  "[CloudConfig] \u4e91\u7aef\u914d\u7f6e\u83b7\u53d6\u6210\u529f (\u7248\u672c: v5, \u8017\u65f6: 230ms)",
  "[CloudConfig] \u4e91\u7aef\u4e0d\u53ef\u8fbe\uff0c\u4f7f\u7528\u672c\u5730\u7f13\u5b58 (\u7f13\u5b58\u65f6\u95f4: 2024-05-29 10:00:00)",
  "[CloudConfig] AES \u5bc6\u94a5\u6307\u7eb9\u4e0d\u5339\u914d\uff01\u8bf7\u68c0\u67e5\u5bc6\u94a5\u662f\u5426\u5df2\u66f4\u65b0",
  "[CloudConfig] \u7f13\u5b58\u89e3\u5bc6\u5931\u8d25\uff0c\u5df2\u6e05\u9664\u635f\u574f\u7684\u7f13\u5b58\u6587\u4ef6",
]));

// ════════════════════════════════════════════
// 九、构建与打包
// ════════════════════════════════════════════
children.push(heading("\u4e5d\u3001\u6784\u5efa\u4e0e\u6253\u5305"));

children.push(heading("9.1 build.gradle.kts \u53d8\u66f4", HeadingLevel.HEADING_2));

children.push(body("\u65e0\u9700\u989d\u5916\u4f9d\u8d56\u3002OkHttp 4.12.0\u3001SnakeYAML 2.0 \u5747\u5df2\u5728\u9879\u76ee\u73b0\u6709\u4f9d\u8d56\u4e2d\uff0cCloudCrypto \u4ec5\u4f7f\u7528 JDK \u6807\u51c6\u5e93\u3002\u65b0\u589e\u7684 Java \u6587\u4ef6\u653e\u7f6e\u5728 com.github.balloonupdate.mcpatch.client \u5305\u4e0b\uff0cGradle \u4f1a\u81ea\u52a8\u7f16\u8bd1\u5e76\u6253\u5305\u3002"));

children.push(heading("9.2 Shadow JAR \u6253\u5305", HeadingLevel.HEADING_2));

children.push(body("\u65b0\u589e\u7684 Java \u6587\u4ef6\u4f1a\u81ea\u52a8\u88ab Gradle \u7f16\u8bd1\u5e76\u5305\u542b\u5728 Fat JAR \u4e2d\u3002\u6267\u884c\u4ee5\u4e0b\u547d\u4ee4\u5373\u53ef\u6784\u5efa\uff1a"));

children.push(...codeBlock([
  "./gradlew shadowJar",
]));

children.push(bodyNoIndent("\u8f93\u51fa\u6587\u4ef6\uff1abuild/libs/Mcpatch-{version}.jar"));

children.push(heading("9.3 R8/ProGuard \u6df7\u6dc6\u89c4\u5219\u5efa\u8bae", HeadingLevel.HEADING_2));

children.push(body("\u4e3a\u9632\u6b62\u7528\u6237\u53cd\u7f16\u8bd1\u63d0\u53d6 AES \u5bc6\u94a5\u548c API \u5bc6\u94a5\uff0c\u5efa\u8bae\u6dfb\u52a0\u4ee5\u4e0b\u6df7\u6dc6\u89c4\u5219\u3002\u8fd9\u4e9b\u89c4\u5219\u4fdd\u6301\u5b57\u6bb5\u540d\u4e0d\u53d8\uff0c\u540c\u65f6\u5141\u8bb8\u7c7b\u540d\u548c\u65b9\u6cd5\u540d\u88ab\u6df7\u6dc6\uff0c\u4ece\u800c\u589e\u52a0\u9006\u5411\u5de5\u7a0b\u7684\u96be\u5ea6\uff1a"));

children.push(...codeBlock([
  "-keepclassmembers class",
  "    com.github.balloonupdate.mcpatch.client.CloudConfigFetcher {",
  "    private java.lang.String apiKey;",
  "    private java.lang.String aesKey;",
  "}",
  "-keepclassmembers class",
  "    com.github.balloonupdate.mcpatch.client.AppConfig$CloudConfig {",
  "    private java.lang.String apiKey;",
  "    private java.lang.String aesKey;",
  "}",
]));

// ════════════════════════════════════════════
// 十、测试验证清单
// ════════════════════════════════════════════
children.push(heading("\u5341\u3001\u6d4b\u8bd5\u9a8c\u8bc1\u6e05\u5355"));

children.push(body("\u4ee5\u4e0b\u6e05\u5355\u6db5\u76d6\u4e86\u4e91\u7aef\u914d\u7f6e\u62c9\u53d6\u529f\u80fd\u7684\u6240\u6709\u5173\u952e\u6d4b\u8bd5\u573a\u666f\uff0c\u786e\u4fdd\u5404\u79cd\u60c5\u51b5\u4e0b\u7684\u884c\u4e3a\u7b26\u5408\u9884\u671f\uff1a"));

children.push(new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    makeRow(["\u7f16\u53f7", "\u6d4b\u8bd5\u9879", "\u9884\u671f\u7ed3\u679c", "\u9a8c\u8bc1\u65b9\u6cd5"], true, [8, 32, 35, 25]),
    makeRow(["1", "\u4e91\u7aef\u62c9\u53d6+\u89e3\u5bc6\u6b63\u5e38", "\u6210\u529f\u83b7\u53d6YAML\u914d\u7f6e\u5e76\u6b63\u5e38\u8fd0\u884c", "\u68c0\u67e5\u65e5\u5fd7 + \u529f\u80fd\u9a8c\u8bc1"], false, [8, 32, 35, 25]),
    makeRow(["2", "\u672c\u5730\u7f13\u5b58\u52a0\u5bc6\u5b58\u50a8", ".mcpatch-config.enc \u4e3a\u4e8c\u8fdb\u5236\u6587\u4ef6", "hexdump\u67e5\u770b\u786e\u8ba4\u975e\u660e\u6587"], false, [8, 32, 35, 25]),
    makeRow(["3", "\u4e91\u7aef\u4e0d\u53ef\u8fbe+\u7f13\u5b58\u6709\u6548", "\u4f7f\u7528\u7f13\u5b58\u914d\u7f6e\u6b63\u5e38\u542f\u52a8", "\u65ad\u7f51\u540e\u91cd\u542f\u5ba2\u6237\u7aef"], false, [8, 32, 35, 25]),
    makeRow(["4", "\u4e91\u7aef\u4e0d\u53ef\u8fbe+\u7f13\u5b58\u8fc7\u671f", "\u56de\u9000\u5230\u5185\u7f6emcpatch.yml", "\u4fee\u6539\u7cfb\u7edf\u65f6\u95f4 + \u65ad\u7f51"], false, [8, 32, 35, 25]),
    makeRow(["5", "\u7f13\u5b58\u635f\u574f\u81ea\u52a8\u6e05\u7406", "\u5220\u9664\u635f\u574f\u6587\u4ef6\u5e76\u56de\u9000", "\u624b\u52a8\u7834\u574f\u7f13\u5b58\u6587\u4ef6"], false, [8, 32, 35, 25]),
    makeRow(["6", "API\u5bc6\u94a5\u65e0\u6548", "403\u56de\u9000+ERROR\u65e5\u5fd7", "\u4f7f\u7528\u9519\u8bef\u5bc6\u94a5"], false, [8, 32, 35, 25]),
    makeRow(["7", "AES\u5bc6\u94a5\u4e0d\u5339\u914d", "\u6307\u7eb9\u6821\u9a8c\u5931\u8d25+\u56de\u9000", "\u4fee\u6539\u672c\u5730\u5bc6\u94a5"], false, [8, 32, 35, 25]),
    makeRow(["8", "\u914d\u7f6e\u66f4\u65b0\u751f\u6548", "\u62c9\u53d6\u5230\u65b0\u7248\u672c\u914d\u7f6e", "\u670d\u52a1\u7aef\u66f4\u65b0\u540e\u91cd\u542f\u5ba2\u6237\u7aef"], false, [8, 32, 35, 25]),
  ]
}));

// ═══════════════════════════════════════════
// BUILD DOCUMENT
// ═══════════════════════════════════════════
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 24, color: c(P.body)
        },
        paragraph: { spacing: { line: 312 } }
      }
    }
  },
  sections: [
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
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 1, color: c(P.accent) }
            },
            children: [new TextRun({
              text: "Mcpatch2 Java \u5ba2\u6237\u7aef\u4e91\u7aef\u914d\u7f6e\u96c6\u6210\u5b9e\u73b0\u65b9\u6848",
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
            border: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" }
            },
            spacing: { before: 100 },
            children: [
              new TextRun({ text: "\u2014 ", size: 16, color: "AAAAAA" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: c(P.secondary) }),
              new TextRun({ text: " \u2014", size: 16, color: "AAAAAA" }),
            ]
          })]
        })
      },
      children
    }
  ]
});

// ── Write to file ──
const OUTPUT = "/home/z/my-project/download/mcpatch2-client-impl-plan.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log(`Document generated: ${OUTPUT}`);
  const stats = fs.statSync(OUTPUT);
  console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
