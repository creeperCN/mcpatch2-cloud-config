const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  SectionType, TableLayoutType, TableOfContents, LevelFormat,
} = require("docx");
const fs = require("fs");

// ── Palette: GO-1 Graphite Orange ──
const P = {
  bg: "1A2330",
  primary: "000000",
  body: "000000",
  secondary: "607080",
  accent: "D4875A",
  surface: "FDF8F3",
  titleColor: "FFFFFF",
  subtitleColor: "B0B8C0",
  metaColor: "90989F",
  footerColor: "687078",
  table: {
    headerBg: "D4875A",
    headerText: "FFFFFF",
    accentLine: "D4875A",
    innerLine: "DDD0C8",
    surface: "F8F0EB",
  },
};
const c = (hex) => hex.replace("#", "");

// ── Borders ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const emptyPara = () => new Paragraph({ spacing: { before: 0, after: 0 }, children: [] });

// ── Helpers ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, font: { eastAsia: "SimHei", ascii: "Calibri" }, color: c(P.primary) })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, font: { eastAsia: "SimHei", ascii: "Calibri" }, color: c(P.primary) })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 24, font: { eastAsia: "SimHei", ascii: "Calibri" }, color: c(P.primary) })],
  });
}
function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { eastAsia: "Microsoft YaHei", ascii: "Calibri" } })],
  });
}
function bodyNoIndent(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { eastAsia: "Microsoft YaHei", ascii: "Calibri" } })],
  });
}
function codeBlock(lines) {
  return lines.map((line, i) => new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 260, after: 0 },
    shading: i === 0
      ? { type: ShadingType.CLEAR, fill: "F5F5F5" }
      : { type: ShadingType.CLEAR, fill: "F8F8F8" },
    indent: { left: 360 },
    children: [new TextRun({ text: line, size: 20, font: { ascii: "Consolas", eastAsia: "Microsoft YaHei" }, color: "333333" })],
  }));
}
function makeHeaderRow(cells) {
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: cells.map(text => new TableCell({
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 21, color: c(P.table.headerText), font: { eastAsia: "SimHei", ascii: "Calibri" } })] })],
      shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
    })),
  });
}
function makeDataRow(cells, idx) {
  return new TableRow({
    cantSplit: true,
    children: cells.map(text => new TableCell({
      children: [new Paragraph({ alignment: AlignmentType.LEFT, spacing: { line: 280 }, children: [new TextRun({ text, size: 21, color: c(P.body), font: { eastAsia: "Microsoft YaHei", ascii: "Calibri" } })] })],
      shading: idx % 2 === 0 ? { type: ShadingType.CLEAR, fill: P.table.surface } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      width: { size: Math.floor(100 / cells.length), type: WidthType.PERCENTAGE },
    })),
  });
}
function makeTable(header, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [makeHeaderRow(header), ...rows.map((r, i) => makeDataRow(r, i))],
  });
}

// ── calcTitleLayout ──
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...'\u201c\u201d\u2018\u2019', ...'\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f', ...'\u7684\u4e0e\u548c\u53ca\u4e4b\u5728\u4e8e\u4e3a', ...'-_\u2014\u2013\u00b7/', ...' \t']);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

// ── R4 Cover ──
function buildCoverR4(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 38, 26);
  const titleSize = titlePt * 2;

  const titleBlockHeight = titleLines.length * (titlePt * 23 + 200);
  const englishLabelH = config.englishLabel ? (9 * 23 + 500) : 0;
  const subtitleH = config.subtitle ? (12 * 23 + 200) : 0;
  const upperContentH = englishLabelH + titleBlockHeight + subtitleH;
  const UPPER_MIN = 7500;
  const UPPER_H = Math.max(UPPER_MIN, upperContentH + 1500 + 800);

  const contentEstimate =
    (config.englishLabel ? (9 * 23 + 500) : 0) +
    titleLines.length * (titlePt * 23 + 200) +
    (config.subtitle ? (12 * 23 + 200) : 0);
  const spacerIntrinsic = 280;
  const topSpacing = Math.max(UPPER_H - contentEstimate - spacerIntrinsic - 800, 400);

  const upperBlock = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: UPPER_H, rule: "exact" },
      children: [new TableCell({
        shading: { fill: P.bg }, borders: noBorders,
        verticalAlign: "top",
        margins: { left: padL, right: padR },
        children: [
          new Paragraph({ spacing: { before: topSpacing } }),
          config.englishLabel ? new Paragraph({
            spacing: { after: 500 },
            children: [new TextRun({ text: config.englishLabel.split("").join(" "), size: 18, color: P.accent, font: { ascii: "Calibri" }, characterSpacing: 60 })],
          }) : null,
          ...titleLines.map((line, i) => new Paragraph({
            spacing: { after: i < titleLines.length - 1 ? 100 : 200, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
            children: [new TextRun({ text: line, size: titleSize, bold: true, color: P.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
          })),
          config.subtitle ? new Paragraph({
            spacing: { after: 100 },
            children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
          }) : null,
        ].filter(Boolean),
      })],
    })],
  });

  const divider = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 60, rule: "exact" },
      children: [new TableCell({ borders: noBorders, shading: { fill: P.accent }, children: [emptyPara()] })],
    })],
  });

  const lowerContent = [
    new Paragraph({ spacing: { before: 800 } }),
    ...(config.metaLines || []).map(line => new Paragraph({
      indent: { left: padL }, spacing: { after: 100 },
      children: [new TextRun({ text: line, size: 28, color: P.metaColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    })),
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      indent: { left: padL },
      children: [
        new TextRun({ text: config.footerLeft || "", size: 22, color: "909090", font: { ascii: "Calibri" } }),
        new TextRun({ text: "          " }),
        new TextRun({ text: config.footerRight || "", size: 22, color: "909090", font: { ascii: "Calibri" } }),
      ],
    }),
  ];

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { fill: "FFFFFF" }, borders: noBorders,
        verticalAlign: "top",
        children: [upperBlock, divider, ...lowerContent],
      })],
    })],
  })];
}

// ── Page Number Footer ──
function pageNumFooter(formatType) {
  const instrText = formatType === NumberFormat.UPPER_ROMAN
    ? "PAGE \\* ROMAN \\** MERGEFORMAT"
    : "PAGE \\* arabic \\* MERGEFORMAT";
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
    })],
    // instrText will be patched by post-process
  });
}

// ─────────────────────────────────────────────
// BODY CONTENT
// ─────────────────────────────────────────────

function buildBody() {
  const content = [];

  // ═══════════════════════════════════════
  // 第一章 方案概述
  // ═══════════════════════════════════════
  content.push(h1("第一章 方案概述"));

  content.push(body("Mcpatch2 云端配置系统采用六层纵深安全防御架构，确保客户端与云端之间的配置数据传输安全、存储安全和密钥安全。本方案重点阐述第三层（L3 密钥碎片化存储）在 Java 客户端的完整实现细节，同时涵盖整个六层防御体系在客户端侧的对接方式，为 Mcpatch2JavaClient 的安全模块开发提供可直接落地的技术指导。"));

  content.push(body("在传统的客户端安全方案中，加密密钥通常以明文形式硬编码在代码中或存储在本地配置文件里。这种方式存在严重的逆向风险：攻击者通过反编译 JAR 文件、使用字符串搜索工具、内存 dump 等手段，可以相对容易地提取出完整的加密密钥。一旦密钥泄露，整个加密体系将形同虚设，攻击者可以自行解密和篡改配置数据。"));

  content.push(body("本方案引入密钥碎片化（Key Sharding）技术作为核心防御手段，将一个完整的 AES-128 密钥拆分为三个独立的、毫无关联的 XOR 碎片。这三个碎片分别存储在完全不同的位置：两个嵌入 JAR 内部的不同类中以不同的形态伪装，第三个在首次启动时计算生成并写入本地隐藏文件。运行时，三个碎片仅在内存中短暂汇合完成解密操作，随后立即清零。这种设计确保了即使攻击者获得了 JAR 包和本地文件系统的完整访问权限，也无法通过简单的逆向手段还原出完整的密钥。"));

  content.push(body("方案涵盖以下核心内容：密钥碎片化的数学原理与 XOR 分片算法、三个碎片在客户端的具体存储位置与伪装策略、完整的 Java 实现代码示例、安全性分析与攻击场景推演、部署分发流程以及密钥轮换方案。开发者可以直接参照本方案中的代码模板进行集成开发。"));

  // ═══════════════════════════════════════
  // 第二章 密钥碎片化原理
  // ═══════════════════════════════════════
  content.push(h1("第二章 密钥碎片化原理"));

  content.push(h2("2.1 XOR 分片算法"));

  content.push(body("密钥碎片化的核心算法基于 XOR（异或）运算的可逆特性。对于一个 N 字节的密钥 K，系统生成两个与 K 等长的随机字节序列作为掩码 Mask1 和 Mask2，然后通过 XOR 运算计算出第三个碎片 Fragment3。整个分片过程的数学表达式如下："));

  content.push(...codeBlock([
    "Fragment1 = Mask1                          // 16 字节随机数",
    "Fragment2 = Mask2                          // 16 字节随机数",
    "Fragment3 = K XOR Mask1 XOR Mask2          // 运算得出第三个碎片",
    "",
    "还原: K = Fragment1 XOR Fragment2 XOR Fragment3",
  ]));

  content.push(body("这个算法的关键安全特性在于：XOR 运算的输入和输出具有均匀分布的统计特性。对于任何两个固定的碎片（例如 Fragment1 和 Fragment2），第三个碎片 Fragment3 的每个字节都是原始密钥字节与两个随机字节的 XOR 结果，因此 Fragment3 本身也是完全随机的。这意味着任何单个碎片都不包含任何关于原始密钥的信息。即使攻击者同时获得了两个碎片，由于缺少第三个碎片，剩余的不确定性与整个密钥空间相同，攻击者仍然需要遍历全部 2 的 128 次方种可能的密钥值。只有三个碎片全部凑齐，才能通过一次简单的 XOR 运算还原出完整的密钥。"));

  content.push(body("从信息论的角度来看，如果密钥 K 的熵为 128 位，那么每个碎片的熵也是 128 位（因为它们是随机生成的或与 K 和随机数 XOR 后的结果）。三个碎片各自独立携带 128 位的信息熵，但只有当三者 XOR 在一起时才能恢复出这 128 位的密钥信息。这种性质被称为完美信息隐藏。"));

  content.push(h2("2.2 碎片长度与格式"));

  content.push(body("Mcpatch2 系统使用 AES-128 加密算法，密钥长度固定为 16 字节。在存储和传输时，碎片以十六进制字符串的形式表示，因此每个碎片的长度为 32 个十六进制字符（如 a3f7c2e8b1d49560a3f7c2e8b1d49560）。这种十六进制表示方式便于嵌入到 Java 源代码的字符串常量中，也便于通过 Base64 编码写入本地文件系统。"));

  content.push(makeTable(
    ["属性", "值", "说明"],
    [
      ["密钥长度", "16 字节 / 128 位", "AES-128 标准密钥长度"],
      ["碎片数量", "3 个", "XOR 分片要求至少 3 个碎片"],
      ["单个碎片长度", "16 字节", "与原始密钥等长"],
      ["十六进制表示", "32 个字符", "便于代码嵌入和文件存储"],
      ["分片算法", "XOR 分片", "基于异或运算的完美信息隐藏"],
      ["还原算法", "三路 XOR", "Frag1 XOR Frag2 XOR Frag3 = K"],
    ]
  ));

  // ═══════════════════════════════════════
  // 第三章 六层安全防御体系
  // ═══════════════════════════════════════
  content.push(h1("第三章 六层安全防御体系"));

  content.push(body("Mcpatch2 云端配置系统构建了六层纵深安全防御架构，每一层独立运作，共同构成完整的安全防护体系。客户端在对接时需要实现相应的验证和加解密逻辑，以完成与服务端的安全握手。以下逐一阐述各层的原理和客户端对接要点。"));

  content.push(h2("3.1 L1 RSA-2048 签名验证"));

  content.push(body("RSA-2048 签名验证层的作用是防止配置内容在传输过程中被中间人篡改。服务端使用 RSA-2048 私钥对返回的 YAML 配置内容进行 SHA-256 签名，签名结果通过 HTTP 响应头 X-Config-Signature 传递给客户端。客户端需要使用预存的 RSA-2048 公钥对签名进行验证，确保收到的配置内容确实是服务端签发的原始内容。"));

  content.push(body("客户端的验证流程为：从响应头中提取 X-Config-Signature 字段（Base64 编码的签名）和签名算法标识 X-Signature-Algorithm（RSA-SHA256），然后使用预存的 RSA 公钥对响应体的原始字节进行验签。如果验签失败，说明配置在传输过程中被篡改，客户端应当丢弃该配置并标记服务端不可信。RSA 公钥可以公开分发，嵌入到客户端代码中或通过首次安全连接获取后本地缓存。"));

  content.push(body("客户端对接要点：需要实现 RSA-SHA256 签名验证方法，使用 Java 标准库中的 java.security.Signature 类。签名验证应在 AES 解密之前执行（如果响应是加密的，则先验证签名再解密）。需要注意的是，签名是对原始 YAML 文本内容计算的，而非对加密后的密文计算。"));

  content.push(h2("3.2 L2 HMAC-SHA256 请求签名"));

  content.push(body("HMAC-SHA256 请求签名层的作用是防止 API 被未授权的第三方直接调用。客户端在发送请求时，需要计算 HMAC 签名并附加到请求头中。签名内容为时间戳 + API Key + 请求路径的拼接字符串，使用预共享的 HMAC 密钥进行 SHA-256 哈希计算。签名结果通过 X-Signature 请求头传递，时间戳通过 X-Timestamp 请求头传递。"));

  content.push(body("客户端的签名计算步骤为：首先获取当前 Unix 时间戳（秒级），然后按照 timestamp + apiKey + requestPath 的格式拼接签名字符串，接着使用 HMAC-SHA256 算法和预共享密钥计算签名值，最后将时间戳和签名值分别设置到 X-Timestamp 和 X-Signature 请求头中。HMAC 密钥的安全性同样通过 L3 密钥碎片化来保护。"));

  content.push(body("客户端对接要点：HMAC 密钥也需要进行碎片化处理（与服务端相同的 XOR 分片方案），在内存中还原后计算签名，使用完毕立即清零。签名计算使用 javax.crypto.Mac 类，需要注意时间戳格式为秒级 Unix 时间戳。"));

  content.push(h2("3.3 L3 密钥碎片化存储"));

  content.push(body("密钥碎片化存储层是整个安全架构的核心密钥保护机制。服务端和客户端的所有敏感密钥（RSA 私钥、HMAC 密钥、AES 密钥）都通过 XOR 分片算法拆分为三个碎片，分别存储在不同的位置。服务端的三个碎片存储在数据库的不同字段中，客户端的三个碎片则分别嵌入 JAR 包和本地文件系统。"));

  content.push(body("本层的设计目标是确保：即使攻击者获得了完整的应用程序代码和本地存储文件，也无法通过静态分析还原出任何完整的密钥。密钥只在运行时的内存中短暂存在，使用完毕后立即被零覆盖清除。这从根本上消除了密钥泄露的风险窗口。具体的客户端碎片化存储策略和代码实现将在后续章节详细阐述。"));

  content.push(h2("3.4 L4 AES-128 缓存加密"));

  content.push(body("AES-128-CBC 缓存加密层的作用是保护客户端本地缓存的配置文件。当客户端从服务端拉取配置后，可以将配置以 AES-128-CBC 加密的形式缓存到本地，防止用户直接读取和修改配置内容。加密使用的 AES 密钥与 L3 碎片化保护的是同一个密钥，服务端通过 X-AES-Fingerprint 响应头发送密钥的 SHA-256 指纹，客户端可以用于验证本地存储的密钥与服务端密钥是否一致。"));

  content.push(body("客户端对接要点：当请求参数包含 encrypt=true 时，服务端返回的响应体为 Base64 编码的 AES-128-CBC 加密数据，初始化向量 IV 通过 X-AES-IV 响应头传递。客户端使用碎片化还原的 AES 密钥和 IV 进行解密。解密使用 javax.crypto.Cipher 类，算法为 AES/CBC/PKCS5Padding。AES 密钥不通过网络传输，仅在首次部署时通过安全通道分发到客户端代码中。"));

  content.push(h2("3.5 L5 时间戳防重放"));

  content.push(body("时间戳防重放层包含两个子机制：时间窗口验证和签名去重缓存。时间窗口验证要求客户端请求中的时间戳必须在服务端时间的 5 分钟窗口内（允许过去 5 分钟、未来 1 分钟以容忍时钟偏差）。签名去重缓存记录每个已使用的 HMAC 签名，有效期为 6 分钟，防止攻击者截获合法请求后重复发送。"));

  content.push(body("客户端对接要点：客户端需要确保本地时钟与服务端时钟的偏差不超过 1 分钟。由于时间戳精度为秒级，客户端应使用 System.currentTimeMillis() / 1000 获取时间戳。服务端在响应头 X-Timestamp-Server 中返回当前服务端时间戳，客户端可以利用这个值进行时钟校准。"));

  content.push(h2("3.6 L6 HTTPS 证书锁定"));

  content.push(body("HTTPS 证书锁定层用于防御中间人攻击（MITM）。传统的 SSL/TLS 证书验证依赖于受信任的证书颁发机构（CA），但攻击者可以通过安装自签名 CA 证书到用户设备上来绕过这一验证机制。证书锁定通过在客户端硬编码服务端的证书 SHA-256 指纹，使得只有持有正确证书的服务端才能通过验证。"));

  content.push(body("客户端对接要点：服务端提供证书指纹（SHA-256 格式，如 AA:BB:CC:DD:...），客户端在建立 HTTPS 连接时，验证服务端证书的指纹是否与预存指纹匹配。在 Java 中，这可以通过自定义 X509TrustManager 实现。对于 OkHttp 客户端，可以使用 CertificatePinner 类直接配置证书锁定。证书指纹可以通过服务端管理界面的安全配置面板获取和更新。"));

  // 六层总览表
  content.push(makeTable(
    ["层级", "名称", "防御目标", "客户端实现"],
    [
      ["L1", "RSA-2048 签名", "配置完整性验证", "公钥验签 + 签名比对"],
      ["L2", "HMAC-SHA256 签名", "API 访问控制", "请求签名计算 + 附加请求头"],
      ["L3", "密钥碎片化", "密钥防逆向提取", "XOR 分片存储 + 内存还原 + 零清除"],
      ["L4", "AES-128 加密", "本地缓存保护", "AES-CBC 加解密 + 指纹校验"],
      ["L5", "时间戳防重放", "重放攻击防御", "时间窗口 + 签名去重（服务端执行）"],
      ["L6", "证书锁定", "中间人攻击防御", "TrustManager / CertificatePinner"],
    ]
  ));

  // ═══════════════════════════════════════
  // 第四章 客户端碎片存储策略
  // ═══════════════════════════════════════
  content.push(h1("第四章 客户端碎片存储策略"));

  content.push(body("密钥碎片化存储策略的设计原则是：三个碎片分布在完全不同的存储介质和代码位置中，任何单一存储位置的泄露都不会暴露密钥的任何信息。以下是三个碎片的具体存储方案。"));

  content.push(h2("4.1 Fragment1 嵌入策略"));

  content.push(body("第一个碎片 Fragment1 以十六进制字符串的形式嵌入到一个看似与加密无关的工具类常量中。这个类的命名和功能应该与安全无关，例如可以伪装成构建信息校验类（BuildInfo）、版本控制类（VersionCheck）或序列号验证类（SerialValidator）。Fragment1 作为该类的一个 static final 字段存在，其字段名也应该具有误导性。"));

  content.push(body("例如，可以将 Fragment1 存储在一个名为 BUILD_SIGNATURE 的常量中，这个名称暗示它是用于构建产物完整性校验的签名值。实际上，这个十六进制字符串就是 AES 密钥的第一个 XOR 碎片。经过 R8/ProGuard 混淆后，类名和字段名都会被缩短为无意义的标识符（如 a.b、a.c），进一步增加了逆向分析的难度。攻击者在反编译后看到的是一个类中存储了一个无意义的十六进制字符串常量，无法判断其真实用途。"));

  content.push(...codeBlock([
    "public class BuildInfo {",
    "    // 看似构建签名的十六进制字符串，实际是 AES 密钥 Fragment1",
    "    public static final String BUILD_SIGNATURE =",
    "        \"a3f7c2e8b1d49560a3f7c2e8b1d49560\";",
    "",
    "    // 其他看似合理的常量",
    "    public static final String BUILD_VERSION = \"2.1.0\";",
    "    public static final int BUILD_NUMBER = 2147483647;",
    "}",
  ]));

  content.push(h2("4.2 Fragment2 伪装策略"));

  content.push(body("第二个碎片 Fragment2 采用完全不同于 Fragment1 的存储形态，以增加逆向分析的复杂度。推荐的方式是将 Fragment2 编码为一个 int 数组，伪装成界面主题色值、资源 ID 列表或其他看起来无害的配置数据。这种方式的优势在于：十六进制字符串容易被 grep 或 strings 工具搜索到，而 int 数组的值是十进制整数（每个值在 0-255 之间），在静态分析中看起来就像是普通的配置参数。"));

  content.push(body("Fragment2 的载体类可以命名为 ThemeConfig、ResourceIds 或 DisplayMetrics 等与 UI 或资源相关的类名。这些类名在 Minecraft 模组项目中非常常见，不会引起特别的注意。获取 Fragment2 的方法也应设计为返回 byte[] 类型的方法，而不是直接暴露 int 数组，这样在调用层面也增加了一层抽象。"));

  content.push(...codeBlock([
    "public class ThemeConfig {",
    "    // 伪装成主题色值数组，每个值对应 Fragment2 的一个字节",
    "    private static final int[] THEME_ACCENT_COLORS = {",
    "        0xB4, 0xE2, 0x9A, 0x56, 0xD7, 0xF1, 0x83, 0x0C,",
    "        0xB4, 0xE2, 0x9A, 0x56, 0xD7, 0xF1, 0x83, 0x0C",
    "    };",
    "",
    "    public static byte[] getThemeSeed() {",
    "        byte[] result = new byte[THEME_ACCENT_COLORS.length];",
    "        for (int i = 0; i < THEME_ACCENT_COLORS.length; i++) {",
    "            result[i] = (byte) THEME_ACCENT_COLORS[i];",
    "        }",
    "        return result;",
    "    }",
    "}",
  ]));

  content.push(h2("4.3 Fragment3 本地存储策略"));

  content.push(body("第三个碎片 Fragment3 是最特殊的一个，它不在 JAR 包内预置，而是在客户端首次启动时动态计算生成，然后写入到本地文件系统的隐藏位置。这种设计的好处是：即使 JAR 包被完全逆向，攻击者也只能获得 Fragment1 和 Fragment2，缺少 Fragment3 仍然无法还原密钥。Fragment3 由 Fragment1、Fragment2 和完整 AES 密钥计算得出，计算公式为 Fragment3 = AES_Key XOR Fragment1 XOR Fragment2。"));

  content.push(body("Fragment3 的存储位置选择需要兼顾隐蔽性和可靠性。推荐将 Fragment3 存储在 Minecraft 运行目录的子目录中，文件名随机化以避免被搜索到。具体的存储路径可以是 .minecraft/assets/indexes/ 目录下的一个随机文件名（如 v3a7f.json），或者更隐蔽的位置。文件内容使用 Base64 编码，避免直接暴露为二进制数据。存储路径本身也可以进行简单的混淆编码。"));

  content.push(body("Fragment3 的生命周期管理需要注意以下几点：第一，Fragment3 在首次启动时由一个离线初始化工具生成并写入，这个工具只运行一次，运行完成后可以删除。第二，客户端每次启动时检查 Fragment3 文件是否存在，如果文件丢失（例如用户清理了缓存），则无法解密配置，应提示重新初始化。第三，当密钥轮换时，需要重新计算并覆盖 Fragment3 文件。"));

  // ═══════════════════════════════════════
  // 第五章 Java 实现详解
  // ═══════════════════════════════════════
  content.push(h1("第五章 Java 实现详解"));

  content.push(body("本章提供完整的 Java 实现代码，涵盖密钥分片与还原工具类、碎片存储管理、安全加解密助手以及 Fragment3 生命周期管理。所有代码均为可直接集成到 Mcpatch2JavaClient 中的生产级实现。"));

  content.push(h2("5.1 KeySharding 工具类"));

  content.push(body("KeySharding 工具类封装了 XOR 分片和还原的核心算法，是整个密钥碎片化方案的基础模块。该类提供两个静态方法：splitKey 用于将密钥拆分为三个碎片（仅在离线初始化工具中使用），assembleKey 用于从三个碎片还原密钥（在运行时解密时使用）。"));

  content.push(...codeBlock([
    "import java.security.SecureRandom;",
    "import java.util.Arrays;",
    "",
    "public class KeySharding {",
    "",
    "    /**",
    "     * 将 16 字节密钥拆分为 3 个 XOR 碎片",
    "     * @param keyBytes 原始密钥 (16 bytes for AES-128)",
    "     * @return 包含 3 个碎片的数组，每个 16 bytes",
    "     */",
    "    public static byte[][] splitKey(byte[] keyBytes) {",
    "        if (keyBytes == null || keyBytes.length != 16) {",
    "            throw new IllegalArgumentException(",
    '                "AES-128 密钥必须为 16 字节");',
    "        }",
    "        byte[] frag1 = new byte[16];",
    "        byte[] frag2 = new byte[16];",
    "        byte[] frag3 = new byte[16];",
    "        new SecureRandom().nextBytes(frag1);",
    "        new SecureRandom().nextBytes(frag2);",
    "        for (int i = 0; i < 16; i++) {",
    "            frag3[i] = (byte)",
    "                (keyBytes[i] ^ frag1[i] ^ frag2[i]);",
    "        }",
    "        return new byte[][]{frag1, frag2, frag3};",
    "    }",
    "",
    "    /**",
    "     * 从 3 个碎片还原密钥",
    "     */",
    "    public static byte[] assembleKey(",
    "            byte[] frag1, byte[] frag2, byte[] frag3) {",
    "        if (frag1.length != frag2.length",
    "            || frag2.length != frag3.length) {",
    "            throw new IllegalArgumentException(",
    '                "碎片长度不一致，无法还原密钥");',
    "        }",
    "        byte[] key = new byte[frag1.length];",
    "        for (int i = 0; i < frag1.length; i++) {",
    "            key[i] = (byte)",
    "                (frag1[i] ^ frag2[i] ^ frag3[i]);",
    "        }",
    "        return key;",
    "    }",
    "}",
  ]));

  content.push(h2("5.2 FragmentStore 碎片存储管理"));

  content.push(body("FragmentStore 类负责 Fragment3 的本地存储管理，包括首次启动时生成 Fragment3 文件、运行时加载 Fragment3、以及密钥轮换时的更新操作。Fragment3 的存储位置采用混淆路径设计，文件名使用随机十六进制前缀以避免被搜索到。"));

  content.push(...codeBlock([
    "import java.io.*;",
    "import java.nio.file.*;",
    "import java.util.Base64;",
    "import java.util.Random;",
    "",
    "public class FragmentStore {",
    "",
    '    private static final String FRAG_DIR =',
    '        ".minecraft" + File.separator',
    '        + "assets" + File.separator + "indexes";',
    '    private static final String FRAG_PREFIX = "v";',
    "",
    "    /**",
    "     * 首次启动时计算 Fragment3 并写入文件",
    "     * frag3 = aesKey XOR frag1 XOR frag2",
    "     */",
    "    public static void initFragment3(",
    "            byte[] frag1, byte[] frag2,",
    "            byte[] fullAesKey) throws IOException {",
    "        byte[] frag3 = new byte[fullAesKey.length];",
    "        for (int i = 0; i < fullAesKey.length; i++) {",
    "            frag3[i] = (byte)",
    "                (fullAesKey[i] ^ frag1[i] ^ frag2[i]);",
    "        }",
    "        String fileName = FRAG_PREFIX",
    '            + Integer.toHexString(',
    '                new Random().nextInt(0xFFFF));',
    "        Path path = Paths.get(FRAG_DIR, fileName);",
    "        Files.createDirectories(path.getParent());",
    '        String encoded =',
    '            Base64.getEncoder().encodeToString(frag3);',
    "        Files.writeString(path, encoded);",
    "    }",
    "",
    "    /**",
    "     * 运行时加载 Fragment3",
    "     */",
    "    public static byte[] loadFragment3()",
    "            throws IOException {",
    "        File dir = new File(FRAG_DIR);",
    "        if (!dir.exists() || !dir.isDirectory()) {",
    "            return null;",
    "        }",
    '        for (File f : dir.listFiles()) {',
    '            String name = f.getName();',
    "            if (name.startsWith(FRAG_PREFIX)",
    "                && name.length() < 10) {",
    '                String encoded =',
    '                    Files.readString(f.toPath());',
    "                return Base64.getDecoder()",
    "                    .decode(encoded);",
    "            }",
    "        }",
    "        return null;",
    "    }",
    "}",
  ]));

  content.push(h2("5.3 SecureAesHelper 安全解密"));

  content.push(body("SecureAesHelper 是整个方案的核心安全类，负责在内存中安全地还原 AES 密钥、执行解密操作，并在操作完成后立即清零所有敏感数据。该类的设计遵循最小权限原则：完整的 AES 密钥只作为局部变量存在，方法结束时通过 finally 块确保清零，不会泄漏到堆内存中长期存在。"));

  content.push(...codeBlock([
    "import javax.crypto.Cipher;",
    "import javax.crypto.spec.IvParameterSpec;",
    "import javax.crypto.spec.SecretKeySpec;",
    "import java.nio.charset.StandardCharsets;",
    "import java.util.Arrays;",
    "import java.util.Base64;",
    "",
    "public class SecureAesHelper {",
    "",
    "    /**",
    "     * 安全解密配置数据",
    "     * 密钥仅在方法作用域内存在，",
    "     * 方法结束前用 Arrays.fill 清零",
    "     */",
    "    public static String decryptConfig(",
    "            String encryptedBase64, String ivHex)",
    "            throws Exception {",
    "        // Step 1: 收集三个碎片",
    "        byte[] frag1 = hexToBytes(",
    "            BuildInfo.BUILD_SIGNATURE);",
    "        byte[] frag2 = ThemeConfig.getThemeSeed();",
    "        byte[] frag3 = FragmentStore.loadFragment3();",
    "",
    "        if (frag3 == null) {",
    '            throw new SecurityException(',
    '                "密钥碎片缺失，无法解密");',
    "        }",
    "",
    "        // Step 2: 内存中还原完整密钥",
    "        byte[] aesKey = KeySharding.assembleKey(",
    "            frag1, frag2, frag3);",
    "",
    "        try {",
    "            // Step 3: AES-128-CBC 解密",
    "            IvParameterSpec iv =",
    "                new IvParameterSpec(",
    "                    hexToBytes(ivHex));",
    "            SecretKeySpec keySpec =",
    "                new SecretKeySpec(",
    "                    aesKey, \"AES\");",
    "            Cipher cipher = Cipher.getInstance(",
    '                "AES/CBC/PKCS5Padding");',
    "            cipher.init(",
    "                Cipher.DECRYPT_MODE, keySpec, iv);",
    "",
    "            byte[] decrypted = cipher.doFinal(",
    "                Base64.getDecoder()",
    "                    .decode(encryptedBase64));",
    "            return new String(",
    "                decrypted, StandardCharsets.UTF_8);",
    "",
    "        } finally {",
    "            // Step 4: 立即清零所有密钥内存",
    "            Arrays.fill(aesKey, (byte) 0);",
    "            Arrays.fill(frag1, (byte) 0);",
    "            Arrays.fill(frag2, (byte) 0);",
    "            Arrays.fill(frag3, (byte) 0);",
    "        }",
    "    }",
    "",
    "    private static byte[] hexToBytes(String hex) {",
    "        int len = hex.length();",
    "        byte[] data = new byte[len / 2];",
    "        for (int i = 0; i < len; i += 2) {",
    "            data[i / 2] = (byte) (",
    "                Character.digit(hex.charAt(i), 16)",
    "                << 4)",
    "                + Character.digit(",
    "                    hex.charAt(i+1), 16));",
    "        }",
    "        return data;",
    "    }",
    "}",
  ]));

  content.push(h2("5.4 Fragment3 生命周期管理"));

  content.push(body("Fragment3 的完整生命周期包含初始化、使用、失效和更新四个阶段。初始化阶段在客户端首次部署时执行，由开发者使用离线工具生成 Fragment3 文件。使用阶段在每次客户端启动并需要解密配置时发生，通过 FragmentStore.loadFragment3() 加载 Fragment3 到内存中。失效阶段发生在用户清理缓存或重装系统导致 Fragment3 文件丢失时，此时客户端应拒绝解密操作并给出明确的错误提示。更新阶段发生在密钥轮换时，需要使用新的 AES 密钥重新计算 Fragment3 并覆盖原有文件。"));

  content.push(body("密钥轮换的客户端操作流程为：首先通过安全渠道获取新的 AES 密钥（例如管理员通过加密通道发送），然后使用 KeySharding.splitKey() 对新密钥进行分片，将新的 Fragment1 和 Fragment2 嵌入到源代码中（替换旧的碎片常量），重新编译并混淆后发布新版本。新版本首次运行时，使用新的 Fragment1、Fragment2 和新的完整 AES 密钥重新调用 FragmentStore.initFragment3() 生成新的 Fragment3 文件。整个过程中，旧的 Fragment3 文件在初始化新 Fragment3 后应被删除，避免多个版本碎片共存导致混乱。"));

  // ═══════════════════════════════════════
  // 第六章 安全性分析
  // ═══════════════════════════════════════
  content.push(h1("第六章 安全性分析"));

  content.push(h2("6.1 逆向攻击防护分析"));

  content.push(body("密钥碎片化方案针对常见的逆向攻击手段提供了多层次的防护。以下逐一分析每种攻击场景下的防护效果："));

  content.push(makeTable(
    ["攻击方式", "防护效果", "防护原理"],
    [
      ["JAR 反编译", "有效", "只能找到 Frag1 和 Frag2 两个随机数，缺少 Frag3 无法还原密钥"],
      ["strings / 搜索十六进制", "部分有效", "Frag1 可被搜索到但无意义；Frag2 为 int 数组无法直接搜索"],
      ["本地文件扫描", "有效", "Frag3 文件名随机化，存储路径隐藏在 MC 素材目录中"],
      ["内存 dump", "有限防护", "密钥仅在解密瞬间存在于内存，finally 块立即清零，窗口极短"],
      ["R8/ProGuard 混淆后", "高度有效", "类名、字段名、方法名全部缩短为无意义标识符，逻辑不可读"],
      ["调试器附加", "有限防护", "运行时可被调试器断点拦截，建议额外添加反调试检测"],
      ["网络抓包", "完全有效", "AES 密钥从不通过网络传输，抓包无法获取密钥"],
    ]
  ));

  content.push(h2("6.2 内存安全分析"));

  content.push(body("内存安全是密钥保护方案的关键环节。密钥在内存中的暴露时间窗口越长，被内存 dump 或调试器提取的风险越大。本方案通过以下措施最大限度地缩短密钥的内存驻留时间：首先，完整的 AES 密钥仅作为 SecureAesHelper.decryptConfig() 方法内的局部变量存在，不存在于类的字段、单例对象或静态变量中，方法返回后密钥即被垃圾回收。其次，finally 块中调用 Arrays.fill() 将密钥和所有碎片的每个字节都设置为零，确保即使 GC 尚未回收，内存中的密钥数据也已经失效。"));

  content.push(body("需要注意的是，Java 的垃圾回收机制可能导致包含密钥的 byte[] 被复制到堆内存的不同位置（如 GC 时的对象移动）。Arrays.fill() 只能清除当前引用指向的数组，无法清除被 GC 复制到其他位置的副本。为了进一步降低这种风险，建议在密钥使用完毕后立即触发一次 System.gc()，并在高性能场景下考虑使用 sun.misc.Unsafe.allocateMemory() 在堆外内存中进行加解密操作，这样可以完全避免 GC 对密钥数据的复制。"));

  content.push(h2("6.3 R8 混淆增强"));

  content.push(body("R8（或 ProGuard）代码混淆是密钥碎片化方案的必要补充。混淆的作用是将有意义的类名、方法名和字段名替换为无意义的短标识符，使得反编译后的代码难以理解。在本方案中，混淆后的效果为：BuildInfo 类变为 a 类，BUILD_SIGNATURE 字段变为 b 字段，ThemeConfig 类变为 c 类，getThemeSeed() 方法变为 d() 方法，SecureAesHelper 类变为 e 类。攻击者在反编译后看到的是一个由无意义的类名和方法名组成的调用链，需要花费大量时间进行人工逆向分析。"));

  content.push(body("推荐的 R8 混淆配置应确保以下规则：第一，保留 Main 类和 Minecraft 模组的入口点（@Mod 注解标记的类），其余类全部混淆。第二，使用 -repackageclasses 指令将所有混淆后的类移动到统一的包下，避免通过包名推断功能。第三，启用 -optimizations 指令进行代码优化，消除死代码和内联小方法，进一步增加逆向难度。第四，Fragment1 和 Fragment2 所在的类不应被标记为 -keep，必须参与混淆。"));

  content.push(...codeBlock([
    "# proguard-rules.conf 示例配置",
    "-keep public class com.example.ModEntry { *; }",
    "-repackageclasses 'a'",
    "-allowaccessmodification",
    "-optimizations !code/simplification/arithmetic",
    "-keepattributes *Annotation*",
  ]));

  // ═══════════════════════════════════════
  // 第七章 部署与密钥分发流程
  // ═══════════════════════════════════════
  content.push(h1("第七章 部署与密钥分发流程"));

  content.push(body("密钥的分发和部署是一个一次性操作，在系统初始化阶段由开发者手动完成。此后的运行阶段完全自动化，不需要人工干预。整个部署流程分为三个阶段：密钥分片阶段、代码嵌入阶段和编译发布阶段。"));

  content.push(h2("7.1 密钥分片阶段"));

  content.push(body("密钥分片阶段是部署的第一步，由开发者在安全的环境中使用离线工具完成。该工具接受完整的 AES 密钥作为输入，输出三个碎片和对应的嵌入代码模板。具体步骤为：从服务端管理面板的安全配置页面获取当前的 AES 密钥（32 个十六进制字符），运行 KeySharding.splitKey() 方法生成三个碎片，分别生成 Fragment1 和 Fragment2 的嵌入代码，以及 Fragment3 的初始化命令。"));

  content.push(body("需要注意，该离线工具不应被包含在最终发布的 JAR 包中，运行完成后应删除工具代码和完整的 AES 密钥。整个分片过程应在隔离的开发环境中进行，避免密钥在分片过程中被截获。"));

  content.push(h2("7.2 代码嵌入与编译阶段"));

  content.push(body("代码嵌入阶段将分片结果集成到客户端源代码中。具体操作为：将 Fragment1 的十六进制字符串替换到 BuildInfo.BUILD_SIGNATURE 常量中，将 Fragment2 的 int 数组替换到 ThemeConfig.THEME_ACCENT_COLORS 常量中，确认 FragmentStore 类的存储路径配置正确，然后运行 R8/ProGuard 混淆编译。编译完成后，应进行功能验证测试：确认客户端能够正确从服务端拉取加密配置、正确还原密钥并解密、解密后的 YAML 内容与服务端管理面板中显示的内容一致。"));

  content.push(h2("7.3 运行时阶段"));

  content.push(body("运行时阶段是客户端正常使用期间的行为。每次客户端启动并需要拉取云端配置时，执行以下自动化流程：从 JAR 内部的 BuildInfo 类加载 Fragment1，从 JAR 内部的 ThemeConfig 类加载 Fragment2，从本地文件系统的隐藏位置加载 Fragment3。如果 Fragment3 不存在，则抛出安全异常，提示用户需要重新初始化。三个碎片齐全后，在内存中 XOR 还原出完整的 AES 密钥，使用该密钥解密服务端返回的 AES-128-CBC 加密响应体。解密完成后，立即用零覆盖清除 AES 密钥和所有碎片的内存数据。最终，解析解密后的 YAML 内容并加载到内存中使用。"));

  content.push(h2("7.4 密钥轮换流程"));

  content.push(body("密钥轮换是指定期更换 AES 密钥的操作，建议每 3-6 个月执行一次。服务端通过安全配置面板的密钥轮换功能生成新的 AES 密钥（同时也可以轮换 RSA 密钥对和 HMAC 密钥）。密钥轮换后，客户端需要更新嵌入的碎片并重新发布新版本。轮换流程为：在服务端执行密钥轮换操作，获取新的 AES 密钥，重新运行分片工具生成新的 Fragment1、Fragment2、Fragment3，将新的 Fragment1 和 Fragment2 嵌入源代码，重新编译混淆发布新版本。需要注意的是，新旧版本之间存在过渡期，服务端应同时支持新旧密钥的解密，直到所有客户端都更新到新版本。"));

  // ═══════════════════════════════════════
  // 第八章 客户端 API 通信协议
  // ═══════════════════════════════════════
  content.push(h1("第八章 客户端 API 通信协议"));

  content.push(body("客户端与服务端之间的通信通过标准的 HTTP/HTTPS 协议进行。核心端点为 GET /api/client，客户端通过该端点拉取当前的 YAML 配置。请求和响应中包含了六层安全防御所需的各种参数和元数据。"));

  content.push(h2("8.1 请求格式"));

  content.push(body("客户端发送 GET 请求到 /api/client?encrypt=true（启用 AES 加密）。请求头需要包含以下字段：Authorization 头携带 API Key（Bearer token 格式）、X-Timestamp 头携带当前 Unix 时间戳（秒级）、X-Signature 头携带 HMAC-SHA256 签名（十六进制字符串）。当安全模式未启用时，仅提供 API Key 即可访问（不启用加密和签名）。"));

  content.push(makeTable(
    ["请求头", "格式", "必填", "说明"],
    [
      ["Authorization", "Bearer <api_key>", "是", "API 密钥，mcpatch_ 开头"],
      ["X-Timestamp", "秒级 Unix 时间戳", "安全模式下必填", "用于时间戳验证"],
      ["X-Signature", "HMAC-SHA256 hex", "安全模式下必填", "请求签名"],
    ]
  ));

  content.push(h2("8.2 响应格式"));

  content.push(body("服务端响应包含两部分：响应头中的安全元数据和响应体中的配置内容。当启用 AES 加密时（encrypt=true），响应体的 Content-Type 为 application/octet-stream，内容为 Base64 编码的 AES-128-CBC 加密数据。当未启用加密时，响应体为纯文本 YAML 内容。"));

  content.push(makeTable(
    ["响应头", "说明"],
    [
      ["X-Config-Version", "配置版本号（整数）"],
      ["X-Config-Signature", "RSA-2048 签名（Base64），用于验证配置完整性"],
      ["X-AES-IV", "AES 初始化向量（hex），仅在加密模式下存在"],
      ["X-AES-Fingerprint", "AES 密钥的 SHA-256 指纹，用于客户端验证密钥一致性"],
      ["X-Security-Mode", "secure 或 legacy，标识当前是否为安全模式"],
      ["X-Security-Warning", "unsigned-request，当安全模式下未提供签名时出现"],
      ["X-Timestamp-Server", "服务端当前时间戳，可用于时钟校准"],
    ]
  ));

  content.push(h2("8.3 完整请求流程示例"));

  content.push(body("以下是一个完整的客户端请求流程示例，展示了从构建请求到解析配置的全部步骤。客户端首先获取当前时间戳，然后使用 HMAC 密钥计算签名，组装 HTTP 请求头并发送 GET 请求。服务端验证签名后返回加密的配置数据和相关的安全元数据。客户端首先验证 RSA 签名以确保配置未被篡改，然后使用碎片化还原的 AES 密钥解密配置内容，最后解析 YAML 并加载到内存中。"));

  content.push(...codeBlock([
    "// 完整的客户端请求流程",
    "String timestamp = String.valueOf(",
    "    System.currentTimeMillis() / 1000);",
    "String path = \"/api/client?encrypt=true\";",
    "String signature = hmacSha256(",
    "    hmacSecret, timestamp, apiKey, path);",
    "",
    "// 构建请求",
    "HttpRequest request = HttpRequest.newBuilder()",
    "    .uri(URI.create(baseUrl + path))",
    '    .header("Authorization", "Bearer " + apiKey)',
    '    .header("X-Timestamp", timestamp)',
    '    .header("X-Signature", signature)',
    "    .GET().build();",
    "",
    "// 发送请求并获取响应",
    "HttpResponse<String> response =",
    "    client.send(request,",
    "        BodyHandlers.ofString());",
    "",
    "// 验证 RSA 签名",
    "String rsaSignature =",
    '    response.headers().firstValue(',
    '        "X-Config-Signature").orElse("");',
    "boolean valid = verifyRsaSignature(",
    "    response.body(), rsaSignature, rsaPubKey);",
    "",
    "// AES 解密",
    "String iv = response.headers()",
    '    .firstValue("X-AES-IV").orElse("");',
    "String yaml = SecureAesHelper.decryptConfig(",
    "    response.body(), iv);",
    "",
    "// 解析 YAML 配置",
    "YamlConfig config = parseYaml(yaml);",
  ]));

  return content;
}

// ─────────────────────────────────────────────
// ASSEMBLE DOCUMENT
// ─────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: c(P.body) },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.primary) },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
      heading3: {
        run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.primary) },
        paragraph: { spacing: { before: 200, after: 100, line: 312 } },
      },
    },
  },
  numbering: {
    config: [],
  },
  sections: [
    // Section 1: Cover
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: [
        ...buildCoverR4({
        palette: P,
        title: "Mcpatch2 \u5ba2\u6237\u7aef\u5bc6\u94a5\u788e\u7247\u5316\u5b89\u5168\u5b9e\u73b0\u65b9\u6848",
        englishLabel: "KEY SHARDING SECURITY IMPLEMENTATION",
        subtitle: "\u516d\u5c42\u7eb5\u6df1\u9632\u5fa1\u67b6\u6784 \u00b7 \u5ba2\u6237\u7aef\u5bf9\u63a5\u6307\u5357",
        metaLines: [
          "\u9879\u76ee\uff1aMcpatch2 \u4e91\u7aef\u914d\u7f6e\u63a7\u5236\u7cfb\u7edf",
          "\u7248\u672c\uff1av1.0",
          "\u65e5\u671f\uff1a2026 \u5e74 5 \u6708",
        ],
        footerLeft: "mxzyTeam",
        footerRight: "\u5185\u90e8\u6280\u672f\u6587\u6863",
      }),
    },
    // Section 2: TOC (Roman numerals)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
          })],
        }),
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "\u76ee  \u5f55", bold: true, size: 32, font: { eastAsia: "SimHei", ascii: "Calibri" } })],
        }),
        new TableOfContents("Table of Contents", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888",
          })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    // Section 3: Body (Arabic numerals)
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Mcpatch2 \u5ba2\u6237\u7aef\u5bc6\u94a5\u788e\u7247\u5316\u5b89\u5168\u5b9e\u73b0\u65b9\u6848", size: 18, color: "888888", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "888888" })],
          })],
        }),
      },
      children: buildBody(),
    },
  ],
});

const OUTPUT = "/home/z/my-project/download/mcpatch2-key-sharding-impl-plan.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUTPUT, buf);
  console.log("Generated:", OUTPUT);
});
